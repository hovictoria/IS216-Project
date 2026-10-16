<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'

const pads = [
    { id: 0, emoji: '🌸' },
    { id: 1, emoji: '🌳' },
    { id: 2, emoji: '🐘' },
    { id: 3, emoji: '🐶' }
]

const sequence = ref([])
const playerIndex = ref(0)
const activePad = ref(null)
const status = ref('idle') // idle | showing | playing | lost
const best = ref(0)

const level = computed(() => sequence.value.length)

let runId = 0
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// Cancels any running animation when the component goes away
onBeforeUnmount(() => runId++)

async function showSequence() {
    const id = ++runId
    status.value = 'showing'
    playerIndex.value = 0
    await wait(600)

    for (const padId of sequence.value) {
        if (id !== runId) return
        activePad.value = padId
        await wait(450)
        activePad.value = null
        await wait(200)
    }

    if (id === runId) status.value = 'playing'
}

function nextRound() {
    sequence.value.push(Math.floor(Math.random() * pads.length))
    showSequence()
}

function startGame() {
    sequence.value = []
    nextRound()
}

async function pressPad(padId) {
    if (status.value !== 'playing') return

    const id = runId
    activePad.value = padId
    setTimeout(() => { activePad.value = null }, 200)

    if (padId !== sequence.value[playerIndex.value]) {
        best.value = Math.max(best.value, sequence.value.length - 1)
        status.value = 'lost'
        return
    }

    playerIndex.value++

    if (playerIndex.value === sequence.value.length) {
        status.value = 'showing' // block input between rounds
        await wait(800)
        if (id === runId) nextRound()
    }
}

const message = computed(() => {
    if (status.value === 'idle') return 'Watch the pattern, then repeat it.'
    if (status.value === 'showing') return 'Watch carefully…'
    if (status.value === 'playing') return 'Your turn!'
    return `Oops! You reached level ${Math.max(level.value - 1, 0)}.`
})

// Text for the Read aloud button
const speech = computed(() => `Sequence Recall. ${message.value}`)
</script>

<template>
  <GameLayout
    title="Sequence Recall"
    :intro="message"
    :desktop-intro="message"
    :speech="speech"
    exit-to="/map"
  >
    <GameProgress :label="`Level ${level}`">
      <template #end>
        <span class="fw-bold">
          <i class="fa-solid fa-trophy me-2 text-gold"></i>Best {{ best }}
        </span>
      </template>
    </GameProgress>

    <!-- Pads -->
    <div class="pads mx-auto mt-4">
      <div class="row row-cols-2 g-3">
        <div v-for="pad in pads" :key="pad.id" class="col">
          <button
            class="pad w-100 p-0 d-flex align-items-center justify-content-center rounded-4 shadow-sm"
            :class="{ active: activePad === pad.id, waiting: status !== 'playing' && activePad !== pad.id }"
            :disabled="status !== 'playing'"
            :aria-label="`Pad ${pad.emoji}`"
            @click="pressPad(pad.id)"
          >
            {{ pad.emoji }}
          </button>
        </div>
      </div>
    </div>

    <!-- Start / try again -->
    <button
      v-if="status === 'idle' || status === 'lost'"
      class="btn btn-memory w-100 fw-bold py-2 mt-4"
      @click="startGame"
    >
      <i class="fa-solid me-2" :class="status === 'idle' ? 'fa-play' : 'fa-rotate-left'"></i>
      {{ status === 'idle' ? 'Start game' : 'Try again' }}
    </button>
  </GameLayout>
</template>

<style scoped>
/* Only game-specific styles live here. Everything else is in the shared components. */

.pads {
    max-width: 320px;
}

.pad {
    aspect-ratio: 1;
    border: 2px solid var(--blue);
    background: #fffdf6;
    font-size: 64px;
    line-height: 1;
    transition: transform 0.1s, background-color 0.1s;
}

.pad:not(:disabled):hover {
    background: #fff;
    box-shadow: 0 0 0 2px var(--blue);
}

.pad:disabled {
    cursor: default;
}

/* Dimmed while the pattern plays or between rounds */
.pad.waiting {
    opacity: 0.6;
}

/* Lit up */
.pad.active {
    background: #fbf0cf;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold);
    transform: scale(1.05);
    opacity: 1;
}

.pad:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .pad {
        transition: none;
    }

    .pad.active {
        transform: none;
    }
}
</style>