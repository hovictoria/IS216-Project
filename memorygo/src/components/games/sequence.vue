<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const pads = [
    { id: 0, emoji: '🌸', color: '#e8a9b8' },
    { id: 1, emoji: '🌳', color: '#8bb8a8' },
    { id: 2, emoji: '🐘', color: '#a9b7cf' },
    { id: 3, emoji: '🐶', color: '#e6c987' }
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
</script>

<template>
  <div class="game-page">

        <div class="game-header">
            <a class="back-button btn" href="/games">← Back</a>
            <div class="game-title">🌸 Memory Garden</div>
        </div>

        <div class="game-intro">
            <h1>🔢 Sequence Recall</h1>
            <p>{{ message }}</p>
        </div>

        <div class="game-info">
            <div>🪜 <strong>Level {{ level }}</strong></div>
            <div>🏆 <strong>Best {{ best }}</strong></div>
        </div>

        <div class="pads">
            <button
                v-for="pad in pads"
                :key="pad.id"
                class="pad"
                :class="{ active: activePad === pad.id }"
                :style="{ background: pad.color }"
                :disabled="status !== 'playing'"
                :aria-label="`Pad ${pad.emoji}`"
                @click="pressPad(pad.id)"
            >
                {{ pad.emoji }}
            </button>
        </div>

        <button
            v-if="status === 'idle' || status === 'lost'"
            class="restart-button"
            @click="startGame"
        >
            {{ status === 'idle' ? '▶️ Start Game' : '🔄 Try Again' }}
        </button>

    </div>
</template>

<style scoped>
.game-page {
    min-height: 100vh;
    padding: 30px;
    background: #f5f1df;
    font-family: Arial, sans-serif;
    text-align: center;
}

.game-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 700px;
    margin: auto;
}

.back-button {
    border: none;
    background: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 18px;
    cursor: pointer;
}

.game-title { font-size: 22px; font-weight: bold; }

.game-intro { margin: 30px 0 20px; }
.game-intro h1 { font-size: 36px; margin-bottom: 8px; }
.game-intro p { font-size: 20px; min-height: 28px; }

.game-info {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin: 20px 0 30px;
}

.game-info div {
    background: white;
    padding: 12px 25px;
    border-radius: 15px;
    font-size: 18px;
}

.pads {
    display: grid;
    grid-template-columns: repeat(2, 150px);
    gap: 20px;
    justify-content: center;
}

.pad {
    width: 150px;
    height: 150px;
    border: none;
    border-radius: 24px;
    font-size: 56px;
    cursor: pointer;
    opacity: 0.55;
    transition: transform 0.1s, opacity 0.1s;
    box-shadow: 0 4px 8px #0002;
}

.pad:disabled { cursor: default; }

.pad.active {
    opacity: 1;
    transform: scale(1.08);
}

.restart-button {
    margin-top: 35px;
    padding: 15px 30px;
    border: none;
    border-radius: 15px;
    background: #6b8e7b;
    color: white;
    font-size: 20px;
    cursor: pointer;
}

@media (max-width: 600px) {
    .game-page { padding: 20px 10px; }
    .game-intro h1 { font-size: 30px; }
    .game-intro p { font-size: 18px; }
    .pads { grid-template-columns: repeat(2, 130px); gap: 15px; }
    .pad { width: 130px; height: 130px; }
    .game-info { gap: 10px; }
    .game-info div { padding: 10px 15px; font-size: 16px; }
}
</style>