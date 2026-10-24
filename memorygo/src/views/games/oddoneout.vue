<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import { useGameReward } from '@/lib/gamereward'

const { reward, claim, reset } = useGameReward('odd-one-out')

const categories = {
    fruit: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉'],
    animal: ['🐶', '🐱', '🐘', '🐟', '🐦', '🐮'],
    vehicle: ['🚗', '🚲', '🚌', '✈️', '🚢', '🚂'],
    clothing: ['👕', '👒', '🧦', '🧤', '👗', '👟']
}

const TOTAL_ROUNDS = 5

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createRound() {
    const [groupName, oddName] = shuffle(Object.keys(categories))
    const group = shuffle(categories[groupName]).slice(0, 3)
    const odd = shuffle(categories[oddName])[0]

    return { groupName, oddName, odd, options: shuffle([...group, odd]) }
}

const round = ref(createRound())
const roundNumber = ref(1)
const results = ref([]) // true / false per answered round
const chosen = ref(null)
const finished = ref(false)

const score = computed(() => results.value.filter(Boolean).length)
const answered = computed(() => chosen.value !== null)
const isCorrect = computed(() => chosen.value === round.value.odd)

function choose(option) {
    if (answered.value) return
    chosen.value = option
    results.value.push(option === round.value.odd)
}

function nextRound() {
    if (roundNumber.value === TOTAL_ROUNDS) {
        finished.value = true
        claim({ score: score.value })
        return
    }
    roundNumber.value++
    round.value = createRound()
    chosen.value = null
}

function restartGame() {
    round.value = createRound()
    roundNumber.value = 1
    results.value = []
    chosen.value = null
    finished.value = false
    reset();
}

function optionClass(option) {
    if (!answered.value) return ''
    if (option === round.value.odd) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

const instruction = computed(() => {
    if (finished.value) return `Wonderful! You got ${score.value} out of ${TOTAL_ROUNDS}.`
    if (!answered.value) return 'Three of these belong together. Which one does not?'
    const { odd, groupName } = round.value
    return isCorrect.value
        ? `Correct! ${odd} is not a ${groupName === 'clothing' ? 'piece of clothing' : groupName}. 🎉`
        : `Not quite. ${odd} is the one that doesn't belong with the ${groupName === 'clothing' ? 'clothing' : groupName + 's'}.`
})

// Text for the Read aloud button
const speech = computed(() => `Odd One Out. ${instruction.value}`)
</script>

<template>
  <GameLayout
    title="Odd One Out"
    :intro="instruction"
    :desktop-intro="instruction"
    :speech="speech"
    exit-to="/map"
  >
    <GameProgress
      :label="`Round ${roundNumber} of ${TOTAL_ROUNDS}. ${score} correct.`"
      :total="TOTAL_ROUNDS"
      :results="results"
    />
    <div v-if="reward" class="text-center fw-bold mt-4" aria-live="polite">
        <i class="fa-solid fa-star text-gold me-2"></i>
        You earned {{ reward.earned.xp }} XP and {{ reward.earned.coins }} coins.
    </div><br>
    <template v-if="!finished">

      <!-- Options -->
      <div class="row row-cols-2 g-3 mb-3">
        <div v-for="option in round.options" :key="option" class="col">
          <button
            class="option w-100 p-0 position-relative d-flex align-items-center justify-content-center rounded-4 shadow-sm"
            :class="optionClass(option)"
            :disabled="answered"
            @click="choose(option)"
          >
            <span
              v-if="answered && option === round.odd"
              class="check position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            {{ option }}
          </button>
        </div>
      </div>

      <button v-if="answered" class="btn btn-memory w-100 fw-bold py-2" @click="nextRound">
        {{ roundNumber === TOTAL_ROUNDS ? 'See my score' : 'Next round' }}
      </button>

      <!-- Restart -->
      <div class="text-center">
        <button class="btn btn-link restart fw-bold text-decoration-none mt-3" @click="restartGame">
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

/* Answer options */
.option {
    aspect-ratio: 1;
    border: 2px solid var(--blue);
    background: #fffdf6;
    font-size: 64px;
    line-height: 1;
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
    .option {
        font-size: 52px;
    }
}
</style>