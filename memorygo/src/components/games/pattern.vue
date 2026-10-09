<script setup>
import { ref, computed } from 'vue'

const symbols = ['🌸', '🐶', '🌳', '🐘', '⭐', '🍎']
const TOTAL_ROUNDS = 5

// Each template is a full pattern. The last item is the answer.
const templates = [
    [0, 1, 0, 1, 0, 1],
    [0, 0, 1, 1, 0, 0, 1, 1],
    [0, 1, 2, 0, 1, 2, 0, 1, 2],
    [0, 1, 1, 0, 1, 1, 0, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0, 1]
]

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createRound() {
    const template = templates[Math.floor(Math.random() * templates.length)]
    const picked = shuffle(symbols)
    const full = template.map(n => picked[n])
    const answer = full[full.length - 1]
    const distractors = shuffle(symbols.filter(s => s !== answer)).slice(0, 3)

    return {
        shown: full.slice(0, -1),
        answer,
        options: shuffle([answer, ...distractors])
    }
}

const round = ref(createRound())
const roundNumber = ref(1)
const score = ref(0)
const chosen = ref(null)
const finished = ref(false)

const answered = computed(() => chosen.value !== null)

function choose(option) {
    if (answered.value) return

    chosen.value = option
    if (option === round.value.answer) score.value++

    setTimeout(() => {
        if (roundNumber.value === TOTAL_ROUNDS) {
            finished.value = true
        } else {
            roundNumber.value++
            round.value = createRound()
        }
        chosen.value = null
    }, 900)
}

function optionClass(option) {
    if (!answered.value) return ''
    if (option === round.value.answer) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

function restartGame() {
    score.value = 0
    roundNumber.value = 1
    chosen.value = null
    finished.value = false
    round.value = createRound()
}
</script>

<template>
  <div class="game-page">

        <div class="game-header">
            <a class="back-button btn" href="/games">← Back</a>
            <div class="game-title">🌸 Memory Garden</div>
        </div>

        <div class="game-intro">
            <h1>🧩 Pattern Recognition</h1>
            <p v-if="!finished">What comes next in the pattern?</p>
            <p v-else>Great job! You scored {{ score }} out of {{ TOTAL_ROUNDS }}.</p>
        </div>

        <div class="game-info">
            <div>🎯 <strong>Round {{ roundNumber }}/{{ TOTAL_ROUNDS }}</strong></div>
            <div>⭐ <strong>{{ score }} Correct</strong></div>
        </div>

        <template v-if="!finished">
            <div class="pattern">
                <span v-for="(item, i) in round.shown" :key="i" class="tile">{{ item }}</span>
                <span class="tile blank">{{ answered ? round.answer : '?' }}</span>
            </div>

            <div class="options">
                <button
                    v-for="option in round.options"
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

.pattern {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    max-width: 640px;
    margin: 0 auto 35px;
}

.tile {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 16px;
    font-size: 34px;
}

.tile.blank {
    background: #d9edc2;
    border: 3px dashed #6b8e7b;
}

.options {
    display: grid;
    grid-template-columns: repeat(4, 100px);
    gap: 16px;
    justify-content: center;
}

.option {
    width: 100px;
    height: 100px;
    border: none;
    border-radius: 20px;
    background: #8bb8a8;
    font-size: 44px;
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
    .game-intro h1 { font-size: 30px; }
    .game-intro p { font-size: 18px; }
    .tile { width: 48px; height: 48px; font-size: 26px; }
    .options { grid-template-columns: repeat(2, 110px); }
    .option { width: 110px; height: 110px; }
    .game-info { gap: 10px; }
    .game-info div { padding: 10px 15px; font-size: 16px; }
}
</style>