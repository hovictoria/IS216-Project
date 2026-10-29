// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/useJourney.js
// purpose:    - the live journey's brain (based on the design handoff's reference-code/useJourney.js, with our
//               own maths instead of the Turf library): given where you are and the trip in stores/journey.js
//             - progress    how far along the route you are (0 to 1), and minutes left
//             - arrived     a stop whose play zone you've been inside for 20 s (DWELL_MS). The wait stops a
//                           bus or train passing by from counting as a visit
//             - reachedEnd  within 60 m of the destination
//             - offRoute    more than 40 m from the route for 15 s → the screen offers "Update route"
//             - heading     the direction of the route where you are, so the map can turn to face it
//             - keeps the phone screen awake during the trip (Wake Lock API, where supported): a web page
//               can't follow you with the screen off
//           useDemoWalk(): DEMO MODE for presentations / testing at home. Moves a pretend you along the route,
//           and waits inside each stop's zone until you tap in or press "Not now". Only offered while running
//           `pnpm run dev` (see views/map.vue), because tap-in trusts the location the page sends
// ----------------------------------------------------------------------------------------------------------

import { ref, computed, watch, onUnmounted } from 'vue'
import { distanceM } from './geo'

const DWELL_MS = 20_000          // inside a zone this long = arrived
const OFF_ROUTE_M = 40           // further than this from the line...
const OFF_ROUTE_MS = 15_000      // ...for this long = off route
const END_M = 60                 // this close to the destination = reached it

// ---------- Route maths (flat projection: accurate enough over a few km near the equator) ----------
const KY = 110574
const kx = (lat) => 111320 * Math.cos((lat * Math.PI) / 180)

// the trip's legs joined into one line, with the distance from the start to each point
function buildLine(option) {
    const points = option.legs.flatMap((leg) => leg.path)
    const along = [0]
    for (let i = 1; i < points.length; i++) along.push(along[i - 1] + distanceM(points[i - 1], points[i]))
    return { points, along, total: along[along.length - 1] || 1 }
}

// where you are on the line: how far from it, how far along it, and which way it goes there
function locate(line, [lng, lat]) {
    let best = { off: Infinity, along: 0, heading: 0 }
    for (let i = 1; i < line.points.length; i++) {
        const [ax, ay] = line.points[i - 1]
        const [bx, by] = line.points[i]
        const k = kx(lat)
        const dx = (bx - ax) * k
        const dy = (by - ay) * KY
        const px = (lng - ax) * k
        const py = (lat - ay) * KY
        const segment2 = dx * dx + dy * dy
        const t = segment2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / segment2)) : 0
        const off = Math.hypot(px - t * dx, py - t * dy)
        if (off < best.off) {
            best = {
                off,
                along: line.along[i - 1] + t * Math.sqrt(segment2),
                heading: (Math.atan2(dx, dy) * 180) / Math.PI,     // 0 = north, 90 = east
            }
        }
    }
    return best
}

// the point a given distance along the line (used by demo mode)
function pointAt(line, metres) {
    const d = Math.max(0, Math.min(line.total, metres))
    let i = 1
    while (i < line.along.length - 1 && line.along[i] < d) i++
    const span = line.along[i] - line.along[i - 1] || 1
    const t = (d - line.along[i - 1]) / span
    const [ax, ay] = line.points[i - 1]
    const [bx, by] = line.points[i]
    return [ax + (bx - ax) * t, ay + (by - ay) * t]
}

// ---------- The live journey ----------
// position: a ref of [lng, lat] (real location, or demo mode's); journey: the store
export function useJourney(position, journey) {
    const line = computed(() => (journey.trip ? buildLine(journey.trip.option) : null))
    const here = computed(() => (line.value && position.value ? locate(line.value, position.value) : null))

    const progress = computed(() => (here.value ? Math.min(1, here.value.along / line.value.total) : 0))
    const heading = computed(() => here.value?.heading ?? 0)
    const minutesLeft = computed(() => {
        if (!journey.trip) return 0
        return Math.max(1, Math.ceil(journey.trip.option.minutes * (1 - progress.value)))
    })
    const nextStopMetres = computed(() =>
        (journey.nextStop && position.value ? distanceM(position.value, [journey.nextStop.lng, journey.nextStop.lat]) : null))
    const reachedEnd = computed(() => {
        const dest = journey.trip?.destination
        return Boolean(dest && position.value && distanceM(position.value, [dest.lng, dest.lat]) <= END_M)
    })

    const arrived = ref(null)           // the stop you've arrived at (waiting for Tap in / Not now)
    const offRoute = ref(false)
    const enteredAt = new Map()         // stop id → when you walked into its zone
    let offSince = null

    // checked whenever you move, and every second (a phone standing still doesn't send new positions)
    function check() {
        if (!journey.trip || !position.value) return
        const now = Date.now()

        // arriving: inside a zone you haven't done yet, for 20 s
        if (!arrived.value) {
            for (const stop of journey.trip.stops) {
                if (journey.trip.doneIds.includes(stop.id)) continue
                const inside = distanceM(position.value, [stop.lng, stop.lat]) <= stop.radiusM
                if (!inside) {
                    enteredAt.delete(stop.id)
                    continue
                }
                if (!enteredAt.has(stop.id)) enteredAt.set(stop.id, now)
                if (now - enteredAt.get(stop.id) >= DWELL_MS) {
                    enteredAt.delete(stop.id)
                    arrived.value = stop
                    navigator.vibrate?.(200)                // a gentle buzz on phones that allow it
                    break
                }
            }
        }

        // off route: too far from the line for 15 s
        if (here.value && here.value.off > OFF_ROUTE_M) {
            offSince ??= now
            if (now - offSince >= OFF_ROUTE_MS) offRoute.value = true
        } else {
            offSince = null
            offRoute.value = false
        }
    }

    watch(position, check)
    const ticker = setInterval(check, 1000)

    // "Tap in" or "Not now" on the arrived card: that stop is done, carry on to the next
    function clearArrived() {
        if (arrived.value) journey.markDone(arrived.value.id)
        arrived.value = null
    }

    // a new route (after going off route): start the off-route timer again
    function resetOffRoute() {
        offSince = null
        offRoute.value = false
    }

    // keep the screen on while the journey screen is showing
    let wakeLock = null
    async function holdScreen(on) {
        try {
            if (on && !wakeLock) wakeLock = await navigator.wakeLock?.request('screen')
            if (!on && wakeLock) {
                await wakeLock.release()
                wakeLock = null
            }
        } catch {
            wakeLock = null                     // not supported or not allowed: the screen may just sleep
        }
    }
    watch(() => journey.showing, (on) => holdScreen(on), { immediate: true })

    onUnmounted(() => {
        clearInterval(ticker)
        holdScreen(false)
    })

    return { progress, heading, minutesLeft, nextStopMetres, reachedEnd, arrived, offRoute, clearArrived, resetOffRoute }
}

// ---------- Demo mode ----------
// Moves a pretend position along the trip's route (~1 minute end to end, at least 15 m/s), stopping at the
// point of the route nearest each stop until it's done (so the 20 s arrival, Tap in and Not now can be shown)
export function useDemoWalk(journey) {
    const position = ref(null)
    const running = ref(false)
    let metres = 0
    let timer = null

    function tick() {
        const trip = journey.trip
        if (!trip) return stop()
        const line = buildLine(trip.option)

        // the point on the route closest to the next stop: always inside its zone (that's how the server
        // picked it), so the demo waits there until the stop is tapped in at or skipped
        const next = journey.nextStop
        const waitAt = next ? locate(line, [next.lng, next.lat]).along : Infinity

        const speed = Math.max(15, line.total / 60)            // metres per second
        metres = Math.min(line.total, metres + speed / 4, waitAt)   // 4 ticks a second
        position.value = pointAt(line, metres)

        // waiting for a stop that the route only passes at the very edge of its zone: step a little towards
        // it (at most 35 m, well under the 40 m that counts as off route) so the demo is clearly inside
        if (next && metres === waitAt) {
            const away = distanceM(position.value, [next.lng, next.lat])
            const step = Math.min(35, Math.max(0, away - (next.radiusM - 15)))
            if (step > 0) {
                const f = step / away
                const [x, y] = position.value
                position.value = [x + (next.lng - x) * f, y + (next.lat - y) * f]
            }
        }
        if (metres >= line.total) stop()
    }

    function start(fromPosition) {
        const trip = journey.trip
        if (!trip) return
        const line = buildLine(trip.option)
        metres = fromPosition ? locate(line, fromPosition).along : 0
        position.value = pointAt(line, metres)
        running.value = true
        clearInterval(timer)
        timer = setInterval(tick, 250)
    }

    function stop() {
        clearInterval(timer)
        timer = null
        running.value = false
    }

    onUnmounted(stop)
    return { position, running, start, stop }
}
