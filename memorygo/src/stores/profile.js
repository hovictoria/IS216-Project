// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /stores/profile.js
// purpose:    - the signed-in player's Me page data, shared by the Me page and the nav's round picture
//             - load()      = GET /api/me/profile (stats, picture, newest Spirits, settings) and apply the settings
//             - setAvatar() = PUT /api/me/avatar (one of their Spirits, or null for their initial)
//             - clear()     = forget it all on sign out
// imports:    api (our server), applyServerSettings (puts the account's settings on the page)
// ----------------------------------------------------------------------------------------------------------

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { applyServerSettings } from '@/lib/useSettings'

export const useProfileStore = defineStore('profile', () => {
    const data = ref(null)          // the GET /api/me/profile answer
    const loading = ref(false)
    const error = ref('')

    // the Spirit they picked as their picture (null = show their initial)
    const avatarSpiritId = computed(() => data.value?.avatarSpiritId ?? null)

    async function load() {
        loading.value = true
        error.value = ''
        try {
            const { data: answer } = await api.get('/me/profile')
            data.value = answer
            applyServerSettings(answer.settings)
        } catch {
            error.value = 'We couldn’t load your profile. Please try again.'
        } finally {
            loading.value = false
        }
    }

    // Returns null when saved, or a message to show
    async function setAvatar(spiritId) {
        try {
            const { data: answer } = await api.put('/me/avatar', { spiritId })
            if (data.value) data.value.avatarSpiritId = answer.avatarSpiritId
            return null
        } catch (e) {
            return e.response?.data?.message ?? "We couldn't save your picture. Please try again."
        }
    }

    function clear() {
        data.value = null
        error.value = ''
    }

    return { data, loading, error, avatarSpiritId, load, setAvatar, clear }
})
