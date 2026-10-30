<script setup>
import { ref, computed, onMounted } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

import { useGameReward } from '@/lib/gamereward'

import { getImages, preload } from '@/lib/gameimages'

const { reward, claim, reset } = useGameReward('memory')
function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

// Pictures: the shared set plus any extras in src/assets/game-images/memory/
const pool = getImages('memory').map(img => ({ value: img.id, label: img.name, image: img.src }))

const PAIRS = 6   // keep at 6: the reward formula on the server expects 6 pairs
const totalPairs = Math.min(PAIRS, pool.length)
if (pool.length < PAIRS) console.warn('Memory Match needs at least 6 pictures in src/assets/game-images/')

// Picks a fresh set of pictures each game, two cards of each, shuffled
function createCards() {
    return shuffle(
        shuffle(pool).slice(0, totalPairs).flatMap((item, i) => [
            { id: i * 2 + 1, ...item, flipped: false, matched: false, wrong: false },
            { id: i * 2 + 2, ...item, flipped: false, matched: false, wrong: false }
        ])
    )
}

const cards = ref(createCards())

onMounted(() => preload(getImages('memory')))

const selectedCards = ref([])
const moves = ref(0)
const peeking = ref(false)

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
        first.wrong = true
        second.wrong = true

        setTimeout(() => {
            first.flipped = false
            second.flipped = false
            first.wrong = false
            second.wrong = false
            selectedCards.value = []
        }, 1000)
    }
}

function restartGame() {
    cards.value = createCards()
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
    wide
  >
    <GameProgress
      :label="`You've found ${pairsFound} of ${totalPairs} pairs.`"
      :total="totalPairs"
      :results="pairResults"
    />
   
    <GameReward :reward="reward" />
    
    <LevelUpNotice :reward="reward" />
    <button class="btn btn-memory w-100 fw-bold py-2 mb-3" :disabled="peeking" @click="showCards">
      <i class="fa-solid fa-eye me-2"></i>Show me the cards
    </button>

    <!-- Cards -->
    <TransitionGroup name="cards" tag="div" class="row row-cols-3 row-cols-md-4 g-3">
      <div v-for="card in cards" :key="card.id" class="col">
        <button
          class="memory-card w-100 p-0"
          :class="{ flipped: isFaceUp(card), matched: card.matched, wrong: card.wrong }"
          :aria-label="isFaceUp(card) ? card.label : 'Hidden card'"
          @click="selectCard(card)"
        >
          <span class="card-inner">
            <!-- Face down -->
            <span class="face back">
              <span class="card-back d-flex align-items-center justify-content-center rounded-3">
                <i class="fa-solid fa-location-dot fa-lg"></i>
              </span>
            </span>

            <!-- Face up -->
            <span class="face front">
              <span
                v-if="card.matched"
                class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                aria-hidden="true"
              >
                <i class="fa-solid fa-check"></i>
              </span>
              <img :src="card.image" alt="" class="card-img" />
              <span class="card-label fw-bold">{{ card.label }}</span>
            </span>
          </span>
        </button>
      </div>
    </TransitionGroup>

    <!-- Restart -->
    <div class="text-center">
      <button class="btn btn-link restart fw-bold text-decoration-none mt-4" @click="restartGame">
        <i class="fa-solid fa-rotate-left me-2"></i>Start again
      </button>
    </div>
  </GameLayout>
    
</template>

<style scoped>
/* Only game-specific styles live here. Colours, buttons and rewards come from the shared components. */

.memory-card {
    aspect-ratio: 1;
    border: 0;
    background: none;
    perspective: 800px;
    color: var(--ink);
}

.card-inner {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.5s ease;
}

.memory-card.flipped .card-inner {
    transform: rotateY(180deg);
}

.face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border-radius: 20px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow: 0 3px 10px rgba(22, 20, 18, 0.14);
}

/* Face down: black card with a peach pin, like the map markers */
.face.back {
    background: var(--ink);
    border: 2px solid var(--ink);
}

.card-back {
    width: calc(100% - 14px);
    height: calc(100% - 14px);
    border: 2px dashed rgba(246, 196, 164, 0.7);
    color: var(--peach);
}

/* Face up: white card */
.face.front {
    transform: rotateY(180deg);
    background: #fff;
    border: 2px solid var(--ink);
}

.memory-card.matched .face.front {
    background: var(--green-soft);
    border-color: var(--green);
}

.memory-card:focus-visible {
    outline: 3px solid var(--blue);
    outline-offset: 3px;
}

.card-img {
    width: 55%;
    aspect-ratio: 1;
    object-fit: contain;
}

.memory-card.matched {
    cursor: default;
    animation: pop 0.5s ease 0.45s;   /* waits for the flip to finish */
}

.card-label {
    font-size: 0.95rem;
}

.memory-card .check {
    width: 22px;
    height: 22px;
}

.memory-card.wrong {
    animation: shake 0.5s ease 0.4s;   /* waits for the flip to finish */
}

.cards-move {
    transition: transform 0.6s ease;
}

@media (min-width: 768px) {
    .card-img {
        width: 62%;
    }

    .card-label {
        font-size: 1.25rem;
    }

    .card-back i {
        font-size: 2.2rem;
    }

    .memory-card .check {
        width: 30px;
        height: 30px;
        font-size: 16px;
    }
}

@keyframes pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.12); }
    100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
    .card-inner,
    .cards-move {
        transition: none;
    }

    .memory-card.matched,
    .memory-card.wrong {
        animation: none;
    }
}
</style>