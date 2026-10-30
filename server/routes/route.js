// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/route.js
// purpose:    - "Take me there": ways to get from where you are to a place, like Google Maps
//             - asks OneMap (lib/onemap.js) for public transport (MRT + bus, up to 3 options) or walking,
//               and turns its long answer into simple legs the map can draw
//             - works out which MemoryGo places are ON THE WAY for each option:
//                 walking parts → places whose play zone the path goes through
//                 MRT parts     → the stations where you get on, change and get off (matched by station code,
//                                 e.g. DT21 = Bencoolen). Stations you only ride through are listed as "passes"
//                                 for information, not as games: you can't stop and play underground
// route:      GET /api/route?from=1.2963,103.8502&to=1.3349,103.8793&mode=transit|walk
//             → { options: [{ minutes, walkMeters, transfers, legs: [...], onTheWay: [...] }] }
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'
import { routeOneMap, decodePolyline, niceCase } from '../lib/onemap.js'

const router = Router()

const CACHE_MS = 2 * 60 * 1000               // the same trip asked again within 2 min reuses the answer
const cache = new Map()

// ---------- Small helpers ----------
const inSingapore = (lat, lng) => lat >= 1.13 && lat <= 1.5 && lng >= 103.55 && lng <= 104.13

function parsePoint(text) {
    const [lat, lng] = String(text ?? '').split(',').map(Number)
    return Number.isFinite(lat) && Number.isFinite(lng) && inSingapore(lat, lng) ? [lat, lng] : null
}

// Distance in metres from a point to a line segment, all as [lng, lat]. Close to the equator a degree is
// about 111 km both ways, so a simple flat projection is accurate enough for a few kilometres
function pointToSegmentM([px, py], [ax, ay], [bx, by]) {
    const kx = 111320 * Math.cos((py * Math.PI) / 180)
    const ky = 110574
    const [x, y, x1, y1, x2, y2] = [px * kx, py * ky, ax * kx, ay * ky, bx * kx, by * ky]
    const dx = x2 - x1
    const dy = y2 - y1
    const t = dx || dy ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))) : 0
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

// Our places (kept for 10 minutes, they rarely change)
let placesCache = { at: 0, rows: [] }
async function activePlaces() {
    if (Date.now() - placesCache.at < 10 * 60 * 1000) return placesCache.rows
    const { data, error } = await supabase
        .from('places')
        .select('id, name, kind, line_codes, lat, lng, radius_m')
        .eq('is_active', true)
    if (error) throw error
    placesCache = { at: Date.now(), rows: data }
    return data
}

// "BENCOOLEN MRT STATION" → "Bencoolen MRT Station"; "Origin" / "Destination" → readable names
function stopName(name, toName) {
    if (name === 'Origin') return 'Your location'
    if (name === 'Destination') return toName
    return niceCase(name)
}

const legMode = (mode) => (mode === 'WALK' ? 'walk' : mode === 'BUS' ? 'bus' : 'train')

// ---------- Which MemoryGo places are on the way ----------
function placesOnTheWay(legs, places) {
    const found = []
    const seen = new Set()
    const add = (place, why) => {
        if (seen.has(place.id)) {
            // walked past it on the way to the station, then got on there: "get on" is more useful
            const earlier = found.find((f) => f.id === place.id)
            if (why !== 'walk past') earlier.why = why
            return
        }
        seen.add(place.id)
        found.push({ id: place.id, name: place.name, kind: place.kind, lineCodes: place.line_codes, lat: place.lat, lng: place.lng, radiusM: place.radius_m, why })
    }

    legs.forEach((leg) => {
        if (leg.mode === 'train') {
            // the stations you get on and off at (a change between lines is the "off" of one leg and the "on" of the next)
            for (const [stop, why] of [[leg.from, 'get on'], [leg.to, 'get off']]) {
                const station = stop.code && places.find((p) => p.kind === 'mrt' && p.line_codes.includes(stop.code))
                if (station) add(station, why)
            }
        } else if (leg.mode === 'walk') {
            // places whose zone the walking path goes through, in the order you reach them
            places
                .map((place) => {
                    let best = { metres: Infinity, at: 0 }
                    for (let i = 1; i < leg.path.length; i++) {
                        const metres = pointToSegmentM([place.lng, place.lat], leg.path[i - 1], leg.path[i])
                        if (metres < best.metres) best = { metres, at: i }
                    }
                    return { place, ...best }
                })
                .filter(({ place, metres }) => metres <= place.radius_m)
                .sort((a, b) => a.at - b.at)
                .forEach(({ place }) => add(place, 'walk past'))
        }
    })
    return found
}

// ---------- OneMap answer → our options ----------
function transitOptions(body, toName) {
    return (body.plan?.itineraries ?? []).map((it) => ({
        minutes: Math.round(it.duration / 60),
        walkMeters: Math.round(it.walkDistance),
        transfers: it.transfers,
        legs: it.legs.map((leg) => ({
            mode: legMode(leg.mode),
            line: leg.mode === 'WALK' ? null : leg.route,                   // 'DT' (MRT line) or '155' (bus)
            minutes: Math.max(1, Math.round(leg.duration / 60)),
            meters: Math.round(leg.distance),
            from: { name: stopName(leg.from.name, toName), code: leg.from.stopCode ?? null, lat: leg.from.lat, lng: leg.from.lon },
            to: { name: stopName(leg.to.name, toName), code: leg.to.stopCode ?? null, lat: leg.to.lat, lng: leg.to.lon },
            passes: (leg.intermediateStops ?? []).map((s) => ({ name: stopName(s.name, toName), code: s.stopCode ?? null })),
            path: decodePolyline(leg.legGeometry?.points ?? ''),
        })),
    }))
}

function walkOptions(body, from, to, toName) {
    if (!body.route_geometry) return []
    const path = decodePolyline(body.route_geometry)
    return [{
        minutes: Math.round(body.route_summary.total_time / 60),
        walkMeters: Math.round(body.route_summary.total_distance),
        transfers: 0,
        legs: [{
            mode: 'walk', line: null,
            minutes: Math.round(body.route_summary.total_time / 60),
            meters: Math.round(body.route_summary.total_distance),
            from: { name: 'Your location', code: null, lat: from[0], lng: from[1] },
            to: { name: toName, code: null, lat: to[0], lng: to[1] },
            passes: [],
            path,
        }],
    }]
}

// ---------- The whole trip: ask OneMap, simplify, find the places on the way ----------
// (separate from the route below so it can be tried out without a browser)
export async function planTrip(from, to, mode, toName) {
    const [body, places] = await Promise.all([routeOneMap(from, to, mode === 'walk' ? 'walk' : 'pt'), activePlaces()])
    return (mode === 'walk' ? walkOptions(body, from, to, toName) : transitOptions(body, toName))
        .map((option) => ({ ...option, onTheWay: placesOnTheWay(option.legs, places) }))
}

// ---------- GET /api/route ----------
router.get('/', requireAuth, async (req, res) => {
    const from = parsePoint(req.query.from)
    const to = parsePoint(req.query.to)
    const mode = req.query.mode === 'walk' ? 'walk' : 'transit'
    const toName = String(req.query.name ?? 'your destination').slice(0, 80)

    if (!from || !to) {
        return res.status(400).json({ message: 'Directions need a start and an end inside Singapore.' })
    }

    // rounded to ~10 m so tiny GPS wobbles reuse the same answer
    const key = [...from, ...to].map((n) => n.toFixed(4)).join(',') + mode
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_MS) return res.json(hit.answer)

    try {
        const options = await planTrip(from, to, mode, toName)

        if (options.length === 0) {
            return res.status(404).json({ message: 'No route found. Try walking, or a different place.' })
        }

        const answer = { mode, options }
        cache.set(key, { at: Date.now(), answer })
        if (cache.size > 200) cache.delete(cache.keys().next().value)
        res.json(answer)
    } catch (error) {
        console.error(error.message)
        res.status(502).json({ message: 'Directions aren’t working right now. Please try again.' })
    }
})

export default router
