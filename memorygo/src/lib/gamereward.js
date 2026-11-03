// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/gamereward.js
// purpose:    - every game calls claim(result) once when it ends (memory: { moves }, sequence: { level },
//               the others: { score })
//             - opened from a TAP-IN on the map (/games/pattern?visit=123): the FIRST result goes to
//               POST /api/visits/123/finish, and the server pays out (once per place per day, see
//               server/routes/visits.js)
//             - opened as the PUZZLE OF THE DAY from the Journey tab (/games/sequence?puzzle=1): the FIRST result
//               goes to POST /api/journey/puzzle/finish (first finish today pays + a bonus, server/routes/journey.js)
//             - PLAY AGAIN on the same page, or a place / puzzle that was already paid today (the server
//               answers 409): practice, POST /api/progress/xp, which pays nothing and doesn't tick "This week"
//             - opened any other way ("Play anytime", the old games menu): practice too
// returns:    reward (the server's answer, shaped the same for all of them), awarding, claim, reset
// ----------------------------------------------------------------------------------------------------------

import { ref } from 'vue'
import { api } from './api'
import { levelFromXp } from '@/config/progression'
import { forgetSpirits } from './spiritsCache'

// the games call useGameReward with their scoring name; the Puzzle of the day uses the page names
// (the same as router/index.js and server/routes/visits.js ALL_GAMES)
const PAGE_NAME = { 'object-id': 'object', 'whats-missing': 'missing', 'odd-one-out': 'oddoneout' }

export function useGameReward(game) {
    const reward = ref(null)      // { xp, coins, earned: { xp, coins }, ... } from the server
    const awarding = ref(false)
    let awarded = false           // stops double awards for one round
    let payoutDone = false        // the place / puzzle has had its one chance on this page: later rounds are practice

    // ?visit=123 in the address = this game was started by tapping in at a place
    // ?puzzle=1 = it's the Puzzle of the day
    const query = new URLSearchParams(window.location.search)
    const visitId = query.get('visit')
    const isPuzzle = query.has('puzzle')

    // practice: pays nothing. answer: { practice: true, xp, coins, streak, earned: { xp: 0, coins: 0 } }
    async function practice(result) {
        const { data } = await api.post('/progress/xp', { game, ...result })
        return data
    }

    // the one paid try for a place or the Puzzle of the day
    async function payout(result) {
        if (visitId) {
            // answer: { paid, earned: { coins, xp }, totals: { coins, xp }, spirit, setDone }
            // spirit = the place's Spirit if this game found it (LevelUpNotice shows SpiritFound)
            const { data: visit } = await api.post(`/visits/${visitId}/finish`, result)
            if (visit.spirit) forgetSpirits()
            return { ...visit, xp: visit.totals.xp, coins: visit.totals.coins }
        }

        // answer: { paid, earned, totals, bonus } (paid false = already done today, so practice)
        const { data: puzzle } = await api.post('/journey/puzzle/finish', { game: PAGE_NAME[game] ?? game, ...result })
        return { ...puzzle, xp: puzzle.totals.xp, coins: puzzle.totals.coins }
    }

    async function claim(result = {}) {
        if (awarded) return
        awarded = true
        awarding.value = true

        try {
            let data

            if ((visitId || isPuzzle) && !payoutDone) {
                try {
                    data = await payout(result)
                    payoutDone = true
                } catch (error) {
                    // 409 = already paid for this place / puzzle (e.g. they came back to it): play it as practice
                    if (error.response?.status !== 409) throw error
                    payoutDone = true
                    data = await practice(result)
                }
            } else {
                data = await practice(result)
            }

            const before = data.xp - data.earned.xp
            //...spread operator: It copies every property from one object into a new one
            reward.value = {
                ...data,
                levelBefore: levelFromXp(before),
                levelAfter: levelFromXp(data.xp)
            }
        } catch (error) {
            awarded = false
            console.error(error)
        } finally {
            awarding.value = false
        }
    }

    // Play again: the next round can be claimed, but payoutDone stays, so it is practice
    function reset() {
        awarded = false
        reward.value = null
    }

    return { reward, awarding, claim, reset }
}