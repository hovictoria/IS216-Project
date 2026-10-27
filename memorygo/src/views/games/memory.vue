<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

import { useGameReward } from '@/lib/gamereward'
import flour from '@/assets/flour.webp'
import nutella from '@/assets/nutella.webp'
import apples from '@/assets/apples.png'
import blueberry from '@/assets/blueberry.png'
import oats from '@/assets/oats.webp'
import pizza from '@/assets/pizza.webp'
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
    { value: 'flour', label: 'flour', image:flour },
    { value: 'nutella', label: 'nutella', image:nutella },
    { value: 'apples', label: 'apples', image:apples },
    { value: 'blueberry', label: 'blueberry', image:blueberry },
    { value: 'oats', label: 'oats', image:oats },
    { value: 'pizza', label: 'pizza', image:pizza }
    
]

const cards = ref(shuffle(
    items.flatMap((item, i) => [
        { id: i * 2 + 1, ...item, flipped: false, matched: false, wrong: false },
        { id: i * 2 + 2, ...item, flipped: false, matched: false, wrong: false }
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
    wide
  >
    <GameProgress
      :label="`You've found ${pairsFound} of ${totalPairs} pairs.`"
      :total="totalPairs"
      :results="pairResults"
    />
   
    <Transition name="rise">
    <div v-if="reward" class="text-center fw-bold mt-4 mb-4" aria-live="polite">
        <i class="fa-solid fa-star text-gold me-2"></i>
        You earned {{ reward.earned.xp }} XP and {{ reward.earned.coins }} coins.
    </div>
    </Transition>
    
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
    border-radius: 1rem;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow: 0 3px 6px #0002;
}

.face.back {
    background: var(--blue);
    border: 2px solid var(--blue);
}

.card-back {
    width: calc(100% - 14px);
    height: calc(100% - 14px);
    border: 2px dashed #ffffffcc;
    color: #fff;
}

.face.front {
    transform: rotateY(180deg);
    background: #fffdf6;
    border: 2px solid var(--gold);
    box-shadow: 0 0 0 2px var(--gold);
}

.memory-card.matched .face.front {
    background: #e4efdc;
    border-color: var(--green);
    box-shadow: 0 3px 6px #0002;
}

.memory-card:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: 2px;
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
    width: 20px;
    height: 20px;
}
.memory-card.wrong {
    animation: shake 0.5s ease 0.4s;   /* waits for the flip to finish */
}
.cards-move {
    transition: transform 0.6s ease;
}
.rise-enter-active {
    transition: opacity 0.5s ease, transform 0.5s ease;
}
.rise-enter-from {
    opacity: 0;
    transform: translateY(12px);
}
.dot.filled {
    animation: dot-pop 0.4s ease;
}

@keyframes dot-pop {
    0%   { transform: scale(0.4); }
    60%  { transform: scale(1.3); }
    100% { transform: scale(1); }
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
</style>