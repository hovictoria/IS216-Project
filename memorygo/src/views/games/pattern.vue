<script setup>
import { ref, computed, onMounted } from 'vue'
import GameLayout from '../../components/games/GameLayout.vue'
import GameProgress from '../../components/games/GameProgress.vue'
import GameReward from '../../components/games/GameReward.vue'
import { useGameReward } from '@/lib/gamereward'
import { getImages, preload } from '@/lib/gameimages'

import LevelUpNotice from '@/components/LevelUpNotice.vue'

const { reward, claim, reset } = useGameReward('pattern')

// Pictures: the shared set plus any extras in src/assets/game-images/pattern/
// You need at least 4 pictures (one right answer plus 3 wrong ones), and 6 or more is better.
const symbols = getImages('pattern')

if (symbols.length < 4) console.warn('Pattern Recognition needs at least 4 pictures in src/assets/game-images/')

onMounted(() => preload(symbols))

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
    const distractors = shuffle(symbols.filter(s => s.id !== answer.id)).slice(0, 3)

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

// How many tiles per row, so a long pattern wraps into even rows (e.g. 9 tiles = 5 + 4)
const cols = computed(() => {
    const total = round.value.shown.length + 1
    return total <= 6 ? total : Math.ceil(total / 2)
})

function choose(option) {
    if (answered.value) return

    chosen.value = option
    results.value.push(option.id === round.value.answer.id)

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
    if (option.id === round.value.answer.id) return 'correct'
    if (option.id === chosen.value?.id) return 'wrong'
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
    wide
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
      <div class="pattern mb-4 mb-md-5" :style="{ '--cols': cols }">
        <span
          v-for="(item, i) in round.shown"
          :key="i"
          class="g-tile tile d-flex align-items-center justify-content-center"
        >
          <img :src="item.src" :alt="item.name" class="pic" draggable="false" />
        </span>
        <span
          class="g-tile tile blank d-flex align-items-center justify-content-center"
          :aria-label="answered ? round.answer.name : 'Missing picture'"
        >
          <img v-if="answered" :src="round.answer.src" alt="" class="pic" draggable="false" />
          <template v-else>?</template>
        </span>
      </div>

      <!-- Answer options -->
      <div class="options mx-auto row row-cols-4 g-2 g-md-4">
        <div v-for="option in round.options" :key="option.id" class="col">
          <button
            class="g-option option w-100 p-0 position-relative d-flex align-items-center justify-content-center"
            :class="optionClass(option)"
            :disabled="answered"
            @click="choose(option)"
          >
            <span
              v-if="answered && option.id === round.answer.id"
              class="check position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
              aria-hidden="true"
            >
              <i class="fa-solid fa-check"></i>
            </span>
            <img :src="option.src" :alt="option.name" class="pic" draggable="false" />
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

/* Pictures fill their square without stretching or cropping */
.pic {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 10%;
    user-select: none;
    pointer-events: none;
}

/* The pattern: tiles shrink to fit small screens, and grow on a laptop */
.pattern {
    --tile: 64px;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, var(--tile)));
    justify-content: center;
    gap: 8px;
}

.tile.g-tile {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    border-radius: 16px;
    font-size: 1.8rem;
    line-height: 1;
}

/* The missing spot */
.tile.blank {
    border: 3px dashed var(--gold-deep);
    background: #fdf3d3;
    color: var(--gold-deep);
    font-weight: 800;
    box-shadow: none;
}

/* Answer options */
.options {
    max-width: 640px;
}

.option {
    aspect-ratio: 1;
    color: var(--ink);
}

.option .pic {
    padding: 14%;
}

.option:disabled {
    cursor: default;
}

/* Laptop: much bigger pictures and a thicker outline, easier to see and tap */
@media (min-width: 768px) {
    .pattern {
        --tile: 104px;
        gap: 14px;
    }

    .tile.g-tile {
        border-radius: 22px;
        font-size: 3rem;
    }

    .options {
        max-width: 680px;
    }

    .option.g-option {
        border-width: 3px;
        border-radius: 26px;
    }

    .option .check {
        width: 32px;
        height: 32px;
        font-size: 16px;
    }
}
</style>