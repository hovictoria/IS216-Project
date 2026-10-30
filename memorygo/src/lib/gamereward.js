// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/gamereward.js
// purpose:    - every game calls claim(result) once when it ends (memory: { moves }, sequence: { level },
//               the others: { score })
//             - opened from a TAP-IN on the map (/games/pattern?visit=123): the result goes to
//               POST /api/visits/123/finish, and the server pays out (once per place per day, see
//               server/routes/visits.js)
//             - opened as the PUZZLE OF THE DAY from the Journey tab (/games/sequence?puzzle=1): the result
//               goes to POST /api/journey/puzzle/finish (first finish today pays + a bonus, server/routes/journey.js)
//             - opened any other way ("Play anytime", the old games menu): practice, POST /api/progress/xp,
//               which pays nothing and doesn't tick "This week"
// returns:    reward (the server's answer, shaped the same for both), awarding, claim, reset
// ----------------------------------------------------------------------------------------------------------

import { ref } from 'vue'
import { api } from './api'
import { levelFromXp, newUnlocks } from '@/config/progression'
import { forgetSpirits } from './spiritsCache'

// the games call useGameReward with their scoring name; the Puzzle of the day uses the page names
// (the same as router/index.js and server/routes/visits.js ALL_GAMES)
const PAGE_NAME = { 'object-id': 'object', 'whats-missing': 'missing', 'odd-one-out': 'oddoneout' }

export function useGameReward(game) {
    const reward = ref(null)      // { xp, coins, earned: { xp, coins }, ... } from the server
    const awarding = ref(false)
    let awarded = false           // stops double awards

    // ?visit=123 in the address = this game was started by tapping in at a place
    // ?puzzle=1 = it's the Puzzle of the day
    const query = new URLSearchParams(window.location.search)
    const visitId = query.get('visit')
    const isPuzzle = query.has('puzzle')

    async function claim(result = {}) {
        if (awarded) return
        awarded = true
        awarding.value = true

        try {
            let data
            if (visitId) {
                // answer: { paid, earned: { coins, xp }, totals: { coins, xp }, spirit, setDone }
                // spirit = the place's Spirit if this game found it (LevelUpNotice shows SpiritFound)
                const { data: visit } = await api.post(`/visits/${visitId}/finish`, result)
                if (visit.spirit) forgetSpirits()
                data = { ...visit, xp: visit.totals.xp, coins: visit.totals.coins }
            } else if (isPuzzle) {
                // answer: { paid, earned, totals, bonus } (paid false = already done today, so practice)
                const { data: puzzle } = await api.post('/journey/puzzle/finish', { game: PAGE_NAME[game] ?? game, ...result })
                data = { ...puzzle, xp: puzzle.totals.xp, coins: puzzle.totals.coins }
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
