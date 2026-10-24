import { ref } from 'vue'
import { api } from './api'

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
            reward.value = data
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