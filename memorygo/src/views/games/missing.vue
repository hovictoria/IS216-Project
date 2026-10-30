<script setup>
import { ref, computed, onMounted } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'
import { getImages, preload } from '@/lib/gameimages'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('whats-missing')

/* ---------- Images ----------
   The shared set plus any extras in src/assets/game-images/whats-missing/.
   You need at least 9 pictures (the biggest round shows 6 and needs 3 wrong answers). */
const pool = getImages('whats-missing')

if (pool.length < 9) console.warn('What\'s Missing needs at least 9 pictures in src/assets/game-images/')

const roundSizes = [4, 4, 5, 5, 6]
const TOTAL_ROUNDS = roundSizes.length

onMounted(() => preload(pool))

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
const results = ref([]) // true / false per finished round
const finished = ref(false)

const score = computed(() => results.value.filter(Boolean).length)
const isCorrect = computed(() => chosen.value?.id === round.value.missing.id)

function startQuestion() {
    phase.value = 'question'
}

function choose(option) {
    if (phase.value !== 'question') return
    chosen.value = option
    results.value.push(option.id === round.value.missing.id)
    phase.value = 'result'
}

function nextRound() {
    if (roundNumber.value === TOTAL_ROUNDS) {
        finished.value = true
        claim({ score: score.value })
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
    results.value = []
    finished.value = false
    phase.value = 'study'
    reset()
}

function optionClass(option) {
    if (phase.value !== 'result') return ''
    if (option.id === round.value.missing.id) return 'correct'
    if (option.id === chosen.value?.id) return 'wrong'
    return ''
}

const instruction = computed(() => {
    if (finished.value) return `Lovely work! You got ${score.value} out of ${TOTAL_ROUNDS}.`
    if (phase.value === 'study') return 'Take your time and look at these items.'
    if (phase.value === 'question') return 'One item has disappeared. Which one was it?'
    return isCorrect.value ? 'Correct, well done! 🎉' : 'Not this time. The missing item is shown in green.'
})

// Text for the Read aloud button
const speech = computed(() => `What's missing? ${instruction.value}`)
</script>

<template>
  <GameLayout
    title="What's Missing?"
    :intro="instruction"
    :desktop-intro="instruction"
    :speech="speech"
    exit-to="/map"
    wide
  >
    <GameProgress
      :label="`Round ${finished ? TOTAL_ROUNDS : roundNumber} of ${TOTAL_ROUNDS}. ${score} correct.`"
      :total="TOTAL_ROUNDS"
      :results="results"
    />
    <GameReward :reward="reward" />
    <LevelUpNotice :reward="reward" />

    <template v-if="!finished">

      <!-- Items -->
      <div class="row row-cols-3 g-3 justify-content-center mb-3">
        <div v-for="(item, i) in round.shown" :key="item.id" class="col">
          <div
            class="g-tile tile w-100 d-flex align-items-center justify-content-center fs-1"
            :class="{ gap: phase !== 'study' && i === round.missingIndex }"
          >
            <template v-if="phase === 'study' || i !== round.missingIndex">
              <img :src="item.src" :alt="item.name" class="pic" draggable="false" />
            </template>
            <template v-else>
              <img v-if="phase === 'result'" :src="item.src" :alt="item.name" class="pic" draggable="false" />
              <span v-else aria-label="Missing item">?</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Study -->
      <button v-if="phase === 'study'" class="btn btn-memory w-100 fw-bold py-2" @click="startQuestion">
        <i class="fa-solid fa-check me-2"></i>I'm ready
      </button>

      <!-- Answer options -->
      <div v-if="phase !== 'study'" class="row row-cols-4 g-2 g-md-3 mb-3">
        <div v-for="option in round.options" :key="option.id" class="col">
          <button
            class="g-option option w-100 p-0 position-relative d-flex align-items-center justify-content-center"
            :class="optionClass(option)"
            :disabled="phase === 'result'"
            :aria-label="option.name"
            @click="choose(option)"
          >
            <span
              v-if="phase === 'result' && option.id === round.missing.id"
              class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            <img :src="option.src" alt="" class="pic" draggable="false" />
          </button>
        </div>
      </div>

      <button v-if="phase === 'result'" class="btn btn-memory w-100 fw-bold py-2" @click="nextRound">
        {{ roundNumber === TOTAL_ROUNDS ? 'See my score' : 'Next round' }}
      </button>
    </template>

    <!-- Finished -->
    <button v-else class="btn btn-memory w-100 fw-bold py-2" @click="restartGame">
      <i class="fa-solid fa-rotate-left me-2"></i>Play again
    </button>
  </GameLayout>
</template>

<style scoped>
/* Only game-specific styles live here. Tiles, answer buttons and colours are the shared
   .g-tile / .g-option styles in GameLayout. */

/* Pictures: fill the square without stretching or cropping */
.pic {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 12%;
    user-select: none;
    pointer-events: none;
}

.tile {
    aspect-ratio: 1;
}

/* The gap where the missing item was */
.tile.gap {
    border: 2px dashed var(--gold-deep);
    background: #fdf3d3;
    color: var(--gold-deep);
}

.option {
    aspect-ratio: 1;
    color: var(--ink);
}

.option:disabled {
    cursor: default;
}
</style>