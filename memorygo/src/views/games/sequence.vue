<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'
import { getImages, preload } from '@/lib/gameimages'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('sequence')

// Pictures: the shared set plus any extras in src/assets/game-images/sequence/
// Each new game picks 4 of them at random. You need at least 4 pictures, and the more
// different they look from each other, the easier the game is to follow.
const pool = getImages('sequence')
const PAD_COUNT = 4

if (pool.length < PAD_COUNT) console.warn('Sequence Recall needs at least 4 pictures in src/assets/game-images/')

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function pickPads() {
    return shuffle(pool).slice(0, PAD_COUNT).map((img, i) => ({ id: i, name: img.name, src: img.src }))
}

const pads = ref(pickPads())

onMounted(() => preload(pool))

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
    sequence.value.push(Math.floor(Math.random() * pads.value.length))
    showSequence()
    reset();
}

function startGame() {
    pads.value = pickPads()   // a fresh set of pictures each game
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
        if (level.value > 1) claim({ level: level.value - 1 })
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
    <GameReward :reward="reward" />
    <LevelUpNotice :reward="reward" />
    
    <!-- Pads -->
    <div class="pads mx-auto mt-4">
      <div class="row row-cols-2 g-3">
        <div v-for="pad in pads" :key="pad.id" class="col">
          <button
            class="pad w-100 p-0 d-flex align-items-center justify-content-center"
            :class="{ active: activePad === pad.id, waiting: status !== 'playing' && activePad !== pad.id }"
            :disabled="status !== 'playing'"
            :aria-label="pad.name"
            @click="pressPad(pad.id)"
          >
            <img :src="pad.src" alt="" class="pic" draggable="false" />
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
/* Only game-specific styles live here. */

.pads {
    max-width: 320px;
}

.pad {
    aspect-ratio: 1;
    border: 2px solid var(--ink);
    border-radius: 20px;
    background: #fff;
    color: var(--ink);
    box-shadow: 0 2px 8px rgba(22, 20, 18, 0.08);
    transition: transform 0.1s, background-color 0.1s;
}

.pic {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 14%;
    user-select: none;
    pointer-events: none;
}

.pad:not(:disabled):hover {
    background: #fffaf3;
    box-shadow: 0 0 0 2px var(--ink);
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
    background: #fdf1c8;
    border-color: var(--gold-deep);
    box-shadow: 0 0 0 4px var(--gold);
    transform: scale(1.05);
    opacity: 1;
}

.pad:focus-visible {
    outline: 3px solid var(--blue);
    outline-offset: 3px;
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