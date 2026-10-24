<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import { useGameReward } from '@/lib/gamereward'
const { reward, claim, reset } = useGameReward('whats-missing')

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
const results = ref([]) // true / false per finished round
const finished = ref(false)

const score = computed(() => results.value.filter(Boolean).length)
const isCorrect = computed(() => chosen.value === round.value.missing)

function startQuestion() {
    phase.value = 'question'
}

function choose(option) {
    if (phase.value !== 'question') return
    chosen.value = option
    results.value.push(option === round.value.missing)
    phase.value = 'result'
}

function nextRound() {
    if (roundNumber.value === TOTAL_ROUNDS) {
        finished.value = true;
        claim({ score: score.value });
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
    reset();
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
  >
    <GameProgress
      :label="`Round ${finished ? TOTAL_ROUNDS : roundNumber} of ${TOTAL_ROUNDS}. ${score} correct.`"
      :total="TOTAL_ROUNDS"
      :results="results"
    />
    <div v-if="reward" class="text-center fw-bold mt-4" aria-live="polite">
        <i class="fa-solid fa-star text-gold me-2"></i>
        You earned {{ reward.earned.xp }} XP and {{ reward.earned.coins }} coins.
    </div><br>
    <template v-if="!finished">

      <!-- Items -->
      <div class="row row-cols-3 g-3 justify-content-center mb-3">
        <div v-for="(item, i) in round.shown" :key="i" class="col">
          <div
            class="tile w-100 d-flex align-items-center justify-content-center rounded-4 shadow-sm fs-1"
            :class="{ gap: phase !== 'study' && i === round.missingIndex }"
          >
            <template v-if="phase === 'study' || i !== round.missingIndex">{{ item }}</template>
            <template v-else>{{ phase === 'result' ? item : '?' }}</template>
          </div>
        </div>
      </div>

      <!-- Study -->
      <button v-if="phase === 'study'" class="btn btn-memory w-100 fw-bold py-2" @click="startQuestion">
        <i class="fa-solid fa-check me-2"></i>I'm ready
      </button>

      <!-- Answer options -->
      <div v-if="phase !== 'study'" class="row row-cols-4 g-2 g-md-3 mb-3">
        <div v-for="option in round.options" :key="option" class="col">
          <button
            class="option w-100 p-0 position-relative d-flex align-items-center justify-content-center rounded-4 shadow-sm fs-2"
            :class="optionClass(option)"
            :disabled="phase === 'result'"
            @click="choose(option)"
          >
            <span
              v-if="phase === 'result' && option === round.missing"
              class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            {{ option }}
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
/* Only game-specific styles live here. Everything else is in the shared components. */

/* Items */
.tile {
    aspect-ratio: 1;
    border: 2px solid #e3dcc6;
    background: #fffdf6;
}

.tile.gap {
    border: 2px dashed var(--gold);
    background: #fbf0cf;
    color: var(--gold);
}

/* Answer options */
.option {
    aspect-ratio: 1;
    border: 2px solid var(--blue);
    background: #fffdf6;
}

.option:hover:not(:disabled) {
    background: #fff;
    box-shadow: 0 0 0 2px var(--blue);
}

.option:disabled {
    cursor: default;
}

.option:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: 2px;
}

.option.correct {
    background: #e4efdc;
    border-color: var(--green);
}

.option.wrong {
    background: #f6dcd8;
    border-color: var(--red);
}
</style>