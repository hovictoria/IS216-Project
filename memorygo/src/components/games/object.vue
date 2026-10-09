<script setup>
import { ref, computed } from 'vue'

const items = [
    { emoji: '🍎', name: 'Apple' },
    { emoji: '🚗', name: 'Car' },
    { emoji: '🐱', name: 'Cat' },
    { emoji: '🌙', name: 'Moon' },
    { emoji: '🏠', name: 'House' },
    { emoji: '🚲', name: 'Bicycle' },
    { emoji: '🍌', name: 'Banana' },
    { emoji: '🐟', name: 'Fish' },
    { emoji: '☂️', name: 'Umbrella' },
    { emoji: '⚽', name: 'Ball' }
]

const TOTAL_ROUNDS = 5

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createQuestions() {
    return shuffle(items).slice(0, TOTAL_ROUNDS).map(item => {
        const wrong = shuffle(items.filter(i => i.name !== item.name))
            .slice(0, 3)
            .map(i => i.name)

        return { ...item, options: shuffle([item.name, ...wrong]) }
    })
}

const questions = ref(createQuestions())
const current = ref(0)
const score = ref(0)
const chosen = ref(null)
const finished = ref(false)

const question = computed(() => questions.value[current.value])
const answered = computed(() => chosen.value !== null)

function choose(option) {
    if (answered.value) return

    chosen.value = option
    if (option === question.value.name) score.value++

    setTimeout(() => {
        if (current.value === TOTAL_ROUNDS - 1) {
            finished.value = true
        } else {
            current.value++
        }
        chosen.value = null
    }, 900)
}

function optionClass(option) {
    if (!answered.value) return ''
    if (option === question.value.name) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

function restartGame() {
    questions.value = createQuestions()
    current.value = 0
    score.value = 0
    chosen.value = null
    finished.value = false
}
</script>

<template>
  <div class="game-page">

        <div class="game-header">
            <a class="back-button btn" href="/games">← Back</a>
            <div class="game-title">🌸 Memory Garden</div>
        </div>

        <div class="game-intro">
            <h1>👀 Object Identification</h1>
            <p v-if="!finished">What is this object?</p>
            <p v-else>Well done! You scored {{ score }} out of {{ TOTAL_ROUNDS }}.</p>
        </div>

        <div class="game-info">
            <div>🎯 <strong>Question {{ Math.min(current + 1, TOTAL_ROUNDS) }}/{{ TOTAL_ROUNDS }}</strong></div>
            <div>⭐ <strong>{{ score }} Correct</strong></div>
        </div>

        <template v-if="!finished">
            <div class="object">{{ question.emoji }}</div>

            <div class="options">
                <button
                    v-for="option in question.options"
                    :key="option"
                    class="option"
                    :class="optionClass(option)"
                    @click="choose(option)"
                >
                    {{ option }}
                </button>
            </div>
        </template>

        <button class="restart-button" @click="restartGame">
            🔄 Restart Game
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
.game-intro p { font-size: 20px; }

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

.object {
    width: 180px;
    height: 180px;
    margin: 0 auto 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 30px;
    font-size: 100px;
    box-shadow: 0 4px 8px #0002;
}

.options {
    display: grid;
    grid-template-columns: repeat(2, 200px);
    gap: 16px;
    justify-content: center;
}

.option {
    padding: 18px;
    border: none;
    border-radius: 18px;
    background: #8bb8a8;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 8px #0002;
}

.option:hover { transform: scale(1.03); }
.option.correct { background: #d9edc2; }
.option.wrong { background: #e8a9a0; }

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
    .game-intro h1 { font-size: 28px; }
    .game-intro p { font-size: 18px; }
    .object { width: 150px; height: 150px; font-size: 80px; }
    .options { grid-template-columns: repeat(2, 140px); }
    .game-info { gap: 10px; }
    .game-info div { padding: 10px 15px; font-size: 16px; }
}
</style>