import { ref } from 'vue'
import { api } from './api'

// Reusable helper for giving players spirits.
// Any page can use it:
//     const { foundSpirit, collect, dismiss } = useSpiritReward()
//     await collect(station.id)
export function useSpiritReward() {
    const foundSpirit = ref(null)  //hold the spirit they just found, e.g. { id: 3, name: 'Otter Spirit', emoji: '🦦' }, or null
    const allFound = ref(false)  //true if they've already collected all spirits in the db
    const collecting = ref(false) //true while waiting for the server res (can use to disable button so its not pressed twice)

    //ask the server for a chance to find a spirit at this station.
    //returns the spirit they found, or null if none.
    async function collect(stationId) {
        collecting.value = true
        try {
            const { data } = await api.post('/spirits/collect', { stationId:stationId }) //send a post req to new route, stationId is the data being sent, become req.body on server
            foundSpirit.value = data.spirit //save what the server sent, a spirit , or null
            allFound.value = !!data.allFound // !! turn any value to t or f
            return data.spirit 
        } catch (error) {
            console.error(error)
            return null      // if something goes wrong, act like "no spirit this time" so the page doesn't break
        } finally {
            collecting.value = false
        }
    }

    // Close the "You found a spirit!" popup
    function dismiss() {
        foundSpirit.value = null
    }

    return { foundSpirit, allFound, collecting, collect, dismiss }
}
