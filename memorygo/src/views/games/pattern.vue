<script setup>
import { ref, computed } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('pattern')

const symbols = ['🌸', '🐶', '🌳', '🐘', '⭐', '🍎']
const TOTAL_ROUNDS = 5

// Each template is a full pattern. The last item is the answer.
const templates = [
    [0, 1, 0, 1, 0, 1],
    [0, 0, 1, 1, 0, 0, 1, 1],
    [0, 1, 2, 0, 1, 2, 0, 1, 2],
    [0, 1, 1, 0, 1, 1, 0, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0, 1]
]

function shuffle(array) {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

function createRound() {
    const template = templates[Math.floor(Math.random() * templates.length)]
    const picked = shuffle(symbols)
    const full = template.map(n => picked[n])
    const answer = full[full.length - 1]
    const distractors = shuffle(symbols.filter(s => s !== answer)).slice(0, 3)

    return {
        shown: full.slice(0, -1),
        answer,
        options: shuffle([answer, ...distractors])
    }
}

const round = ref(createRound())
const roundNumber = ref(1)
const results = ref([]) // true / false per answered round
const chosen = ref(null)
const finished = ref(false)

const score = computed(() => results.value.filter(Boolean).length)
const answered = computed(() => chosen.value !== null)

function choose(option) {
    if (answered.value) return

    chosen.value = option
    results.value.push(option === round.value.answer)

    setTimeout(() => {
        if (roundNumber.value === TOTAL_ROUNDS) {
            finished.value = true
            claim({ score: score.value })
        } else {
            roundNumber.value++
            round.value = createRound()
        }
        chosen.value = null
    }, 900)
}

function optionClass(option) {
    if (!answered.value) return ''
    if (option === round.value.answer) return 'correct'
    if (option === chosen.value) return 'wrong'
    return ''
}

function restartGame() {
    results.value = []
    roundNumber.value = 1
    chosen.value = null
    finished.value = false
    round.value = createRound()
    reset();
}

const instruction = computed(() =>
    finished.value
        ? `Great job! You scored ${score.value} out of ${TOTAL_ROUNDS}.`
        : 'What comes next in the pattern?'
)

// Text for the Read aloud button
const speech = computed(() => `Pattern Recognition. ${instruction.value}`)
</script>

<template>
  <GameLayout
    title="Pattern Recognition"
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

      <!-- Pattern -->
      <div class="d-flex flex-wrap justify-content-center gap-2 mb-4">
        <span
          v-for="(item, i) in round.shown"
          :key="i"
          class="g-tile tile d-flex align-items-center justify-content-center"
        >
          {{ item }}
        </span>
        <span
          class="g-tile tile blank d-flex align-items-center justify-content-center"
          :aria-label="answered ? round.answer : 'Missing picture'"
        >
          {{ answered ? round.answer : '?' }}
        </span>
      </div>

      <!-- Answer options -->
      <div class="row row-cols-4 g-2 g-md-3">
        <div v-for="option in round.options" :key="option" class="col">
          <button
            class="g-option option w-100 p-0 position-relative d-flex align-items-center justify-content-center"
            :class="optionClass(option)"
            :disabled="answered"
            @click="choose(option)"
          >
            <span
              v-if="answered && option === round.answer"
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

/* Pattern tiles (small, so a smaller corner radius than the shared tile) */
.tile.g-tile {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    font-size: 26px;
    line-height: 1;
}

/* The missing spot */
.tile.blank {
    border: 2px dashed var(--gold-deep);
    background: #fdf3d3;
    color: var(--gold-deep);
    font-weight: 800;
    box-shadow: none;
}

@media (min-width: 768px) {
    .tile.g-tile {
        width: 52px;
        height: 52px;
        font-size: 30px;
    }
}

/* Answer options */
.option {
    aspect-ratio: 1;
    color: var(--ink);
    font-size: 36px;
    line-height: 1;
}

.option:disabled {
    cursor: default;
}
</style>