<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/PlaceSearch.vue
purpose:    - the "Where to?" search, with results appearing as you type (prototype 08-Search.html)
            - two kinds of results:
                MemoryGo places: our 328 places, filtered in the browser (instant)
                Other places:    any address / building / postal code from OneMap, through our server
                                 (GET /api/search), asked ~0.3 s after you stop typing
            - each result shows how far it is and "N games nearby" (MemoryGo places within 300 m)
            - microphone: speak instead of typing (lib/useSpeech.js)
            - Recent: the last 5 places picked, kept in this browser only
            - variant="dropdown": the glass search bar with a results panel under it (iPad / laptop sidebar)
            - variant="screen":   full-screen search for phones, with a big "Say where you're going" button
props:      places (all places), userPos ([lng, lat]), knowsLocation (false = the SMU fallback, so no distances),
            variant, listenOnOpen (screen: start the mic straight away)
emits:      pick { kind: 'place', place } | { kind: 'location', name, address, lat, lng }, close (screen)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { api } from '@/lib/api'
import { distanceM, distanceLabel } from '@/lib/geo'
import { useSpeech } from '@/lib/useSpeech'

const props = defineProps({
    places: { type: Array, default: () => [] },
    userPos: { type: Array, required: true },
    knowsLocation: { type: Boolean, default: false },
    variant: { type: String, default: 'dropdown' },
    listenOnOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['pick', 'close'])

const isScreen = computed(() => props.variant === 'screen')
const inputEl = ref(null)
const query = ref('')
const open = ref(false)                  // dropdown: is the panel showing?
const activeIndex = ref(-1)              // keyboard highlight

const greeting = 'Good morning! Where to?'

// ---------- MemoryGo places (instant) ----------
// best matches first: name starts with what you typed, then a word starts with it, then anywhere in it
const NEARBY_M = 300
const MAX_OWN = 4

const gamesNear = (lng, lat) => props.places.filter((p) => distanceM([lng, lat], [p.lng, p.lat]) <= NEARBY_M).length

const ownResults = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (q.length < 2) return []
    const rank = (name) => {
        const n = name.toLowerCase()
        if (n.startsWith(q)) return 0
        if (n.split(/[\s(-]+/).some((word) => word.startsWith(q))) return 1
        return n.includes(q) ? 2 : -1
    }
    return props.places
        .map((place) => ({ place, rank: rank(place.name), distance: distanceM(props.userPos, [place.lng, place.lat]) }))
        .filter((r) => r.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.distance - b.distance)
        .slice(0, MAX_OWN)
        .map(({ place, distance }) => ({
            key: `place-${place.id}`,
            kind: 'place',
            place,
            title: place.name,
            sub: place.kind === 'mrt' ? `MRT · ${place.lineCodes.join(' ')}` : place.category,
            distance,
            chip: 'MemoryGo place',
        }))
})

// ---------- Other places (OneMap, through our server) ----------
const otherRaw = ref([])
const otherStatus = ref('idle')          // 'idle' | 'loading' | 'error'
let searchTimer = null
let searchSeq = 0                         // ignore answers to older searches that arrive late

watch(query, (text) => {
    clearTimeout(searchTimer)
    activeIndex.value = -1
    const q = text.trim()
    if (q.length < 2) {
        otherRaw.value = []
        otherStatus.value = 'idle'
        return
    }
    otherStatus.value = 'loading'
    searchTimer = setTimeout(async () => {
        const seq = ++searchSeq
        try {
            const { data } = await api.get('/search', { params: { q } })
            if (seq !== searchSeq) return
            otherRaw.value = data.results
            otherStatus.value = 'idle'
        } catch {
            if (seq !== searchSeq) return
            otherRaw.value = []
            otherStatus.value = 'error'
        }
    }, 300)
})

const otherResults = computed(() => otherRaw.value
    // skip ones that are really one of our places (shown above already): very close, or the same name nearby
    .filter((r) => !ownResults.value.some(({ place }) => {
        const metres = distanceM([r.lng, r.lat], [place.lng, place.lat])
        return metres < 80 || (metres < 300 && r.name.toLowerCase() === place.name.toLowerCase())
    }))
    .map((r) => ({
        key: `loc-${r.lat}-${r.lng}`,
        kind: 'location',
        location: r,
        title: r.name,
        sub: r.address && r.address !== r.name ? r.address : (r.postal ? `Singapore ${r.postal}` : ''),
        distance: distanceM(props.userPos, [r.lng, r.lat]),
        chip: gamesLabel(gamesNear(r.lng, r.lat)),
    })))

function gamesLabel(n) {
    if (n === 0) return null
    return n === 1 ? '1 game nearby' : `${n} games nearby`
}

// ---------- Recent (this browser only) ----------
const RECENT_KEY = 'memorygo.recentSearches'
const recent = ref([])

function loadRecent() {
    try {
        recent.value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    } catch {
        recent.value = []
    }
}

function saveRecent(item) {
    const list = [item, ...recent.value.filter((r) => r.key !== item.key)].slice(0, 5)
    recent.value = list
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list))
    } catch {
        // private browsing / storage blocked: recent just won't be remembered
    }
}

// recent entries are stored small; turn them back into rows (our places may have changed since)
const recentResults = computed(() => recent.value
    .map((r) => {
        if (r.kind === 'place') {
            const place = props.places.find((p) => p.id === r.placeId)
            return place && {
                key: r.key, kind: 'place', place, title: place.name,
                sub: place.kind === 'mrt' ? `MRT · ${place.lineCodes.join(' ')}` : place.category,
                distance: distanceM(props.userPos, [place.lng, place.lat]), chip: 'MemoryGo place',
            }
        }
        return {
            key: r.key, kind: 'location', location: r.location, title: r.location.name,
            sub: r.location.address ?? '', distance: distanceM(props.userPos, [r.location.lng, r.location.lat]),
            chip: gamesLabel(gamesNear(r.location.lng, r.location.lat)),
        }
    })
    .filter(Boolean))

// ---------- What the list shows ----------
const searching = computed(() => query.value.trim().length >= 2)
const rows = computed(() => (searching.value ? [...ownResults.value, ...otherResults.value] : recentResults.value))
const showPanel = computed(() => isScreen.value || (open.value && (searching.value || recentResults.value.length > 0)))

function pick(row) {
    if (!row) return
    if (row.kind === 'place') {
        saveRecent({ key: row.key, kind: 'place', placeId: row.place.id })
        emit('pick', { kind: 'place', place: row.place })
    } else {
        saveRecent({ key: row.key, kind: 'location', location: row.location })
        emit('pick', { kind: 'location', ...row.location })
    }
    query.value = ''
    open.value = false
    inputEl.value?.blur()
}

// arrow keys move the highlight, Enter picks, Escape closes
function onKeydown(event) {
    if (event.key === 'ArrowDown') {
        event.preventDefault()
        activeIndex.value = Math.min(rows.value.length - 1, activeIndex.value + 1)
    } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        activeIndex.value = Math.max(-1, activeIndex.value - 1)
    } else if (event.key === 'Enter') {
        pick(rows.value[activeIndex.value] ?? rows.value[0])
    } else if (event.key === 'Escape') {
        if (isScreen.value) emit('close')
        open.value = false
        inputEl.value?.blur()
    }
}

// ---------- Microphone ----------
const speech = useSpeech((text) => {
    query.value = text
    open.value = true
})

function toggleMic() {
    if (speech.listening.value) speech.stop()
    else speech.start()
}

onMounted(async () => {
    loadRecent()
    if (isScreen.value) {
        await nextTick()
        if (props.listenOnOpen && speech.supported) speech.start()
        else inputEl.value?.focus()
    }
})

const distanceText = (m) => (props.knowsLocation ? distanceLabel(m).split(' · ')[0] : null)
</script>

<template>
    <div class="place-search" :class="`variant-${variant}`">
        <!-- the search bar -->
        <div class="bar">
            <button v-if="isScreen" type="button" class="back" aria-label="Close search" @click="emit('close')">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"
                    stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>
            </button>

            <div class="field">
                <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="M15.5 15.5 L20.5 20.5" />
                </svg>
                <input ref="inputEl" v-model="query" type="search" class="input" :placeholder="greeting"
                    autocomplete="off" enterkeyhint="search" aria-label="Search for a place"
                    role="combobox" aria-autocomplete="list" :aria-expanded="showPanel"
                    aria-controls="place-search-results"
                    :aria-activedescendant="activeIndex >= 0 ? `ps-row-${activeIndex}` : undefined"
                    @focus="open = true" @blur="open = false" @keydown="onKeydown" />
                <button v-if="speech.supported" type="button" class="mic" :class="{ listening: speech.listening.value }"
                    :aria-label="speech.listening.value ? 'Stop listening' : 'Search by voice'"
                    @mousedown.prevent @click="toggleMic">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="3" width="6" height="11" rx="3" />
                        <path d="M5.5 11 A6.5 6.5 0 0 0 18.5 11 M12 17.5 V21" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- results (dropdown under the bar, or the rest of the screen on phones) -->
        <div v-if="showPanel" id="place-search-results" class="panel" role="listbox" @mousedown.prevent>
            <p v-if="isScreen && !searching" class="hint">
                We’ll show games near where you’re going. Play them when you stop, not while walking.
            </p>

            <p v-if="speech.listening.value" class="status listening-note" role="status">
                <span class="pulse"></span>Listening… say where you’re going
            </p>
            <p v-if="speech.error.value" class="status" role="alert">{{ speech.error.value }}</p>

            <p v-if="searching" class="section">Results for “{{ query.trim() }}”</p>
            <p v-else-if="recentResults.length" class="section">Recent</p>

            <button v-for="(row, i) in rows" :id="`ps-row-${i}`" :key="row.key" type="button" class="result"
                :class="{ active: i === activeIndex, own: row.kind === 'place' }" role="option"
                :aria-selected="i === activeIndex" @click="pick(row)">
                <span class="result-icon" aria-hidden="true">
                    <svg v-if="row.kind === 'place'" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2 C7.6 2 4.5 5.2 4.5 9.4 C4.5 14.6 12 22 12 22 C12 22 19.5 14.6 19.5 9.4 C19.5 5.2 16.4 2 12 2 Z M12 12.4 A3 3 0 1 1 12 6.4 A3 3 0 0 1 12 12.4 Z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 21 V9 L12 4 L20 9 V21 M9 21 V14 H15 V21" />
                    </svg>
                </span>
                <span class="result-text">
                    <span class="result-title">{{ row.title }}</span>
                    <span class="result-sub">
                        {{ [row.sub, distanceText(row.distance)].filter(Boolean).join(' · ') }}
                    </span>
                    <span v-if="row.chip" class="result-chip">{{ row.chip }}</span>
                </span>
            </button>

            <p v-if="searching && otherStatus === 'loading' && rows.length === 0" class="status">Searching…</p>
            <p v-else-if="searching && otherStatus === 'idle' && rows.length === 0" class="status">
                No places found. Try a building name, street or postal code.
            </p>
            <p v-if="searching && otherStatus === 'error'" class="status">
                Can’t search other places right now. MemoryGo places still work.
            </p>
        </div>

        <!-- phones: the big voice button at the bottom -->
        <button v-if="isScreen && speech.supported" type="button" class="say" :class="{ listening: speech.listening.value }"
            @click="toggleMic">
            <span class="say-mic" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                    stroke-linejoin="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5.5 11 A6.5 6.5 0 0 0 18.5 11 M12 17.5 V21" />
                </svg>
            </span>
            {{ speech.listening.value ? 'Listening… tap to stop' : 'Say where you’re going' }}
        </button>
    </div>
</template>

<style scoped>
/* =========================================================
   The bar (same strong glass as the old search bar)
   ========================================================= */
.place-search {
    position: relative;
    font-family: var(--font);
    color: var(--ink);
}

.bar {
    display: flex;
    align-items: center;
    gap: 10px;
}

.field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    height: 56px;
    padding: 0 8px 0 16px;
    border: 1px solid rgba(255, 255, 255, 0.95);
    border-radius: var(--radius-pill);
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), 0 10px 28px rgba(22, 20, 18, 0.14);
    box-sizing: border-box;
}

.field:focus-within {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
}

.search-icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
}

.input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: 600 17px var(--font);
    outline: none;
}

.input::placeholder {
    color: #4A423B;
    opacity: 1;
}

.input::-webkit-search-cancel-button {
    display: none;
}

.mic {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: var(--ink);
    color: var(--white);
    cursor: pointer;
}

.mic svg {
    width: 20px;
    height: 20px;
}

.mic.listening {
    background: var(--terracotta);
    box-shadow: 0 0 0 6px rgba(201, 103, 63, 0.25);
}

.back {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    border: 0;
    border-radius: 50%;
    background: var(--white);
    box-shadow: 0 6px 16px rgba(22, 20, 18, 0.12);
    color: var(--ink);
    cursor: pointer;
}

.back svg {
    width: 24px;
    height: 24px;
}

/* =========================================================
   Results (not called .row: Bootstrap uses that name for its grid)
   ========================================================= */
.panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* never squash a result (or a heading) to fit: when there are many, the panel scrolls instead.
   Without this the browser shrank the rows and their text spilled over each other */
.panel > * {
    flex-shrink: 0;
}

/* dropdown: a paper card under the bar */
.variant-dropdown .panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 40;
    max-height: min(60vh, 520px);
    overflow-y: auto;
    padding: 10px;
    border-radius: 24px;
    background: var(--paper);
    box-shadow: 0 20px 50px rgba(22, 20, 18, 0.22);
}

.hint {
    margin: 18px 4px 6px;
    color: var(--muted);
    font-size: 16px;
    font-weight: 500;
}

.section {
    margin: 10px 8px 4px;
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
    text-transform: none;
}

.status {
    margin: 8px;
    color: var(--muted);
    font-size: 16px;
    font-weight: 600;
}

.listening-note {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--terracotta);
}

.pulse {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--terracotta);
    animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
    50% { opacity: 0.3; transform: scale(0.8); }
}

.result {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-height: 64px;
    padding: 12px;
    border: 0;
    border-radius: 18px;
    background: transparent;
    color: var(--ink);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.result:hover,
.result.active {
    background: rgba(22, 20, 18, 0.06);
}

.result-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--white);
}

.result.own .result-icon {
    background: var(--peach);
    color: var(--terracotta);
}

.result-icon svg {
    width: 20px;
    height: 20px;
}

.result-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.result-title {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
}

.result-sub {
    color: var(--muted);
    font-size: 16px;
    font-weight: 500;
}

.result-chip {
    align-self: flex-start;
    margin-top: 4px;
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    background: var(--sage);
    font-size: 14px;
    font-weight: 700;
}

.result.own .result-chip {
    background: var(--peach);
}

/* =========================================================
   Phone: full screen
   ========================================================= */
.variant-screen {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.variant-screen .panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 12px;
}

.say {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-shrink: 0;
    width: 100%;
    min-height: var(--cta-height);
    margin-top: 12px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font: 700 19px var(--font);
    cursor: pointer;
}

.say.listening {
    background: var(--terracotta);
}

.say-mic svg {
    width: 26px;
    height: 26px;
}

@media (prefers-reduced-motion: reduce) {
    .pulse {
        animation: none;
    }
}
</style>
