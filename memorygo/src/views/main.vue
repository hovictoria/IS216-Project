<script setup>
import { ref, computed, watch,onBeforeUnmount } from "vue";
import AppMenu from "@/components/menu.vue";
import heroImg from "@/assets/bg.png";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore()

const router = useRouter();

/* ---------- Data (replace with real data from your store / API) ---------- */
const username = auth.user.user_metadata.display_name;
const now = new Date();

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Which days this week the person has played (Mon..Sun). Replace with real data.
const played = ref([true, true, true, false, false, false, false]);

const game = { name: "Memory Match", minutes: 3 };

const walk = {
  stops: [
    { name: "Toa Payoh Town Park", kind: "Park", distance: "1.2 km" },
    { name: "Toa Payoh Lor 8 Market & Food Centre", kind: "Hawker centre", distance: "900 m" },
  ],
  total: "About 1.9 km · 30 min walk",
};

/* ---------- Derived values ---------- */
const hour = now.getHours();
const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

const dateLabel = computed(() => {
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${weekday}, ${rest}`;
});

// Monday = 0 … Sunday = 6
const todayIdx = (now.getDay() + 6) % 7;

// Consecutive played days immediately before today
const streak = computed(() => {
  let count = 0;
  for (let i = todayIdx - 1; i >= 0 && played.value[i]; i--) count++;
  return count;
});

const dayLabel = (n) => `${n} ${n === 1 ? "day" : "days"}`;

const streakMessage = computed(() =>
  streak.value === 0
    ? "Play today to start your streak."
    : `You've played ${dayLabel(streak.value)} in a row. Play today to make it ${streak.value + 1}.`
);

/* ---------- Read aloud ---------- */
const readAloud = ref(true);
const mainEl = ref(null);
const speaking = ref(false);

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  speaking.value = false;
}

function speakPage() {
  if (!("speechSynthesis" in window) || !mainEl.value) return;

  // Second click stops it
  if (speaking.value) {
    stopSpeaking();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(mainEl.value.innerText);
  utterance.rate = 0.9;
  utterance.onend = () => (speaking.value = false);
  utterance.onerror = () => (speaking.value = false);

  speaking.value = true;
  window.speechSynthesis.speak(utterance);
}

// Turning the sidebar switch off also stops it
watch(readAloud, (on) => {
  if (!on) stopSpeaking();
});

// Don't keep talking after leaving the page
onBeforeUnmount(stopSpeaking);

function startGame() {
  router.push("/games")
}
</script>

<template>
  <div class="app-shell">
    <AppMenu v-model:readAloud="readAloud">
      <template #mobile-actions>
        <button type="button" class="read-pill in-header" @click="speakPage">
          <i class="fa-solid" :class="speaking ? 'fa-stop' : 'fa-volume-high'" aria-hidden="true"></i>
          <span>{{ speaking ? "Stop" : "Read aloud" }}</span>
        </button>
      </template>
    </AppMenu>


    <!-- Main -->
    <main class="main" ref="mainEl">
      <!-- Hero banner -->
      <div class="hero">
        <img :src="heroImg" alt="" class="hero-img" />

        <button type="button" class="read-pill d-none d-md-inline-flex" @click="speakPage">
          <i class="fa-solid" :class="speaking ? 'fa-stop' : 'fa-volume-high'" aria-hidden="true"></i>
          <span>{{ speaking ? "Stop" : "Read aloud" }}</span>
        </button>
      </div>
      <div class="content">
        <div class="row g-4">
          <!-- Left column -->
          <div class="col-lg-7">
            <p class="date">{{ dateLabel }}</p>
            <h1>{{ greeting }}, {{ username }}</h1>
            <p class="lead-text">
              Here's your plan for today. There are just two things to do, and there's no rush.
              Click the big button when you're ready.
            </p>

            <section class="card-soft" aria-labelledby="plan-title">
              <h2 id="plan-title" class="card-title mb-2">Today's plan</h2>
              <ol class="steps list-unstyled m-0">
                <li class="step">
                  <span class="step-num filled">1</span>
                  <div>
                    <div class="step-title">Play today's game</div>
                    <div class="step-sub">{{ game.name }} · about {{ game.minutes }} minutes</div>
                  </div>
                </li>
                <li class="step">
                  <span class="step-num outlined">2</span>
                  <div>
                    <div class="step-title">Take a walk to {{ walk.stops[0].name }}</div>
                    <div class="step-sub">
                      {{ walk.stops[0].distance }} from home. Your phone will show you the way.
                    </div>
                  </div>
                </li>
              </ol>
            </section>

            <button type="button" class="btn-cta mt-2" @click="startGame">
              <span>Start today's game</span>
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>

            <p class="streak-note mx-5 mx-sm-0">
              <i class="fa-solid fa-seedling" aria-hidden="true"></i>
              <span>
                {{ streak === 0 ? "Play today to start your streak." : `You've played ${dayLabel(streak)} in a row.` }}
              </span>
            </p>
          </div>

          <!-- Right column -->
          <div class="col-lg-5">
            <section class="card-soft mb-4" aria-labelledby="week-title">
              <h2 id="week-title" class="card-title mb-2">This week</h2>
              <ul class="week list-unstyled m-0">
                <li v-for="(d, i) in weekDays" :key="d" class="week-day">
                  <span
                    class="day-dot"
                    :class="{ done: played[i], today: i === todayIdx && !played[i] }"
                    :aria-label="played[i] ? `${d}: played` : i === todayIdx ? `${d}: today` : `${d}: not played`"
                  >
                    <i v-if="played[i]" class="fa-solid fa-check" aria-hidden="true"></i>
                  </span>
                  <span :class="{ 'fw-bold text-ink': i === todayIdx }">{{ i === todayIdx ? "Today" : d }}</span>
                </li>
              </ul>
              <p class="mb-0 mt-3">{{ streakMessage }}</p>
            </section>

            <section class="card-soft" aria-labelledby="walk-title">
              <h2 id="walk-title" class="card-title mb-2">Your walk plan</h2>
              <ol class="steps list-unstyled m-0">
                <li v-for="(stop, i) in walk.stops" :key="stop.name" class="step">
                  <span class="step-num dark">{{ i + 1 }}</span>
                  <div>
                    <div class="step-title">{{ stop.name }}</div>
                    <div class="step-sub">{{ stop.kind }} · {{ stop.distance }} from home</div>
                  </div>
                </li>
              </ol>
              <p class="mt-3 mb-3 text-muted-ink">{{ walk.total }}</p>
              <router-link to="/map" class="text-link">
                <span>Open the map</span>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </router-link>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<!-- Shared design tokens and components.
     Move this block into a global stylesheet (e.g. src/assets/theme.css)
     so Map, Spirits and Me pages look the same. -->
<style>
@import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Nunito+Sans:wght@400;600;700;800&display=swap");

:root {
  --bg: #fbf5e6;
  --sidebar: #efe6d2;
  --card: #fffbf0;
  --ink: #2a2018;
  --ink-soft: #6b5d4d;
  --terracotta: #a64f31;
  --terracotta-deep: #7d3a22;
  --green: #4f7f55;
  --blue: #3b5f94;
  --gold: #f3d97a;
  --dash: #d8cba8;

  --bs-body-bg: var(--bg);
  --bs-body-color: var(--ink);
  --bs-body-font-family: "Nunito Sans", system-ui, sans-serif;
  --bs-body-font-size: 1.125rem; /* 18px base for readability */
  --bs-body-line-height: 1.5;
}

h1,
h2,
.brand {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  color: var(--ink);
}

:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}

/* Dashed "stitched" card */
.card-soft {
  position: relative;
  background: var(--card);
  border: 1px solid var(--dash);
  border-radius: 26px;
  padding: 1.5rem 1.75rem;
}
.card-soft::before {
  content: "";
  position: absolute;
  inset: 7px;
  border: 2px dashed var(--dash);
  border-radius: 20px;
  pointer-events: none;
}
.card-title {
  font-size: 1.6rem;
  margin: 0 0 1rem;
}

/* Primary call-to-action */
.btn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 28rem;
  background: var(--terracotta);
  color: #fff;
  border: 0;
  border-radius: 16px;
  padding: 1.05rem 2rem;
  font-size: 1.25rem;
  font-weight: 800;
  box-shadow: 0 5px 0 var(--terracotta-deep);
  transition: transform 0.08s, box-shadow 0.08s;
}
.btn-cta:hover {
  background: #b55737;
}
.btn-cta:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 var(--terracotta-deep);
}
@media (prefers-reduced-motion: reduce) {
  .btn-cta {
    transition: none;
  }
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--blue);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
}
.text-muted-ink {
  color: var(--ink-soft);
}
.text-ink {
  color: var(--ink);
}
</style>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg);
}

/* ---------- Main ---------- */
.main {
  min-height: 100vh;
}

.hero {
  position: relative;
  height: 180px;
  overflow: hidden;
}
.hero-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
}
.read-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--dash);
  border-radius: 999px;
  background: var(--card);
  color: var(--ink);
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(80, 55, 20, 0.12);
}
.read-pill i {
  color: var(--blue);
}

/* Desktop: floats over the hero image */
.hero .read-pill {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  padding: 0.7rem 1.35rem;
}
.content {
  padding: 1.5rem 1.5rem 2.5rem;
  max-width: 1100px;
  margin: 0 auto;
}

.date {
  margin: 0 0 0.35rem;
  font-weight: 800;
  color: var(--ink-soft);
}
h1 {
  font-size: clamp(2rem, 4.5vw, 2.9rem);
  line-height: 1.1;
  margin: 0 0 1rem;
  max-width: 14ch;
}
.lead-text {
  max-width: 34rem;
  margin-bottom: 1.5rem;
}

.streak-note {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 1.1rem 0 0;
}
.streak-note i {
  color: var(--green);
}

/* ---------- Numbered steps ---------- */
.steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
.step-num {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  font-size: 1.15rem;
}
.step-num.filled {
  background: var(--terracotta);
  color: #fff;
}
.step-num.outlined {
  border: 2px solid var(--blue);
  color: var(--blue);
}
.step-num.dark {
  width: 36px;
  height: 36px;
  background: var(--ink);
  color: #fff;
  font-size: 1rem;
}
.step-title {
  font-weight: 800;
  line-height: 1.25;
}
.step-sub {
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1.35;
}

/* ---------- Week tracker ---------- */
.week {
  display: flex;
  justify-content: space-between;
  gap: 0.25rem;
}
.week-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.95rem;
  color: var(--ink-soft);
}
.day-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px dashed var(--dash);
  color: #fff;
}
.day-dot.done {
  background: var(--green);
  border: 2px solid var(--green);
}
.day-dot.today {
  background: var(--gold);
  border: 3px solid #e1b93f;
  box-shadow: 0 0 0 3px var(--card), 0 0 0 5px #e1b93f;
}

/* ---------- Breakpoints ---------- */
@media (min-width: 768px) {
  .main {
    margin-left: 250px;
  }
}
@media (max-width: 767px) {
  .main {
    min-height: auto;
    padding-bottom: 90px;
  }
  .hero {
    height: 90px;
  }
  .content {
    padding: 1.25rem 1rem 1.5rem;
  }
  .card-soft {
    padding: 1.25rem 1.25rem;
  }
  .btn-cta {
    max-width: none;
  }
}
</style>