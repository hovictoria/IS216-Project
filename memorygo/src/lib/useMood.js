// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/useMood.js
// purpose:    - day / night look (DESIGN_SPEC.md section 6, "Moods"): night is 7 pm to 6 am on the device clock
//             - puts class="night" on <html> at night; styles/night.css does the rest (dark sky with stars,
//               darker map, dimmer island, light headings on dark backgrounds; cards and sheets stay light)
//             - checks the clock when the app opens and on every page change (router/index.js calls checkMood),
//               so there's nothing running in the background. Someone with the app open across 7 pm gets the
//               night look as soon as they open another page
//             - to preview (or present) either look at any time, open a page with ?mood=night or ?mood=day;
//               ?mood=auto goes back to the clock. The choice is remembered in this browser only
// usage:      startMood() once in main.js; checkMood() to look at the clock again; `mood` ('day' | 'night') for any page that needs it in code;
//             `greeting` = 'Good morning' / 'Good afternoon' / 'Good evening' (evening whenever it's night)
// ----------------------------------------------------------------------------------------------------------

import { ref, computed } from 'vue'

const NIGHT_FROM = 19            // 7 pm
const NIGHT_UNTIL = 6            // 6 am
const SAVE_KEY = 'memorygo-mood'

export const mood = ref('day')
const hour = ref(new Date().getHours())

export const greeting = computed(() => {
    if (mood.value === 'night') return 'Good evening'
    return hour.value < 12 ? 'Good morning' : hour.value < 18 ? 'Good afternoon' : 'Good evening'
})

// 'day' | 'night' | null (follow the clock), from ?mood= or what was picked before
function chosenMood() {
    const fromUrl = new URLSearchParams(window.location.search).get('mood')
    try {
        if (fromUrl === 'auto') localStorage.removeItem(SAVE_KEY)
        else if (fromUrl === 'day' || fromUrl === 'night') localStorage.setItem(SAVE_KEY, fromUrl)
        return localStorage.getItem(SAVE_KEY)
    } catch {
        return fromUrl === 'day' || fromUrl === 'night' ? fromUrl : null      // storage blocked (private window)
    }
}

function moodFromClock() {
    const now = new Date().getHours()
    return now >= NIGHT_FROM || now < NIGHT_UNTIL ? 'night' : 'day'
}

let chosen = null                // a ?mood= choice, which wins over the clock

// look at the clock (or the choice) and switch the look if it changed
export function checkMood() {
    hour.value = new Date().getHours()
    mood.value = chosen ?? moodFromClock()
    document.documentElement.classList.toggle('night', mood.value === 'night')
}

export function startMood() {
    chosen = chosenMood()
    checkMood()
}
