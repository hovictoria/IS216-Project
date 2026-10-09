<script setup>
import { ref, computed } from 'vue'

const pool = ['🍎', '🐶', '🌸', '🌳', '🐘', '🚗', '🏠', '🍌', '🐱', '⭐', '🎈', '☂️', '🐟', '⚽']
const roundSizes = [4, 4, 5, 5, 6]
const TOTAL_ROUNDS = roundSizes.length

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createRound(size) {
    const picked = shuffle(pool).slice(0, size + 3)
    const shown = picked.slice(0, size)
    const extras = picked.slice(size) // never shown, used as wrong answers
    const missingIndex = Math.floor(Math.random() * size)
    const missing = shown[missingIndex]

    return {
        shown,
        missingIndex,
        missing,
        options: shuffle([missing, ...extras])
    }
}

const roundNumber = ref(1)
const round = ref(createRound(roundSizes[0]))
const phase = ref('study') // study | question | result
const chosen = ref(null)
const score = ref(0)
const finished = ref(false)

const isCorrect = computed(() => chosen.value === round.value.missing)

function startQuestion() {
    phase.value = 'question'
}

function choose(option) {
    if (phase.value !== 'question') return
    chosen.value = option
    if (option === round.value.missing) score.value++
    phase.value = 'result'
}

function nextRound() {
    if (roundNumber.value === TOTAL_ROUNDS) {
        finished.value = true
        return
    }
    roundNumber.value++
    round.value = createRound(roundSizes[roundNumber.value - 1])
    chosen.value = null
    phase.value = 'study'
}

function restartGame() {
    roundNumber.value = 1
    round.value = createRound(roundSizes[0])
    chosen.value = null
    score.value = 0
    finished.value = false
    phase.value = 'study'
}

function optionClass(option) {
    if (phase.value !== 'result') return ''
    if (option === round.value.missing) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

const instruction = computed(() => {
    if (finished.value) return `Lovely work! You got ${score.value} out of ${TOTAL_ROUNDS}.`
    if (phase.value === 'study') return 'Take your time and look at these items.'
    if (phase.value === 'question') return 'One item has disappeared. Which one was it?'
    return isCorrect.value ? 'Correct, well done! 🎉' : 'Not this time. The missing item is shown in green.'
})
</script>

<template>
  <div class="game-page">

        <div class="game-header">
            <button class="back-button">← Back</button>
            <div class="game-title">🌸 Memory Garden</div>
        </div>

        <div class="game-intro">
            <h1>🔍 What's Missing?</h1>
            <p>{{ instruction }}</p>
        </div>

        <div class="game-info">
            <div>🎯 <strong>Round {{ roundNumber }} of {{ TOTAL_ROUNDS }}</strong></div>
            <div>⭐ <strong>{{ score }} Correct</strong></div>
        </div>

        <template v-if="!finished">
            <div class="items">
                <span
                    v-for="(item, i) in round.shown"
                    :key="i"
                    class="tile"
                    :class="{ gap: phase !== 'study' && i === round.missingIndex }"
                >
                    <template v-if="phase === 'study'">{{ item }}</template>
                    <template v-else-if="i === round.missingIndex">
                        {{ phase === 'result' ? item : '?' }}
                    </template>
                    <template v-else>{{ item }}</template>
                </span>
            </div>

            <button v-if="phase === 'study'" class="action-button" @click="startQuestion">
                ✅ I'm ready
            </button>

            <div v-if="phase !== 'study'" class="options">
                <button
                    v-for="option in round.options"
                    :key="option"
                    class="option"
                    :class="optionClass(option)"
                    :disabled="phase === 'result'"
                    @click="choose(option)"
                >
                    {{ option }}
                </button>
            </div>

            <button v-if="phase === 'result'" class="action-button" @click="nextRound">
                {{ roundNumber === TOTAL_ROUNDS ? 'See my score' : 'Next round' }}
            </button>
        </template>

        <button v-if="finished" class="action-button" @click="restartGame">
            🔄 Play Again
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
.game-intro p { font-size: 22px; min-height: 30px; }

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

.items {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    max-width: 520px;
    margin: 0 auto 30px;
}

.tile {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 20px;
    font-size: 60px;
    box-shadow: 0 4px 8px #0002;
}

.tile.gap {
    background: #fbe9b7;
    border: 4px dashed #b8923a;
}

.options {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
    margin-bottom: 10px;
}

.option {
    width: 120px;
    height: 120px;
    border: none;
    border-radius: 20px;
    background: #8bb8a8;
    font-size: 60px;
    cursor: pointer;
    box-shadow: 0 4px 8px #0002;
}

.option:hover:not(:disabled) { transform: scale(1.03); }
.option:disabled { cursor: default; }
.option.correct { background: #bfe0a0; outline: 5px solid #5c8a3a; }
.option.wrong { background: #e8a9a0; }

.action-button {
    margin-top: 25px;
    padding: 18px 36px;
    border: none;
    border-radius: 15px;
    background: #6b8e7b;
    color: white;
    font-size: 22px;
    cursor: pointer;
}

button:focus-visible { outline: 4px solid #2f5d8a; outline-offset: 3px; }

@media (max-width: 600px) {
    .game-page { padding: 20px 10px; }
    .game-intro h1 { font-size: 30px; }
    .game-intro p { font-size: 20px; }
    .tile, .option { width: 95px; height: 95px; font-size: 48px; }
    .items, .options { gap: 12px; }
    .game-info { gap: 10px; }
    .game-info div { padding: 10px 15px; font-size: 16px; }
}
</style>