<script setup>
import { computed } from 'vue'
import { GAME_NAMES } from '@/config/progression'
import { areas } from '@/data/stations'

// The game passes in its reward object (from gamereward.js)
const props = defineProps({
    reward: { type: Object, default: null }
})

// True only if this game pushed the player up a level
const levelledUp = computed(() =>
    props.reward && props.reward.levelAfter > props.reward.levelBefore
)

// Get the names of new games when new games are unlocked
const newGames = computed(() =>
    (props.reward?.unlocks?.games ?? []).map(id => GAME_NAMES[id] ?? id)
)

// Turn area IDs into names from stations.js, e.g. 2 → 'Fort Canning'
const newAreas = computed(() =>
    (props.reward?.unlocks?.areas ?? []).map(id => areas.find(a => a.id === id)?.name ?? `Area ${id}`)
)
</script>

<template>
  <div v-if="levelledUp" class="level-up text-center mt-3 p-3" role="status" aria-live="polite">
    <p class="fs-4 fw-bold mb-1">🎉 You reached Level {{ reward.levelAfter }}!</p>
    <p v-if="newGames.length" class="mb-1">New game unlocked: {{ newGames.join(', ') }}</p>
    <p v-if="newAreas.length" class="mb-0">New area unlocked: {{ newAreas.join(', ') }}</p>
  </div>
</template>

<style scoped>
.level-up {
    background: #fff4d6;
    border: 2px solid #e5b93c;
    border-radius: 16px;
    font-size: 18px;
}
</style>