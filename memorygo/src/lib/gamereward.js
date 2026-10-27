import { ref } from 'vue'
import { api } from './api'
import { levelFromXp, newUnlocks } from '@/config/progression'

export function useGameReward(game) {
    const reward = ref(null)      // { xp, coins } from the server
    const awarding = ref(false)
    let awarded = false           // stops double awards

    async function claim(result = {}) {
        if (awarded) return
        awarded = true
        awarding.value = true

        try {
            const { data } = await api.post('/progress/xp', { game, ...result })
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