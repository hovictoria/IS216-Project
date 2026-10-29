// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/gamereward.js
// purpose:    - every game calls claim(result) once when it ends (memory: { moves }, sequence: { level },
//               the others: { score })
//             - opened from a TAP-IN on the map (/games/pattern?visit=123): the result goes to
//               POST /api/visits/123/finish, and the server pays out (once per place per day, see
//               server/routes/visits.js)
//             - opened any other way (the games menu): the old POST /api/progress/xp for now.
//               It gets retired once practice games stop paying (step 6h)
// returns:    reward (the server's answer, shaped the same for both), awarding, claim, reset
// ----------------------------------------------------------------------------------------------------------

import { ref } from 'vue'
import { api } from './api'
import { levelFromXp, newUnlocks } from '@/config/progression'

export function useGameReward(game) {
    const reward = ref(null)      // { xp, coins, earned: { xp, coins }, ... } from the server
    const awarding = ref(false)
    let awarded = false           // stops double awards

    // ?visit=123 in the address = this game was started by tapping in at a place
    const visitId = new URLSearchParams(window.location.search).get('visit')

    async function claim(result = {}) {
        if (awarded) return
        awarded = true
        awarding.value = true

        try {
            let data
            if (visitId) {
                // answer: { paid, earned: { coins, xp }, totals: { coins, xp } }
                const { data: visit } = await api.post(`/visits/${visitId}/finish`, result)
                data = { ...visit, xp: visit.totals.xp, coins: visit.totals.coins }
            } else {
                ({ data } = await api.post('/progress/xp', { game, ...result }))
            }

            const before = data.xp - data.earned.xp
            //...spread operator: It copies every property from one object into a new one
            reward.value = {
                ...data,
                levelBefore: levelFromXp(before),
                levelAfter: levelFromXp(data.xp),
                unlocks: newUnlocks(before, data.xp)
            }
        } catch (error) {
            awarded = false
            console.error(error)
        } finally {
            awarding.value = false
        }
    }

    function reset() {
        awarded = false
        reward.value = null
    }

    return { reward, awarding, claim, reset }
}
