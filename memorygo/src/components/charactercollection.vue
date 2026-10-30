<script setup>
import { ref, computed, onMounted} from 'vue'
import AppNav from '@/components/ui/AppNav.vue'      // the bottom nav (phone) / top-right nav (laptop)
import HandUnderline from '@/components/ui/HandUnderline.vue'

import { api } from '@/lib/api'  //helper for calling the server
import { rememberSpirits } from '@/lib/spiritsCache'   // so a spirit's page opens without loading again
import ChestCanvas from '@/components/ui/ChestCanvas.vue'  // the set card's bonus chest (3D, same as the map's chests)
import mapBackground from '@/assets/spirits-map-bg.webp'  // the blurred map behind the page

// the spirit drawings (src/assets/spirits/<id>.svg), so each spirit can show its own picture
const pictures = import.meta.glob('@/assets/spirits/*.svg', { eager: true, import: 'default' })
const pictureOf = (id) => pictures[`/src/assets/spirits/${id}.svg`]
const lockedPicture = pictureOf('_locked')                // the grey "?" for spirits not found yet

const spirits = ref([])       // all 24 spirits
const found = ref([])         // this user's rows from spirit_finds
const setsDone = ref([])      // the sets this user has completed
const coins = ref(null)       // for the coin pill in the nav
const loading = ref(true)
const errorMsg = ref('')

const filter = ref('all')

// the 6 area sets, in the order they appear (each has 4 spirits)
const categories = [
    { value: 'Civic District', label: 'Civic District' },
    { value: 'Kampong Glam & Bugis', label: 'Kampong Glam & Bugis' },
    { value: 'Marina Bay', label: 'Marina Bay' },
    { value: 'Chinatown', label: 'Chinatown' },
    { value: 'Little India', label: 'Little India' },
    { value: 'Heartlands', label: 'Heartlands' },
]

//count progress per set
const countTotal = (cat) =>
    spirits.value.filter((s) => s.set === cat).length

//how many of them this user has found
const countFound = (cat) =>
    spirits.value.filter((s) => s.set === cat && isFound(s.id)).length

const isFound = (id) => found.value.some((f) => f.spirit_id === id)

//return the whole row, so can get the found_at for the date
const getFoundRow = (id) => found.value.find((f) => f.spirit_id === id)

// turn the ISO date format to JavaScript object (human-readable)
//ex: 16 Oct 2026
const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',  //ex: oct instead of october
        year: 'numeric'
    })
}

//show found spirits, based on the button u typed
//sort: found first (newest first), then the rest in the design's order
const visibleSpirits = computed(()=>{
    const sorted = [...spirits.value].sort((a, b) => {
        const rowA = getFoundRow(a.id)
        const rowB = getFoundRow(b.id)
        if (rowA && rowB) return new Date(rowB.found_at) - new Date(rowA.found_at)
        if (rowA) return -1
        if (rowB) return 1
        return 0
    })
    if (filter.value === 'found'){
        return sorted.filter((s) =>
            isFound(s.id)
        )
    }
    if (filter.value === 'notyet'){
        return sorted.filter((s) => !isFound(s.id))
    }
    return sorted
})

//the most recently found spirit, for the big card at the top (null if none found yet)
const newest = computed(() => {
    const latest = [...found.value].sort((a, b) => new Date(b.found_at) - new Date(a.found_at))[0]
    return latest ? spirits.value.find((s) => s.id === latest.spirit_id) ?? null : null
})

//the set card: the set they're closest to finishing (that isn't finished yet)
const currentSet = computed(() => {
    const open = categories.filter((c) => !setsDone.value.some((d) => d.set_name === c.value))
    if (open.length === 0) return null
    return open.reduce((best, c) => (countFound(c.value) > countFound(best.value) ? c : best), open[0])
})

//fetch data once the page opens
onMounted(async () => {
    try {
        const { data } = await api.get('/spirits')
        spirits.value = data.spirits
        found.value = data.found
        setsDone.value = data.setsDone
        rememberSpirits(data)
    } catch (e) {
        errorMsg.value = "We couldn't load your spirits. Please try again."
    } finally {
        loading.value = false
    }

    // coins for the nav (not important if it fails)
    api.get('/progress')
        .then(({ data }) => { coins.value = data.coins })
        .catch(() => { coins.value = null })
})

</script>

<template>
    <div class="spirits-page">
        <!-- background: the blurred map with two soft colour glows -->
        <div class="backdrop" aria-hidden="true">
            <img :src="mapBackground" alt="" class="backdrop-map" />
            <span class="glow glow-lilac"></span>
            <span class="glow glow-peach"></span>
        </div>

        <!-- laptop only: the wordmark top-left (the nav sits top-right) -->
        <p class="wordmark">MemoryGo</p>

        <!-- phone / iPad: one column · laptop: left column (header, newest, sets) + right column (all spirits) -->
        <main class="content">
            <div class="side">
                <!-- header -->
                <p class="eyebrow">Your collection</p>
                <h1 class="title"><HandUnderline>Spirits</HandUnderline></h1>

                <!-- progress, e.g. "7 of 24 found" -->
                <div class="progress-row">
                <div class="progress" role="progressbar" aria-label="Spirits found" :aria-valuenow="found.length"
                    aria-valuemin="0" :aria-valuemax="spirits.length">
                    <span class="progress-fill"
                        :style="{ width: spirits.length ? `${(found.length / spirits.length) * 100}%` : '0%' }"></span>
                </div>
                <span class="progress-label">{{ found.length }} of {{ spirits.length }} found</span>
                </div>

                <!-- loading/error msg -->
                <p v-if="loading" class="note">Loading your spirits…</p>
                <p v-else-if="errorMsg" class="note" role="alert">{{ errorMsg }}</p>

                <template v-if="!loading && !errorMsg">
                    <!-- newest spirit (or a nudge to find the first one) -->
                    <RouterLink v-if="newest" :to="`/spirits/${newest.id}`" class="newest">
                        <img :src="pictureOf(newest.id)" alt="" class="newest-picture" />
                        <div class="newest-text">
                            <span class="chip chip-dark">Newest · {{ newest.rarity }}</span>
                            <h2 class="newest-name">{{ newest.name }}</h2>
                            <p class="newest-where">
                                Found at {{ newest.placeName }} · {{ formatDate(getFoundRow(newest.id).found_at) }}
                            </p>
                        </div>
                        <svg class="newest-arrow" width="34" height="18" viewBox="0 0 46 24" aria-hidden="true" fill="none"
                            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                        </svg>
                    </RouterLink>
                    <section v-else class="newest">
                        <img :src="lockedPicture" alt="" class="newest-picture" />
                        <div class="newest-text">
                            <span class="chip chip-dark">No spirits yet</span>
                            <h2 class="newest-name">Find your first</h2>
                            <p class="newest-where">Play a game at a place with a spirit. Each one shows where to go.</p>
                        </div>
                    </section>

                    <!-- phone / iPad: the area set they're closest to finishing -->
                    <section v-if="currentSet" class="set-card">
                        <ChestCanvas class="set-chest" />
                        <div class="set-text">
                            <p class="set-title">
                                {{ currentSet.label }} set · {{ countFound(currentSet.value) }} of {{ countTotal(currentSet.value) }}
                            </p>
                            <div class="set-bar">
                                <span class="set-bar-fill"
                                    :style="{ width: `${(countFound(currentSet.value) / countTotal(currentSet.value)) * 100}%` }"></span>
                            </div>
                            <p class="set-hint">Complete the set for a bonus chest (+50 coins)</p>
                        </div>
                    </section>

                    <!-- laptop: all 6 area sets, each with its progress (ink bar when the set is complete) -->
                    <section class="sets-card">
                        <div class="sets-head">
                            <ChestCanvas class="sets-chest" />
                            <div>
                                <h2 class="sets-title">Area sets</h2>
                                <p class="sets-hint">Finish a set for a bonus chest</p>
                            </div>
                        </div>
                        <ul class="sets-list">
                            <li v-for="cat in categories" :key="cat.value" class="sets-row">
                                <span class="sets-name">{{ cat.label }}</span>
                                <span class="sets-bar">
                                    <span class="sets-bar-fill"
                                        :class="{ done: countFound(cat.value) === countTotal(cat.value) }"
                                        :style="{ width: `${(countFound(cat.value) / countTotal(cat.value)) * 100}%` }"></span>
                                </span>
                                <span class="sets-count">{{ countFound(cat.value) }}/{{ countTotal(cat.value) }}</span>
                            </li>
                        </ul>
                    </section>
                </template>
            </div>

            <div v-if="!loading && !errorMsg" class="collection">
                <!-- laptop: "All Spirits" heading beside the filter -->
                <div class="collection-head">
                    <h2 class="collection-title">All Spirits</h2>

                    <!-- filtering the spirits -->
                    <div class="filters" role="group" aria-label="Show">
                        <button type="button" class="filter" :class="{ active: filter === 'all' }"
                            :aria-pressed="filter === 'all'" @click=" filter = 'all' ">All</button>
                        <button type="button" class="filter" :class="{ active: filter === 'found' }"
                            :aria-pressed="filter === 'found'" @click=" filter = 'found' ">Found</button>
                        <button type="button" class="filter" :class="{ active: filter === 'notyet' }"
                            :aria-pressed="filter === 'notyet'" @click=" filter = 'notyet' ">Not yet</button>
                    </div>
                </div>

                <!-- the grid: found spirits show their picture and name; the rest show "?" and where they hide -->
                <!-- (laptop shows a found spirit's rarity instead of its place) -->
                <p v-if="visibleSpirits.length === 0" class="note">None here yet.</p>
                <ul v-else class="grid">
                    <li v-for="s in visibleSpirits" :key="s.id">
                        <RouterLink :to="`/spirits/${s.id}`" class="tile" :class="{ locked: !isFound(s.id) }">
                            <img :src="isFound(s.id) ? pictureOf(s.id) : lockedPicture" alt="" class="tile-picture" />
                            <span class="tile-name">{{ isFound(s.id) ? s.name : '???' }}</span>
                            <span class="tile-place">{{ s.placeName }}</span>
                            <span v-if="isFound(s.id)" class="tile-rarity" :class="`rarity-${s.rarity.toLowerCase()}`">
                                {{ s.rarity }}
                            </span>
                        </RouterLink>
                    </li>
                </ul>
            </div>
        </main>

        <AppNav :coins="coins" />
    </div>
</template>

<style scoped>
/* =========================================================
   Page + background
   ========================================================= */
.spirits-page {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font);
}

/* blurred map image with a lilac glow top-left and a peach glow bottom-right */
.backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.backdrop-map {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(16px) saturate(1.3);
    opacity: 0.55;
    transform: scale(1.4);
}

.glow {
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    filter: blur(55px);
}

.glow-lilac { top: 120px; left: -90px; background: #C9B8F5; opacity: 0.6; }
.glow-peach { top: 520px; right: -90px; background: var(--peach); opacity: 0.7; }

.content {
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 28px 20px 130px;          /* bottom: room for the phone's bottom nav */
}

/* =========================================================
   Header + progress
   ========================================================= */
.eyebrow {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
}

.title {
    margin: 6px 0 20px;
    font-family: var(--font);          /* the app font (not the browser's heading font) */
    font-size: 52px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.055em;
}

.progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.progress {
    flex: 1;
    height: 12px;
    overflow: hidden;
    border-radius: 6px;
    background: rgba(22, 20, 18, 0.12);
}

.progress-fill {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: var(--ink);
    transition: width 0.6s ease;
}

.progress-label {
    font-size: 16px;
    font-weight: 800;
}

.note {
    margin: 16px 0;
    font-size: 17px;
    font-weight: 600;
}

/* =========================================================
   Newest spirit card (peach glass)
   ========================================================= */
.newest {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 30px;
    background: rgba(246, 196, 164, 0.6);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 30px rgba(22, 20, 18, 0.12);
    color: inherit;
    text-decoration: none;
}

.newest-picture {
    flex-shrink: 0;
    width: 104px;
    height: 104px;
    animation: bob 3s ease-in-out infinite;
}

@keyframes bob {
    50% { transform: translateY(-6px); }
}

.newest-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.newest-arrow {
    flex-shrink: 0;
}

.chip {
    align-self: flex-start;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    white-space: nowrap;
    font-size: 16px;
    font-weight: 800;
}

.chip-dark {
    background: var(--ink);
    color: var(--white);
}

.newest-name {
    margin: 0;
    font-family: var(--font);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.045em;
}

.newest-where {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
}

/* =========================================================
   Area set card (light glass)
   ========================================================= */
.set-card {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 16px;
    padding: 16px 18px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.5);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px rgba(22, 20, 18, 0.12);
}

.set-chest {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
}

.set-text {
    flex: 1;
    min-width: 0;
}

.set-title {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 800;
}

.set-bar {
    height: 8px;
    overflow: hidden;
    border-radius: 4px;
    background: rgba(22, 20, 18, 0.12);
}

.set-bar-fill {
    display: block;
    height: 100%;
    border-radius: 5px;
    background: var(--terracotta);
}

.set-hint {
    margin: 6px 0 0;
    font-size: 16px;
    font-weight: 700;
    opacity: 0.75;
}

/* =========================================================
   Filter: All · Found · Not yet
   ========================================================= */
.filters {
    display: inline-flex;
    gap: 2px;
    margin: 24px 0 16px;
    padding: 3px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.55);
}

.filter {
    min-height: var(--tap-min);
    padding: 0 16px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font: 700 16px var(--font);
    cursor: pointer;
}

.filter.active {
    background: var(--ink);
    color: var(--white);
}

/* =========================================================
   Grid: 3 columns (more on bigger screens)
   ========================================================= */
.grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));     /* minmax(0, ...): a long name can't push a column wider */
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
}

@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

/* each tile is a link to that spirit's page (views/spirit.vue) */
.grid > li {
    display: flex;
}

.tile {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.5);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px rgba(22, 20, 18, 0.12);
    color: inherit;
    text-align: center;
    text-decoration: none;
}

/* not found yet: see-through with a dashed border */
.tile.locked {
    border: 1.5px dashed rgba(22, 20, 18, 0.25);
    background: rgba(255, 255, 255, 0.28);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow: none;
}

.tile.locked .tile-name {
    opacity: 0.55;
}

.tile-picture {
    width: 72px;
    height: 72px;
}

.tile-name {
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
}

.tile-place {
    max-width: 100%;
    overflow-wrap: anywhere;          /* "Veeramakaliamman" breaks instead of overflowing */
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
    opacity: 0.7;
}

/* laptop-only parts: hidden on phone / iPad */
.wordmark,
.sets-card,
.collection-title,
.tile-rarity {
    display: none;
}

/* =========================================================
   Mouse users: cards and tiles lift a little on hover
   ========================================================= */
.newest,
.tile {
    transition: transform 0.18s ease;
}

@media (hover: hover) {
    a.newest:hover,
    .tile:hover {
        transform: translateY(-4px);
    }
}

/* users who turn off animations in their settings: the newest spirit stays still */
@media (prefers-reduced-motion: reduce) {
    .newest-picture {
        animation: none;
    }
    .progress-fill {
        transition: none;
    }
    .newest,
    .tile {
        transition: none;
    }
    a.newest:hover,
    .tile:hover {
        transform: none;
    }
}

/* iPad / laptop: the nav moves to the top-right, so leave room at the top instead */
@media (min-width: 768px) {
    .content {
        padding: 100px 32px 40px;
    }
}

/* =========================================================
   Laptop (1200px+), from the laptop handoff's 06-WebSpirits:
   left column 380px (header, newest, all 6 area sets) · right column all 24 spirits, 6 across
   ========================================================= */
@media (min-width: 1200px) {
    .glow {
        width: 520px;
        height: 520px;
        filter: blur(80px);
    }

    .glow-lilac { top: 20%; left: -160px; }
    .glow-peach { top: auto; bottom: -160px; right: -120px; }

    .wordmark {
        display: block;
        position: absolute;
        top: 30px;
        left: 7%;
        z-index: 1;
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .content {
        display: grid;
        grid-template-columns: 380px minmax(0, 1fr);
        gap: 36px;
        max-width: none;
        padding: 110px 7% 60px;
    }

    .title {
        font-size: 76px;
        line-height: 0.9;
    }

    /* newest card: bigger spirit */
    .newest-picture {
        width: 120px;
        height: 120px;
    }

    /* the single set card is replaced by the list of all 6 */
    .set-card {
        display: none;
    }

    .sets-card {
        display: block;
        margin-top: 20px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.85);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.5);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        backdrop-filter: blur(24px) saturate(180%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px rgba(22, 20, 18, 0.12);
    }

    .sets-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
    }

    .sets-chest {
        flex-shrink: 0;
        width: 56px;
        height: 56px;
    }

    .sets-title {
        margin: 0;
        font-family: var(--font);
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
    }

    .sets-hint {
        margin: 2px 0 0;
        font-size: 16px;
        font-weight: 600;
        opacity: 0.75;
    }

    .sets-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .sets-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 84px 32px;
        align-items: center;
        gap: 12px;
        font-size: 16px;
        font-weight: 700;
    }

    .sets-bar {
        height: 8px;
        overflow: hidden;
        border-radius: 4px;
        background: rgba(22, 20, 18, 0.12);
    }

    .sets-bar-fill {
        display: block;
        height: 100%;
        border-radius: 4px;
        background: var(--terracotta);
    }

    .sets-bar-fill.done {
        background: var(--ink);
    }

    .sets-count {
        text-align: right;
    }

    /* right column: "All Spirits" + filter on one row */
    .collection-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin: 6px 0 16px;
    }

    .collection-title {
        display: block;
        margin: 0;
        font-family: var(--font);
        font-size: 30px;
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .filters {
        margin: 0;
    }

    .grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 14px;
    }

    .tile {
        justify-content: center;
        min-height: 156px;
    }

    .tile-picture {
        width: 84px;
        height: 84px;
    }

    /* found: name + rarity chip · not yet: "?" + place name */
    .tile:not(.locked) .tile-place,
    .tile.locked .tile-name {
        display: none;
    }

    .tile-rarity {
        display: inline-block;
        padding: 1px 9px;
        border-radius: var(--radius-pill);
        font-size: 16px;
        font-weight: 700;
    }

    /* rarity colours from the laptop spec */
    .rarity-common { border: 1.5px solid var(--ink); background: var(--white); }
    .rarity-rare { background: #A9CDE8; }
    .rarity-epic { background: #C9B8F5; }
    .rarity-legendary { background: #F3D57C; }
}
</style>
