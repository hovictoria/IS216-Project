// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/useSettings.js
// purpose:    - the Me page's settings: text size, reduce motion, solid backgrounds, mood
//             - each one changes the whole app through a class on <html> (styles/settings.css does the rest):
//                 text size        → class="text-large" / "text-larger" (everything is drawn a bit bigger)
//                 reduce motion    → class="reduce-motion" (animations stop), and lessMotion() for the 3D parts
//                 solid backgrounds→ class="solid" (glass cards become plain paper)
//                 mood             → lib/useMood.js setMood (Auto / Morning / Night)
//             - a copy is kept in this browser, so the app opens with them straight away; the account's copy
//               (GET /api/me/profile) wins once it arrives, so settings follow the user to other devices
//             - changing one applies it at once, then saves it to the server in the background
// usage:      startSettings() once in main.js; applyServerSettings(s) after loading the profile;
//             changeSetting('textSize', 'large'); lessMotion() in any 3D / animated code
// ----------------------------------------------------------------------------------------------------------

import { reactive } from 'vue'
import { api } from './api'
import { setMood, moodFromLink } from './useMood'

const SAVE_KEY = 'memorygo-settings'
const deviceLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

export const settings = reactive({
    textSize: 'normal',          // 'normal' | 'large' | 'larger'
    reduceMotion: null,          // null = follow the device's setting, true / false = the user chose
    solidBackgrounds: false,
    mood: 'auto',                // 'auto' | 'day' | 'night'
})

// Should animations stop? The user's choice, or the device's setting if they haven't chosen
export function lessMotion() {
    return settings.reduceMotion ?? deviceLessMotion.matches
}

// Put the settings on the page
function apply() {
    const html = document.documentElement
    html.classList.toggle('text-large', settings.textSize === 'large')
    html.classList.toggle('text-larger', settings.textSize === 'larger')
    html.classList.toggle('reduce-motion', settings.reduceMotion === true)
    html.classList.toggle('solid', settings.solidBackgrounds)
}

function saveHere() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(settings)) } catch { /* storage blocked */ }
}

// App start: use this browser's copy until the account's copy arrives
export function startSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY))
        if (saved) Object.assign(settings, saved)
    } catch { /* nothing saved, or storage blocked */ }
    apply()
}

// The account's copy arrived (from GET /api/me/profile)
export function applyServerSettings(fromServer) {
    if (!fromServer) return
    Object.assign(settings, fromServer)
    apply()
    if (!moodFromLink()) setMood(settings.mood)      // a ?mood= demo link keeps its look
    saveHere()
}

// A switch was flipped on the Me page: show it now, save it after.
// Returns null when saved, or a message if the server couldn't save it (it still works on this device)
export async function changeSetting(name, value) {
    settings[name] = value
    apply()
    if (name === 'mood') setMood(value)
    saveHere()

    try {
        await api.put('/me/settings', { [name]: value })
        return null
    } catch {
        return "We couldn't save that to your account. It will still work on this device."
    }
}
