<script setup>
import { ref, computed, onMounted } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'
import { getCategories, preload } from '@/lib/gameimages'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('odd-one-out')

// Pictures grouped by folder: src/assets/game-images/categories/<name>/
// e.g. categories/fruit/apple.png, categories/animal/cat.png. The folder name is the category.
// You need at least 2 categories, and at least one with 3+ pictures.
const categories = getCategories()

if (Object.keys(categories).length < 2) {
    console.warn('Odd One Out needs at least 2 folders of pictures in src/assets/game-images/categories/')
}

onMounted(() => preload(Object.values(categories).flat()))

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
    // the group needs 3 pictures, the odd one comes from any other category
    const groupName = shuffle(Object.keys(categories).filter(k => categories[k].length >= 3))[0]
    const oddName = shuffle(Object.keys(categories).filter(k => k !== groupName))[0]
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
const isCorrect = computed(() => chosen.value?.id === round.value.odd.id)

function choose(option) {
    if (answered.value) return
    chosen.value = option
    results.value.push(option.id === round.value.odd.id)
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
    if (option.id === round.value.odd.id) return 'correct'
    if (option.id === chosen.value?.id) return 'wrong'
    return ''
}

const instruction = computed(() => {
    if (finished.value) return `Wonderful! You got ${score.value} out of ${TOTAL_ROUNDS}.`
    if (!answered.value) return 'Three of these belong together. Which one does not?'
    const { odd, groupName } = round.value
    return isCorrect.value
        ? `Correct! ${odd.name} is not a ${groupName === 'clothing' ? 'piece of clothing' : groupName}. 🎉`
        : `Not quite. ${odd.name} is the one that doesn't belong with the ${groupName === 'clothing' ? 'clothing' : groupName + 's'}.`
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
    <GameReward :reward="reward" />

    <LevelUpNotice :reward="reward" />
    
    <template v-if="!finished">

      <!-- Options -->
      <div class="row row-cols-2 g-3 mb-3">
        <div v-for="option in round.options" :key="option.id" class="col">
          <button
            class="g-option option w-100 p-0 position-relative d-flex align-items-center justify-content-center"
            :class="optionClass(option)"
            :disabled="answered"
            @click="choose(option)"
          >
            <span
              v-if="answered && option.id === round.odd.id"
              class="check position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            <img :src="option.src" :alt="option.name" class="pic" draggable="false" />
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
/* Only game-specific styles live here. Answer buttons and colours are the shared
   .g-option styles in GameLayout. */

.pic {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 14%;
    user-select: none;
    pointer-events: none;
}

.option {
    aspect-ratio: 1;
    color: var(--ink);
}

.option:disabled {
    cursor: default;
}
</style>