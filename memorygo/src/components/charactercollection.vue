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

const visibleSpirits = computed(()=>{
    if (filter.value === 'found'){
        return spirits.value.filter((s) =>
            isFound(s.id)
        )
    }
    return spirits.value
})

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

            <div class="row g-3">
            <div v-for="s in visibleSpirits" :key="s.id" class="col-6 col-md-3">
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
