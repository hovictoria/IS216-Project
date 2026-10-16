<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'

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
const results = ref([]) // true / false per answered question
const chosen = ref(null)
const finished = ref(false)

const question = computed(() => questions.value[current.value])
const answered = computed(() => chosen.value !== null)
const score = computed(() => results.value.filter(Boolean).length)

function choose(option) {
    if (answered.value) return

    chosen.value = option
    results.value.push(option === question.value.name)

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
    results.value = []
    chosen.value = null
    finished.value = false
}

const instruction = computed(() =>
    finished.value
        ? `Well done! You scored ${score.value} out of ${TOTAL_ROUNDS}.`
        : 'What is this object?'
)

// Text for the Read aloud button: includes the answer choices
const speech = computed(() =>
    finished.value
        ? instruction.value
        : `${instruction.value} The choices are: ${question.value.options.join(', ')}.`
)
</script>

<template>
  <GameLayout
    title="Object Identification"
    :intro="instruction"
    :desktop-intro="instruction"
    :speech="speech"
    exit-to="/map"
  >
    <GameProgress
      :label="`Question ${Math.min(current + 1, TOTAL_ROUNDS)} of ${TOTAL_ROUNDS}. ${score} correct.`"
      :total="TOTAL_ROUNDS"
      :results="results"
    />

    <template v-if="!finished">

      <!-- Object -->
      <div class="object mx-auto mb-4 d-flex align-items-center justify-content-center rounded-4 shadow-sm">
        {{ question.emoji }}
      </div>

      <!-- Answer options -->
      <div class="row row-cols-2 g-3">
        <div v-for="option in question.options" :key="option" class="col">
          <button
            class="option w-100 py-3 position-relative fw-bold rounded-4 shadow-sm"
            :class="optionClass(option)"
            :disabled="answered"
            @click="choose(option)"
          >
            <span
              v-if="answered && option === question.name"
              class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            {{ option }}
          </button>
        </div>
      </div>

      <!-- Restart -->
      <div class="text-center">
        <button class="btn btn-link restart fw-bold text-decoration-none mt-4" @click="restartGame">
          <i class="fa-solid fa-rotate-left me-2"></i>Start again
        </button>
      </div>
    </template>

    <!-- Finished -->
    <button v-else class="btn btn-memory w-100 fw-bold py-2" @click="restartGame">
      <i class="fa-solid fa-rotate-left me-2"></i>Play again
    </button>
  </GameLayout>
</template>

<style scoped>
/* Only game-specific styles live here. Everything else is in the shared components. */

/* Object picture */
.object {
    width: 180px;
    height: 180px;
    border: 2px solid #e3dcc6;
    background: #fffdf6;
    font-size: 90px;
    line-height: 1;
}

/* Answer options */
.option {
    border: 2px solid var(--blue);
    background: #fffdf6;
    color: var(--ink);
    font-size: 18px;
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

@media (max-width: 767.98px) {
    .object {
        width: 150px;
        height: 150px;
        font-size: 72px;
    }
}
</style>