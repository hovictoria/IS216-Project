<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_NAMES } from '@/config/progression'
import { areas } from '@/data/stations'

// The game passes in its reward object (from gamereward.js)
const props = defineProps({
    reward: { type: Object, default: null }
})

// True only if this game pushed the player up a level
const levelledUp = computed(() =>
    props.reward && props.reward.levelAfter > props.reward.levelBefore
)

// Get the names of new games when new games are unlocked
const newGames = computed(() =>
    (props.reward?.unlocks?.games ?? []).map(id => GAME_NAMES[id] ?? id)
)

// Turn area IDs into names from stations.js, e.g. 2 → 'Fort Canning'
const newAreas = computed(() =>
    (props.reward?.unlocks?.areas ?? []).map(id => areas.find(a => a.id === id)?.name ?? `Area ${id}`)
)

// Closed by tapping outside the card; opens again on the next reward
const dismissed = ref(false)
watch(() => props.reward, () => { dismissed.value = false })

// Continue takes the player back to the map to try what they unlocked
const router = useRouter()
function backToMap() {
    dismissed.value = true
    router.push('/map')
}

// Paper confetti in the app's colours, each piece with its own spot and timing
const COLOURS = ['#a64f31', '#4f7f55', '#3b5f94', '#e5b93c']
const confetti = Array.from({ length: 28 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    background: COLOURS[i % COLOURS.length],
    animationDelay: `${(i % 7) * 0.18}s`,
    animationDuration: `${2.4 + (i % 4) * 0.4}s`
}))
</script>

<template>
  <Teleport to="body">
    <Transition name="level-up">
      <div v-if="levelledUp && !dismissed" class="overlay" @click.self="dismissed = true">
        <div class="confetti" aria-hidden="true">
          <span v-for="(piece, i) in confetti" :key="i" :style="piece"></span>
        </div>

        <div class="level-card text-center" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
          <div class="level-badge mx-auto mb-3" aria-hidden="true">
            <i class="fa-solid fa-star"></i>
            <span>{{ reward.levelAfter }}</span>
          </div>

          <p class="eyebrow mb-1">Level up!</p>
          <h2 id="level-up-title" class="title mb-3">You reached Level {{ reward.levelAfter }}</h2>

          <ul v-if="newGames.length || newAreas.length" class="unlocks list-unstyled text-start mb-4">
            <li v-for="name in newGames" :key="`game-${name}`">
              <i class="fa-solid fa-puzzle-piece icon green"></i>
              <span><small>New game</small>{{ name }}</span>
            </li>
            <li v-for="name in newAreas" :key="`area-${name}`">
              <i class="fa-solid fa-map-location-dot icon blue"></i>
              <span><small>New area</small>{{ name }}</span>
            </li>
          </ul>

          <button class="continue-btn" @click="backToMap">
            Back to map<i class="fa-solid fa-map-location-dot ms-2"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Colours from the dashboard (views/main.vue), set here because the pop-up sits outside the page */
.overlay {
    --card: #fffbf0;
    --ink: #2a2018;
    --ink-soft: #6b5d4d;
    --terracotta: #a64f31;
    --terracotta-deep: #7d3a22;
    --green: #4f7f55;
    --blue: #3b5f94;
    --gold: #e5b93c;
    --dash: #d8cba8;

    position: fixed;
    inset: 0;
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(42, 32, 24, 0.55);
    overflow: hidden;
    font-family: "Nunito Sans", system-ui, sans-serif;
    color: var(--ink);
}

/* Dashed "stitched" card, same as the dashboard cards */
.level-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    padding: 2rem 1.75rem 1.75rem;
    background: var(--card);
    border: 1px solid var(--dash);
    border-radius: 26px;
    box-shadow: 0 18px 40px rgba(42, 32, 24, 0.3);
}

.level-card::before {
    content: "";
    position: absolute;
    inset: 7px;
    border: 2px dashed var(--dash);
    border-radius: 20px;
    pointer-events: none;
}

/* Star with the new level number on it */
.level-badge {
    position: relative;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: badge-bounce 0.8s 0.15s both;
}

.level-badge i {
    position: absolute;
    font-size: 96px;
    color: var(--gold);
    filter: drop-shadow(0 4px 0 #c49a24);
}

.level-badge span {
    position: relative;
    margin-top: 8px;
    font-family: "Fraunces", Georgia, serif;
    font-size: 34px;
    font-weight: 700;
    color: var(--ink);
}

.eyebrow {
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--terracotta);
}

.title {
    font-family: "Fraunces", Georgia, serif;
    font-size: 1.9rem;
    font-weight: 700;
    line-height: 1.2;
}

/* What the new level unlocked */
.unlocks li {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--dash);
    border-radius: 14px;
    background: #fff;
    font-size: 1.15rem;
    font-weight: 700;
}

.unlocks li + li {
    margin-top: 0.6rem;
}

.unlocks small {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-soft);
}

.icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: #fff;
    font-size: 1.2rem;
}

.icon.green { background: var(--green); }
.icon.blue { background: var(--blue); }

/* Terracotta button, same as the dashboard's main button */
.continue-btn {
    width: 100%;
    min-height: 56px;
    padding: 0.9rem 2rem;
    border: 0;
    border-radius: 16px;
    background: var(--terracotta);
    color: #fff;
    font-size: 1.25rem;
    font-weight: 800;
    box-shadow: 0 5px 0 var(--terracotta-deep);
    transition: transform 0.08s, box-shadow 0.08s;
}

.continue-btn:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 var(--terracotta-deep);
}

.continue-btn:focus-visible {
    outline: 3px solid var(--blue);
    outline-offset: 3px;
}

/* Paper confetti falling from the top */
.confetti span {
    position: absolute;
    top: -20px;
    width: 10px;
    height: 16px;
    border-radius: 2px;
    animation-name: confetti-fall;
    animation-timing-function: ease-in;
    animation-fill-mode: forwards;
}

/* Card pops in, background fades in */
.level-up-enter-active { transition: opacity 0.3s ease; }
.level-up-leave-active { transition: opacity 0.2s ease; }
.level-up-enter-from,
.level-up-leave-to { opacity: 0; }
.level-up-enter-active .level-card { animation: card-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes card-pop {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
}

@keyframes badge-bounce {
    0%   { transform: scale(0) rotate(-30deg); }
    60%  { transform: scale(1.15) rotate(8deg); }
    100% { transform: scale(1) rotate(0); }
}

@keyframes confetti-fall {
    to { transform: translateY(110vh) rotate(540deg); opacity: 0; }
}

/* Players who turn off motion in their device settings get no animation */
@media (prefers-reduced-motion: reduce) {
    .level-badge,
    .level-up-enter-active .level-card { animation: none; }
    .confetti { display: none; }
}
</style>
