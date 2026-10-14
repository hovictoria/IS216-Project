<script setup>
import { spirits, foundIds } from '../data/spirits.js'

const isFound = (id) => foundIds.includes(id)
</script>

<template>
    <div class="container py-4">
        <h1>My Collection</h1>
        <p>{{ foundIds.length }} / {{ spirits.length }} found</p>

        <div class="row g-3">
        <div v-for="s in spirits" :key="s.id" class="col-6 col-md-3">
            <div class="card text-center p-3" :class="{ locked: !isFound(s.id) }">
            <div class="display-4">{{ isFound(s.id) ? s.emoji : '❓' }}</div>
            <h5>{{ isFound(s.id) ? s.name : '???' }}</h5>
            </div>
        </div>
        </div>
    </div>
</template>

<style scoped>
.locked { opacity: 0.4; }
</style>