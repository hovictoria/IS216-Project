<script setup>
import { ref, computed } from 'vue'

const categories = {
    fruit: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉'],
    animal: ['🐶', '🐱', '🐘', '🐟', '🐦', '🐮'],
    vehicle: ['🚗', '🚲', '🚌', '✈️', '🚢', '🚂'],
    clothing: ['👕', '👒', '🧦', '🧤', '👗', '👟']
}

const TOTAL_ROUNDS = 5

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createRound() {
    const [groupName, oddName] = shuffle(Object.keys(categories))
    const group = shuffle(categories[groupName]).slice(0, 3)
    const odd = shuffle(categories[oddName])[0]

    return { groupName, oddName, odd, options: shuffle([...group, odd]) }
}

const round = ref(createRound())
const roundNumber = ref(1)
const score = ref(0)
const chosen = ref(null)
const finished = ref(false)

const answered = computed(() => chosen.value !== null)
const isCorrect = computed(() => chosen.value === round.value.odd)

function choose(option) {
    if (answered.value) return
    chosen.value = option
    if (option === round.value.odd) score.value++
}

function nextRound() {
    if (roundNumber.value === TOTAL_ROUNDS) {
        finished.value = true
        return
    }
    roundNumber.value++
    round.value = createRound()
    chosen.value = null
}

function restartGame() {
    round.value = createRound()
    roundNumber.value = 1
    score.value = 0
    chosen.value = null
    finished.value = false
}

function optionClass(option) {
    if (!answered.value) return ''
    if (option === round.value.odd) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

const instruction = computed(() => {
    if (finished.value) return `Wonderful! You got ${score.value} out of ${TOTAL_ROUNDS}.`
    if (!answered.value) return 'Three of these belong together. Which one does not?'
    const { odd, groupName } = round.value
    return isCorrect.value
        ? `Correct! ${odd} is not a ${groupName === 'clothing' ? 'piece of clothing' : groupName}. 🎉`
        : `Not quite. ${odd} is the one that doesn't belong with the ${groupName === 'clothing' ? 'clothing' : groupName + 's'}.`
})
</script>

<template>
  <div class="game-page">

        <div class="game-header">
            <button class="back-button">← Back</button>
            <div class="game-title">🌸 Memory Garden</div>
        </div>

        <div class="game-intro">
            <h1>🤔 Odd One Out</h1>
            <p>{{ instruction }}</p>
        </div>

        <div class="game-info">
            <div>🎯 <strong>Round {{ roundNumber }} of {{ TOTAL_ROUNDS }}</strong></div>
            <div>⭐ <strong>{{ score }} Correct</strong></div>
        </div>

        <template v-if="!finished">
            <div class="options">
                <button
                    v-for="option in round.options"
                    :key="option"
                    class="option"
                    :class="optionClass(option)"
                    :disabled="answered"
                    @click="choose(option)"
                >
                    {{ option }}
                </button>
            </div>

            <button v-if="answered" class="action-button" @click="nextRound">
                {{ roundNumber === TOTAL_ROUNDS ? 'See my score' : 'Next round' }}
            </button>
        </template>

        <button v-else class="action-button" @click="restartGame">
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
.game-intro p { font-size: 22px; min-height: 30px; max-width: 560px; margin: 0 auto; }

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

.options {
    display: grid;
    grid-template-columns: repeat(2, 150px);
    gap: 20px;
    justify-content: center;
}

.option {
    width: 150px;
    height: 150px;
    border: none;
    border-radius: 24px;
    background: #8bb8a8;
    font-size: 72px;
    cursor: pointer;
    box-shadow: 0 4px 8px #0002;
}

.option:hover:not(:disabled) { transform: scale(1.03); }
.option:disabled { cursor: default; }
.option.correct { background: #bfe0a0; outline: 5px solid #5c8a3a; }
.option.wrong { background: #e8a9a0; }

.action-button {
    margin-top: 30px;
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
    .options { grid-template-columns: repeat(2, 130px); gap: 15px; }
    .option { width: 130px; height: 130px; font-size: 60px; }
    .game-info { gap: 10px; }
    .game-info div { padding: 10px 15px; font-size: 16px; }
}
</style>