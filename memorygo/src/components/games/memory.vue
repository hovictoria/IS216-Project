<script setup>
import { ref } from 'vue'

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}
const cards = ref(shuffle([
    { id: 1, value: '🌸', flipped: false, matched: false },
    { id: 2, value: '🌸', flipped: false, matched: false },
    { id: 3, value: '🐶', flipped: false, matched: false },
    { id: 4, value: '🐶', flipped: false, matched: false },
    { id: 5, value: '🌳', flipped: false, matched: false },
    { id: 6, value: '🌳', flipped: false, matched: false },
    { id: 7, value: '🐘', flipped: false, matched: false },
    { id: 8, value: '🐘', flipped: false, matched: false }
]))

const selectedCards = ref([])
const moves = ref(0)
function selectCard(card) {
    if (card.flipped || card.matched) return
    if (selectedCards.value.length >= 2) return

    card.flipped = true
    selectedCards.value.push(card)

    // Check when 2 cards have been selected
    if (selectedCards.value.length === 2) {
        checkMatch()
    }
}

function checkMatch() {
    const [first, second] = selectedCards.value
    moves.value++

    if (first.value === second.value) {
        first.matched = true
        second.matched = true
        selectedCards.value = []
    } else {
        setTimeout(() => {
            first.flipped = false
            second.flipped = false
            selectedCards.value = []
        }, 800)
    }
}
function restartGame() {
    cards.value.forEach(card => {
        card.flipped = false
        card.matched = false
    })

    cards.value = shuffle(cards.value)
    selectedCards.value = []
    moves.value = 0
}
</script>

<template>
  <div class="game-page">

        <!-- Header -->
        <div class="game-header">
            <a class="back-button btn" href="/games">← Back</a>

            <div class="game-title">
                🌸 Memory Garden
            </div>
        </div>

        <!-- Game introduction -->
        <div class="game-intro">
            <h1>🧠 Memory Match</h1>
            <p>Find all the matching pairs!</p>
        </div>

        <!-- Game information -->
        <div class="game-info">
            <div>
                ⭐
                <strong>120 XP</strong>
            </div>

            <div>
                🎯
                <strong>{{ moves }} Moves</strong>
            </div>
        </div>

        <!-- Cards -->
        <div class="cards">
            <button
                v-for="card in cards"
                :key="card.id"
                class="card"
                :class="{ matched: card.matched }"
                @click="selectCard(card)"
            >
                <span v-if="card.flipped || card.matched">
                    {{ card.value }}
                </span>

                <span v-else>
                    ?
                </span>
            </button>
        </div>

        <!-- Restart -->
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

/* Header */

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

.game-title {
    font-size: 22px;
    font-weight: bold;
}

/* Introduction */

.game-intro {
    margin: 30px 0 20px;
}

.game-intro h1 {
    font-size: 36px;
    margin-bottom: 8px;
}

.game-intro p {
    font-size: 20px;
}

/* Game information */

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

/* Cards */

.cards {
    display: grid;
    grid-template-columns: repeat(4, 130px);
    gap: 20px;
    justify-content: center;
}

.card {
    width: 130px;
    height: 130px;
    border: none;
    border-radius: 20px;
    background: #8bb8a8;
    font-size: 50px;
    cursor: pointer;
    box-shadow: 0 4px 8px #0002;
}

.card:hover {
    transform: scale(1.03);
}

.card.matched {
    background: #d9edc2;
}

/* Restart */

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

/* Phone */

@media (max-width: 600px) {

    .game-page {
        padding: 20px 10px;
    }

    .game-intro h1 {
        font-size: 30px;
    }

    .game-intro p {
        font-size: 18px;
    }

    .cards {
        grid-template-columns: repeat(2, 120px);
        gap: 15px;
    }

    .card {
        width: 120px;
        height: 120px;
    }

    .game-info {
        gap: 10px;
    }

    .game-info div {
        padding: 10px 15px;
        font-size: 16px;
    }
}
</style>