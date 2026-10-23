<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'

import { useGameReward } from '@/lib/gamereward'

const { reward, claim, reset } = useGameReward('memory')
function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

// 6 pairs = 12 cards
const items = [
    { value: '🚌', label: 'Bus' },
    { value: '☕', label: 'Kopi' },
    { value: '🌸', label: 'Orchid' },
    { value: '🚆', label: 'MRT' },
    { value: '🍓', label: 'Strawberry' },
    { value: '🦁', label: 'Merlion' }
]

const cards = ref(shuffle(
    items.flatMap((item, i) => [
        { id: i * 2 + 1, ...item, flipped: false, matched: false },
        { id: i * 2 + 2, ...item, flipped: false, matched: false }
    ])
))

const selectedCards = ref([])
const moves = ref(0)
const peeking = ref(false)

const totalPairs = items.length
const pairsFound = computed(() => cards.value.filter(c => c.matched).length / 2)

// One green dot per pair found
const pairResults = computed(() => Array(pairsFound.value).fill(true))

// Text for the Read aloud button
const speech = computed(() =>
    `Memory Match. Tap two cards to find a pair. There's no rush. You've found ${pairsFound.value} of ${totalPairs} pairs.`
)

function selectCard(card) {
    if (peeking.value) return
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
        if (pairsFound.value === totalPairs) claim({ moves: moves.value })
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
    peeking.value = false
    reset()
}

// Briefly reveal every card
function showCards() {
    if (peeking.value || selectedCards.value.length) return
    peeking.value = true
    setTimeout(() => (peeking.value = false), 2500)
}

function isFaceUp(card) {
    return card.flipped || card.matched || peeking.value
}
</script>

<template>
    
  <GameLayout
    title="Memory Match"
    intro="Tap two cards to find a pair. There's no rush."
    desktop-intro="Memory Match. Click two cards to find a pair. There's no rush."
    :speech="speech"
    exit-to="/map"
  >
    <GameProgress
      :label="`You've found ${pairsFound} of ${totalPairs} pairs.`"
      :total="totalPairs"
      :results="pairResults"
    />
    <div v-if="reward" class="text-center fw-bold mt-4" aria-live="polite">
      <i class="fa-solid fa-star text-gold me-2"></i>
      You earned {{ reward.earned.xp }} XP and {{ reward.earned.coins }} coins.
    </div><br>
    <button class="btn btn-memory w-100 fw-bold py-2 mb-3" :disabled="peeking" @click="showCards">
      <i class="fa-solid fa-eye me-2"></i>Show me the cards
    </button>

    <!-- Cards -->
    <div class="row row-cols-3 row-cols-md-4 g-3">
      <div v-for="card in cards" :key="card.id" class="col">
        <button
          class="memory-card w-100 p-0 position-relative d-flex flex-column align-items-center justify-content-center gap-1 rounded-4 shadow-sm"
          :class="{ up: isFaceUp(card) && !card.matched, matched: card.matched }"
          :aria-label="isFaceUp(card) ? card.label : 'Hidden card'"
          @click="selectCard(card)"
        >
          <template v-if="isFaceUp(card)">
            <span
              v-if="card.matched"
              class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            <span class="fs-2 lh-1">{{ card.value }}</span>
            <span class="fw-bold small">{{ card.label }}</span>
          </template>

          <span v-else class="card-back d-flex align-items-center justify-content-center rounded-3">
            <i class="fa-solid fa-location-dot fa-lg"></i>
          </span>
        </button>
      </div>
    </div>

    <!-- Restart -->
    <div class="text-center">
      <button class="btn btn-link restart fw-bold text-decoration-none mt-4" @click="restartGame">
        <i class="fa-solid fa-rotate-left me-2"></i>Start again
      </button>
    </div>
  </GameLayout>
    
</template>

<style scoped>
.memory-card {
    aspect-ratio: 1;
    border: 2px solid var(--blue);
    background: var(--blue);
    color: var(--ink);
}

.memory-card:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: 2px;
}

.card-back {
    width: calc(100% - 14px);
    height: calc(100% - 14px);
    border: 2px dashed #ffffffcc;
    color: #fff;
}

.memory-card.up {
    background: #fffdf6;
    border-color: var(--gold);
    box-shadow: 0 0 0 2px var(--gold);
}

.memory-card.matched {
    background: #e4efdc;
    border-color: var(--green);
    cursor: default;
}
</style>