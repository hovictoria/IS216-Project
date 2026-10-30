// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   stores/journey.js
// purpose:    - remembers the trip in progress ("Start journey" on a route), so it survives going into a
//               game and coming back to the map (the map page is rebuilt each time you return to it)
//             - kept in memory only, like the login: refreshing the page ends the trip
// state:      trip = { destination, mode, option, stops, doneIds, startedAt } or null
//               stops: the MemoryGo places on the way, in order: { id, name, lng, lat, radiusM, why }
//               doneIds: stops already tapped in at, or skipped with "Not now"
//             minimised = true while the trip runs in the background (normal map + "Resume" bar)
// ----------------------------------------------------------------------------------------------------------

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useJourneyStore = defineStore('journey', () => {
    const trip = ref(null)
    const minimised = ref(false)

    const active = computed(() => trip.value !== null)
    const showing = computed(() => active.value && !minimised.value)        // the journey screen is up

    // the first stop not done yet (null = all done, or no games on this route)
    const nextStop = computed(() => trip.value?.stops.find((s) => !trip.value.doneIds.includes(s.id)) ?? null)

    function start(destination, mode, option) {
        trip.value = {
            destination,                 // { name, lat, lng, ... }
            mode,                        // 'transit' | 'walk', to ask for the same kind of route if you go off it
            option,                      // the chosen route from /api/route
            stops: option.onTheWay.map(({ id, name, lng, lat, radiusM, why }) => ({ id, name, lng, lat, radiusM, why })),
            doneIds: [],
            startedAt: Date.now(),
        }
        minimised.value = false
    }

    // went off route: swap in the new route from where you are, keeping the stops you've done
    function replaceRoute(option) {
        if (!trip.value) return
        const done = trip.value.doneIds
        trip.value = {
            ...trip.value,
            option,
            stops: option.onTheWay.map(({ id, name, lng, lat, radiusM, why }) => ({ id, name, lng, lat, radiusM, why })),
            doneIds: done,
        }
    }

    function markDone(stopId) {
        if (trip.value && !trip.value.doneIds.includes(stopId)) {
            trip.value = { ...trip.value, doneIds: [...trip.value.doneIds, stopId] }
        }
    }

    function end() {
        trip.value = null
        minimised.value = false
    }

    return { trip, minimised, active, showing, nextStop, start, replaceRoute, markDone, end }
})
