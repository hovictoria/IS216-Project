<script setup>
import { computed } from 'vue'

// Replaces the "You earned X XP and Y coins" block that every game repeats.
// Usage:  <GameReward :reward="reward" />   (reward comes from useGameReward)
// A practice round (play again, or a place already played today) earns nothing, so say so
// instead of showing "+0 coins".
const props = defineProps({
    reward: { type: Object, default: null }
})

const isPractice = computed(() => {
    const r = props.reward
    if (!r) return false
    return r.practice === true || r.paid === false || (r.earned.xp === 0 && r.earned.coins === 0)
})
</script>

<template>
  <Transition name="rise">
    <div v-if="reward" class="reward d-flex flex-wrap justify-content-center gap-2 my-4" aria-live="polite">
      <span v-if="isPractice" class="chip">Practice round · no coins or XP this time</span>
      <template v-else>
        <span class="chip">
          <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="11" cy="11" r="8" fill="#C9A23A" stroke="#161412" stroke-width="1.8" />
            <circle cx="9.5" cy="9.5" r="8" fill="#F3D57C" stroke="#161412" stroke-width="1.8" />
          </svg>
          +{{ reward.earned.coins }} coins
        </span>
        <span class="chip">+{{ reward.earned.xp }} XP</span>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 1rem;
    font-weight: 800;
    color: var(--ink);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 999px;
    box-shadow: var(--glass-shadow);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    backdrop-filter: blur(20px) saturate(170%);
}

.rise-enter-active { transition: opacity 0.5s ease, transform 0.5s ease; }
.rise-enter-from { opacity: 0; transform: translateY(12px); }

@media (prefers-reduced-motion: reduce) {
    .rise-enter-active { transition: none; }
}
</style>