<script setup>
import { ref, computed, onMounted } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'
import { getImages, preload } from '@/lib/gameimages'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('object-id')

// Pictures: the shared set plus any extras in src/assets/game-images/object-id/
// The file name is the answer shown on the button, so "tea-cup.png" becomes "Tea cup".
const items = getImages('object-id').map(img => ({
    src: img.src,
    name: img.name.charAt(0).toUpperCase() + img.name.slice(1)
}))

// each question needs 1 right answer + 3 wrong ones, and there are 5 questions
if (items.length < 5) console.warn('Object Identification needs at least 5 pictures in src/assets/game-images/')

onMounted(() => preload(getImages('object-id')))

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
            claim({ score: score.value })
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
    reset();
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
    <GameReward :reward="reward" />
    <LevelUpNotice :reward="reward" />
    
    <template v-if="!finished">

      <!-- Object -->
      <div class="g-tile object mx-auto mb-4 d-flex align-items-center justify-content-center">
        <img :src="question.src" alt="The object to identify" class="pic" draggable="false" />
      </div>

      <!-- Answer options -->
      <div class="row row-cols-2 g-3">
        <div v-for="option in question.options" :key="option" class="col">
          <button
            class="g-option option w-100 py-3 position-relative fw-bold"
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
/* Only game-specific styles live here. Tiles, answer buttons and colours are the shared
   .g-tile / .g-option styles in GameLayout. */

/* Object picture */
.object {
    width: 200px;
    height: 200px;
}

.pic {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 12%;
    user-select: none;
    pointer-events: none;
}

/* Answer options */
.option {
    min-height: 64px;
    color: var(--ink);
    font-size: 1.2rem;
}

.option:disabled {
    cursor: default;
}

@media (max-width: 767.98px) {
    .object {
        width: 160px;
        height: 160px;
    }
}
</style>