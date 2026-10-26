<script setup>
import { ref, computed, onMounted} from 'vue'                         
import AppMenu from '@/components/menu.vue'        // the sidebar
// import { spirits, foundIds } from '../data/spirits.js' //testing data 

import { api } from '@/lib/api'  //helper for calling the server
import { stations } from '@/data/stations'   // Yule's station list (id, name, emoji, lat, lng)

const readAloud = ref(false)                       // the sidebar's on/off switch needs this

const spirits = ref([])       // all 50 spirits
const found = ref([])         // this user's rows from user_spirits
const loading = ref(true)
const errorMsg = ref('')

const filter = ref('all')

// the 3 sections on the page, in the order they appear
const categories = [
    { value: 'landmark', label: 'Landmarks', icon: '🏙️' },
    { value: 'flower', label: 'Flowers', icon: '🌸' },
    { value: 'animal', label: 'Animals', icon: '🐾' },
]

///count progress per category
const countTotal = (cat) =>
    spirits.value.filter((s) => s.category === cat).length

// how many of them this user has found
const countFound = (cat) =>
    spirits.value.filter((s) => s.category === cat && isFound(s.id)).length

// const isFound = (id) => foundIds.includes(id)
const isFound = (id) => found.value.some((f) => f.spirit_id === id)

// return the whole row, so can get the collected_at for the date
const getFoundRow = (id) => found.value.find((f) => f.spirit_id === id)

// find the station where this spirit was found, e.g. { id: 6, name: "Fort Canning Park", ... }
// returns null if the spirit isn't found yet, or has no station
const getStation = (spiritId) => {
    const row = getFoundRow(spiritId)
    if (!row || row.station_id == null) return null
    return stations.find((st) => st.id === row.station_id) ?? null
}

// which card is flipped over right now (null = none). Only one at a time keeps it simple.
const flippedId = ref(null)

// tap a card: flip it, or flip it back if it's already flipped. ❓ cards don't flip.
const toggleFlip = (id) => {
    if (!isFound(id)) return
    flippedId.value = flippedId.value === id ? null : id
}

// turn the ISO date format to JavaScript object (human-readable)
// ex: 16 Oct 2026
const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-SG', {
        day: 'numeric', 
        month: 'short',  //ex: oct instead of october
        year: 'numeric'
    })
}

//show found spirits, based on the button u typed
const visibleSpirits = computed(()=>{
    if (filter.value === 'found'){
        return spirits.value.filter((s) =>
            isFound(s.id)
        )
    }
    return spirits.value
})

//the cards to show in one section: respects the All / Found buttons
const spiritsIn = (cat) =>
    visibleSpirits.value.filter((s) => s.category === cat)


//fetch data once the page opens
onMounted(async () => {
    try {
        const { data } = await api.get('/spirits')
        spirits.value = data.spirits
        found.value = data.found
    } catch (e) {
        errorMsg.value = "We couldn't load your spirits. Please try again."
    } finally {
        loading.value = false
    }
})

</script>

<template>
    <div class="app-shell">                          
        <AppMenu v-model:readAloud="readAloud" />      

        <main class="main">                            
        <div class="container py-4">
            <h1>My Collection</h1>
            <p>{{ found.length }} / {{ spirits.length }} found</p>

        <!-- filtering the spirits -->
        <div class="d-flex gap-3 mb-4">
            <button
                type="button"
                class="btn btn-lg"
                :class="filter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
                @click=" filter = 'all' "
            >
            All spirits
            </button>
            
            <button
                type="button"
                class="btn btn-lg"
                :class="filter === 'found' ? 'btn-primary' : 'btn-outline-primary'"
                @click=" filter = 'found' "
            >
            Found by me
            </button>
        </div>

        <!-- loading/error msg -->
        <p v-if="loading">Loading your spirits…</p>
        <p v-else-if="errorMsg" class="text-danger">{{ errorMsg }}</p>

        <!-- one section per category, only shown once the data has loaded-->
        <template v-if="!loading && !errorMsg">
            <section v-for="c in categories" :key="c.value" class="mb-5">

                <!-- section heading with this category's progress, e.g. "Flowers 0/12" -->
                <h2 class="section-title">
                    {{ c.icon }} {{ c.label }}
                    <span class="section-count">{{ countFound(c.value) }} / {{ countTotal(c.value) }}</span>
                </h2>

                <!-- cards in this category (respects the All/Found buttons) -->
                <div class="row g-3">
                <div v-for="s in spiritsIn(c.value)" :key="s.id" class="col-6 col-md-3">
                    <!-- the flippable card: tap (or Enter/Space on a keyboard) to turn it over -->
                    <div
                        class="flip-card h-100"
                        :class="{ flipped: flippedId === s.id, clickable: isFound(s.id) }"
                        :role="isFound(s.id) ? 'button' : null"
                        :tabindex="isFound(s.id) ? 0 : -1"
                        :aria-pressed="isFound(s.id) ? flippedId === s.id : null"
                        @click="toggleFlip(s.id)"
                        @keydown.enter.prevent="toggleFlip(s.id)"
                        @keydown.space.prevent="toggleFlip(s.id)"
                        @mouseleave="flippedId = null"
                    >
                        <div class="flip-inner">

                            <!-- FRONT: same as before -->
                            <div class="flip-front card text-center p-3" :class="{ locked: !isFound(s.id) }">

                                <!-- show spirit emoji -->
                                <div class="display-4">{{ isFound(s.id) ? s.emoji : '❓' }}</div>

                                <!-- show spirit name -->
                                <h5>{{ isFound(s.id) ? s.name : '???' }}</h5>

                                <!-- show date if the spirit is found -->
                                <p v-if="isFound(s.id)" class="found-date mb-0">
                                    Found on: {{ formatDate(getFoundRow(s.id).collected_at) }}
                                </p>                            </div>

                            <!-- BACK: where it was found (only found cards have a back) -->
                            <div v-if="isFound(s.id)" class="flip-back card text-center p-3">
                                <p class="mb-1">📍 Found at</p>
                                <template v-if="getStation(s.id)">
                                    <div class="display-5">{{ getStation(s.id).emoji }}</div>
                                    <h5 class="mb-0">{{ getStation(s.id).name }}</h5>
                                </template>
                                <h5 v-else class="mb-0">Location not recorded</h5>
                            </div>

                        </div>
                    </div>
                </div>
                </div>

                <!-- friendly message when a section is empty (e.g. "Found by me" with no flowers yet) -->
                <p v-if="spiritsIn(c.value).length === 0" class="empty-note">
                    None found yet. Keep exploring!
                </p>
            </section>
        </template>
        </div>
        </main>
    </div>
</template>

<style scoped>
    .locked { opacity: 0.4; }

    .found-date {
    font-size: 1rem;
    color: var(--ink-soft);
}

    /* the flip container: perspective makes the turn look 3D instead of flat */
    .flip-card {
    perspective: 1000px;
    }
    .flip-card.clickable {
    cursor: pointer;
    }

    /* holds both faces; this is the part that actually rotates */
    .flip-inner {
    position: relative;
    height: 100%;
    transition: transform 0.5s;
    transform-style: preserve-3d;
    }

    /* flipped: turn the whole card over */
    .flip-card.flipped .flip-inner {
    transform: rotateY(180deg);
    }

    /* computer: flip as soon as the mouse is over a found card (phones have no hover, so they use tap) */
    @media (hover: hover) {
    .flip-card.clickable:hover .flip-inner {
        transform: rotateY(180deg);
    }
    }

    /* both faces: hide whichever side is facing away */
    .flip-front,
    .flip-back {
    height: 100%;
    backface-visibility: hidden;
    }

    /* the back sits exactly on top of the front, already turned around */
    .flip-back {
    position: absolute;
    inset: 0;
    transform: rotateY(180deg);
    justify-content: center;
    }

    /* users who turn off animations in their settings get an instant flip */
    @media (prefers-reduced-motion: reduce) {
    .flip-inner {
        transition: none;
    }
    }

    /* category section heading, e.g. "🌸 Flowers" (~26px, matches the dashboard's card titles) */
    .section-title {
    font-size: 1.6rem;
    margin-bottom: 1rem;
    }

    /* the "0 / 12" next to the heading: smaller and softer, so it reads as extra info */
    .section-count {
    font-size: 1.1rem;
    color: var(--ink-soft);
    margin-left: 0.5rem;
    }

    /* gentle "None found yet" message for empty sections */
    .empty-note {
    color: var(--ink-soft);
    }

    /* same layout rules as main.vue */
    .app-shell {
    min-height: 100vh;
    background: var(--bg);
    }

    /* Desktop: push content right so the 250px sidebar doesn't cover it */
    @media (min-width: 768px) {
    .main {
        margin-left: 250px;
    }
    }

    /* Mobile: the menu becomes a bottom bar, so leave space at the bottom */
    @media (max-width: 767px) {
    .main {
        padding-bottom: 90px;
    }
    }
</style>
