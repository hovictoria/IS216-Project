<script setup>
import { ref, computed } from 'vue'                         
import AppMenu from '@/components/menu.vue'        // the sidebar
import { spirits, foundIds } from '../data/spirits.js'

const readAloud = ref(false)                       // the sidebar's on/off switch needs this

const filter = ref('all')

const isFound = (id) => foundIds.includes(id)

const visibleSpirits = computed(()=>{
    if (filter.value === 'found'){
        return spirits.filter((s) =>
            isFound(s.id)
        )
    }
    return spirits
})


</script>


<template>
    <div class="app-shell">                          
        <AppMenu v-model:readAloud="readAloud" />      

        <main class="main">                            
        <div class="container py-4">
            <h1>My Collection</h1>
            <p>{{ foundIds.length }} / {{ spirits.length }} found</p>

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

            <div class="row g-3">
            <div v-for="s in visibleSpirits" :key="s.id" class="col-6 col-md-3">
                <div class="card text-center p-3" :class="{ locked: !isFound(s.id) }">
                <div class="display-4">{{ isFound(s.id) ? s.emoji : '❓' }}</div>
                <h5>{{ isFound(s.id) ? s.name : '???' }}</h5>
                </div>
            </div>
            </div>
        </div>
        </main>
    </div>
</template>

<style scoped>
    .locked { opacity: 0.4; }

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
