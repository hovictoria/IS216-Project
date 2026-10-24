<script setup>
import { ref, computed, onMounted} from 'vue'                         
import AppMenu from '@/components/menu.vue'        // the sidebar
// import { spirits, foundIds } from '../data/spirits.js' //testing data 

import { api } from '@/lib/api'  //helper for calling the server

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
                    <div class="h-100 card text-center p-3" :class="{ locked: !isFound(s.id) }">

                        <!-- show spirit emoji -->
                        <div class="display-4">{{ isFound(s.id) ? s.emoji : '❓' }}</div>

                        <!-- show spirit name -->
                        <h5>{{ isFound(s.id) ? s.name : '???' }}</h5>

                        <!-- show date if the spirit is found -->
                        <p v-if="isFound(s.id)" class="found-date mb-0">
                            Found on: {{ formatDate(getFoundRow(s.id).collected_at) }}
                        </p>
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

    /* NEW: same layout rules as main.vue */
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
