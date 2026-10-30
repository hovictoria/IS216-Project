<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/journey.vue
purpose:    - the Journey tab (/journey): the daily home page (design handoff 14/15 + laptop 05-WebJourney)
            - trip in progress (from stores/journey.js) with Resume, today's challenge (play at 2 places,
              +50 coins), Puzzle of the day (one of our 6 games, extra coins once a day), This week (days
              played), places played this week, Spirits found, and Play anytime (practice, no coins)
            - the numbers come from GET /api/journey (server/routes/journey.js); the server pays the bonuses
            - phone: 2 columns · laptop (1024px+): 4-column glass bento
note:       this replaced the old dashboard (/menu now redirects here)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNav from '@/components/ui/AppNav.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import ChestCanvas from '@/components/ui/ChestCanvas.vue'
import CoinIcon from '@/components/ui/CoinIcon.vue'
import SplashScene from '@/components/auth/scene/SplashScene.vue'
import { GAME_LABELS } from '@/data/placeLabels'
import { useJourneyStore } from '@/stores/journey'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import { greeting as timeGreeting } from '@/lib/useMood'
import mapBackground from '@/assets/spirits-map-bg.webp'

const router = useRouter()
const journey = useJourneyStore()
const auth = useAuthStore()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const data = ref(null)          // GET /api/journey
const loading = ref(true)
const errorMsg = ref('')

// Play anytime: our 6 games, each with the skill it trains and a tile colour
const GAMES = [
    { id: 'memory', skill: 'Memory', tone: 'peach' },
    { id: 'sequence', skill: 'Sequencing', tone: 'sage' },
    { id: 'missing', skill: 'Recall', tone: 'butter' },
    { id: 'pattern', skill: 'Reasoning', tone: 'lilac' },
    { id: 'object', skill: 'Spotting', tone: 'sky' },
    { id: 'oddoneout', skill: 'Attention', tone: 'coral' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// "Good morning, Ariq" (follows the day / night look, lib/useMood.js)
const greeting = computed(() => {
    const name = auth.user?.user_metadata?.display_name
    return name ? `${timeGreeting.value}, ${name}` : timeGreeting.value
})

// hours until midnight in Singapore, when today's challenge and puzzle reset
const hoursLeft = computed(() => {
    const [h, m] = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour12: false }).split(':').map(Number)
    return Math.max(1, Math.ceil(24 - h - m / 60))
})

// the progress ring around "1/2": how much of the circle is drawn
const RING = 2 * Math.PI * 26
const ringDash = computed(() => {
    const c = data.value?.challenge
    return c ? `${(c.done / c.goal) * RING} ${RING}` : `0 ${RING}`
})

const challengeTitle = computed(() => `Play at ${data.value?.challenge.goal ?? 2} places`)

function resumeTrip() {
    journey.minimised = false
    router.push('/map')
}

onMounted(async () => {
    try {
        const { data: answer } = await api.get('/journey')
        data.value = answer
    } catch (e) {
        errorMsg.value = 'We couldn’t load your journey. Please try again.'
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="journey-page">
        <!-- background: the blurred map with peach + sage glows -->
        <div class="backdrop" aria-hidden="true">
            <img :src="mapBackground" alt="" class="backdrop-map" />
            <span class="glow glow-peach"></span>
            <span class="glow glow-sage"></span>
        </div>

        <!-- the 3D island, top-right (scrolls away with the page) -->
        <div class="island" aria-hidden="true">
            <SplashScene :reduced-motion="reducedMotion" />
        </div>

        <p class="wordmark">MemoryGo</p>

        <main class="content">
            <p class="greeting">{{ greeting }}</p>
            <h1 class="title">Your <HandUnderline>journey</HandUnderline></h1>

            <p v-if="loading" class="note">Loading your journey…</p>
            <p v-else-if="errorMsg" class="note" role="alert">{{ errorMsg }}</p>

            <div v-else class="bento" :class="{ 'has-trip': journey.active }">
                <!-- trip in progress (only while there is one) -->
                <section v-if="journey.active" class="box trip">
                    <span class="live" aria-hidden="true"></span>
                    <div class="trip-text">
                        <p class="trip-title">On your way to {{ journey.trip.destination.name }}</p>
                        <p class="trip-next">
                            {{ journey.nextStop ? `Next: ${journey.nextStop.name}` : 'No more games on the way' }}
                        </p>
                    </div>
                    <button type="button" class="trip-btn" @click="resumeTrip">Resume</button>
                </section>

                <!-- today's challenge -->
                <section class="box challenge">
                    <span class="chip-dark">Today’s challenge</span>
                    <div class="challenge-row">
                        <svg class="ring" viewBox="0 0 64 64" role="img"
                            :aria-label="`${data.challenge.done} of ${data.challenge.goal} places played today`">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(22,20,18,0.15)" stroke-width="7" />
                            <circle cx="32" cy="32" r="26" fill="none" stroke="#161412" stroke-width="7"
                                stroke-linecap="round" :stroke-dasharray="ringDash" transform="rotate(-90 32 32)" />
                            <text x="32" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="#161412">
                                {{ data.challenge.done }}/{{ data.challenge.goal }}
                            </text>
                        </svg>
                        <h2 class="challenge-title">{{ challengeTitle }}</h2>
                    </div>
                    <p class="challenge-reward">
                        <CoinIcon :size="16" />
                        <template v-if="data.challenge.claimed">Done today · +{{ data.challenge.bonus }} coins earned</template>
                        <template v-else>+{{ data.challenge.bonus }} coins · bonus chest · {{ hoursLeft }} h left</template>
                    </p>
                    <PrimaryButton class="challenge-btn" to="/map">Find spots near me</PrimaryButton>
                    <ChestCanvas class="challenge-chest" />
                </section>

                <!-- Puzzle of the day -->
                <section class="box puzzle">
                    <p class="box-label">Puzzle of the day</p>
                    <h2 class="box-title">{{ GAME_LABELS[data.puzzle.game] }}</h2>
                    <p class="box-sub">
                        {{ data.puzzle.done ? 'Done today ✓' : `+${data.puzzle.bonus} bonus coins today` }}
                    </p>
                    <RouterLink class="play-btn"
                        :to="data.puzzle.done ? `/games/${data.puzzle.game}` : `/games/${data.puzzle.game}?puzzle=1`">
                        {{ data.puzzle.done ? 'Play again' : 'Play' }}
                    </RouterLink>
                </section>

                <!-- This week: days played -->
                <section class="box week">
                    <p class="box-label">This week</p>
                    <p class="big-number">{{ data.daysThisWeek }}<span>/7 days</span></p>
                    <ol class="days" aria-label="Days played this week">
                        <li v-for="(played, i) in data.week" :key="i" :class="{ played }"
                            :aria-label="`${DAYS[i]}: ${played ? 'played' : 'not played'}`"></li>
                    </ol>
                </section>

                <section class="box stat stat-places">
                    <p class="big-number">{{ data.placesThisWeek }}</p>
                    <p class="box-sub">{{ data.placesThisWeek === 1 ? 'place' : 'places' }} played this week</p>
                </section>

                <RouterLink to="/spirits" class="box stat stat-link stat-spirits">
                    <p class="big-number">{{ data.spiritsFound }}</p>
                    <p class="box-sub">Spirits found</p>
                </RouterLink>
            </div>

            <!-- Play anytime: practice from anywhere, no coins -->
            <div class="anytime-head">
                <h2 class="anytime-title">Play <HandUnderline>anytime</HandUnderline></h2>
                <p class="anytime-note">Practice · no coins</p>
            </div>
            <ul class="games">
                <li v-for="g in GAMES" :key="g.id">
                    <RouterLink :to="`/games/${g.id}`" class="game" :class="`tone-${g.tone}`">
                        <span class="game-skill">{{ g.skill }}</span>
                        <span class="game-name">{{ GAME_LABELS[g.id] }}</span>
                        <svg class="game-arrow" viewBox="0 0 46 24" aria-hidden="true" fill="none" stroke="currentColor"
                            stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
                        </svg>
                    </RouterLink>
                </li>
            </ul>
        </main>

        <AppNav :coins="data?.coins ?? null" />
    </div>
</template>

<style scoped>
/* =========================================================
   Page + background
   ========================================================= */
.journey-page {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font);
}

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.backdrop-map {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(18px) saturate(1.3);
    opacity: 0.55;
    transform: scale(1.3);
}

.glow {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    filter: blur(60px);
}

.glow-peach { top: 160px; left: -100px; background: var(--peach); opacity: 0.7; }
.glow-sage { bottom: -60px; right: -100px; background: var(--sage, #C8DBA9); opacity: 0.8; }

/* the island: a box at the top-right; SplashScene fills it */
.island {
    position: absolute;
    top: -10px;
    right: -70px;
    z-index: 1;
    width: 300px;
    height: 300px;
    pointer-events: none;
}

.wordmark {
    display: none;
}

.content {
    position: relative;
    z-index: 2;
    max-width: 720px;
    margin: 0 auto;
    padding: 28px 20px 130px;          /* bottom: room for the phone's bottom nav */
}

.greeting {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
}

.title {
    margin: 4px 0 28px;
    max-width: 200px;                  /* "Your / journey" on two lines beside the island, like the design */
    font-family: var(--font);          /* the app font (not the browser's heading font) */
    font-size: 54px;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.06em;
}

.note {
    margin: 16px 0;
    font-size: 17px;
    font-weight: 600;
}

/* =========================================================
   Bento: phone = 2 columns
   ========================================================= */
.bento {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

/* glass recipe from the design */
.box {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.5);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 30px rgba(22, 20, 18, 0.12);
    color: var(--ink);
    text-decoration: none;
}

.box-label {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    opacity: 0.75;
}

.box-title {
    margin: 0;
    font-family: var(--font);
    font-size: 24px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.04em;
}

.box-sub {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.big-number {
    margin: 0;
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.06em;
}

.big-number span {
    margin-left: 2px;
    font-size: 18px;
    letter-spacing: -0.02em;
}

/* ---------- trip in progress (dark glass) ---------- */
.trip {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    background: rgba(58, 51, 45, 0.78);
    color: var(--white);
}

.live {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #8FD18B;
}

.trip-text {
    flex: 1;
    min-width: 0;
}

.trip-title,
.trip-next {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.trip-title {
    font-size: 17px;
    font-weight: 800;
}

.trip-next {
    font-size: 16px;
    font-weight: 600;
    opacity: 0.85;
}

.trip-btn {
    flex-shrink: 0;
    min-height: 48px;
    padding: 0 20px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--peach);
    color: var(--ink);
    font: 800 17px var(--font);
    cursor: pointer;
}

/* ---------- today's challenge (peach glass) ---------- */
.challenge {
    grid-column: 1 / -1;
    gap: 12px;
    background: rgba(246, 196, 164, 0.6);
}

.chip-dark {
    align-self: flex-start;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 16px;
    font-weight: 800;
}

.challenge-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-right: 90px;               /* room for the chest */
}

.ring {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
}

.challenge-title {
    margin: 0;
    font-family: var(--font);
    font-size: 30px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.05em;
}

.challenge-reward {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 16px;
    font-weight: 700;
}

.challenge-chest {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 110px;
    height: 110px;
}

/* ---------- puzzle + week ---------- */
.puzzle {
    justify-content: space-between;
}

.play-btn {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    margin-top: 10px;
    padding: 0 22px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 17px;
    font-weight: 800;
    text-decoration: none;
}

.days {
    display: flex;
    gap: 6px;
    margin: auto 0 0;
    padding: 6px 0 0;
    list-style: none;
}

.days li {
    width: 16px;
    height: 16px;
    border: 1.5px solid rgba(22, 20, 18, 0.45);
    border-radius: 50%;
}

.days li.played {
    border-color: var(--ink);
    background: var(--ink);
}

.stat {
    justify-content: flex-end;
    min-height: 120px;
}

/* =========================================================
   Play anytime
   ========================================================= */
.anytime-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 36px 0 14px;
}

.anytime-title {
    margin: 0;
    font-family: var(--font);
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.055em;
}

.anytime-note {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    opacity: 0.8;
}

.games {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.games > li {
    display: flex;
}

.game {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-height: 130px;
    padding: 16px 16px 44px;
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 30px rgba(22, 20, 18, 0.1);
    color: var(--ink);
    text-decoration: none;
}

/* tinted glass, one colour per game */
.tone-peach { background: rgba(246, 196, 164, 0.7); }
.tone-sage { background: rgba(200, 219, 169, 0.7); }
.tone-butter { background: rgba(243, 213, 124, 0.7); }
.tone-lilac { background: rgba(201, 184, 245, 0.6); }
.tone-sky { background: rgba(169, 205, 232, 0.7); }
.tone-coral { background: rgba(233, 160, 140, 0.6); }

.game-skill {
    font-size: 16px;
    font-weight: 700;
    opacity: 0.75;
}

.game-name {
    font-size: 21px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.game-arrow {
    position: absolute;
    right: 16px;
    bottom: 14px;
    width: 34px;
    height: 18px;
}

/* =========================================================
   Mouse users: cards lift a little on hover
   ========================================================= */
.stat-link,
.game,
.play-btn {
    transition: transform 0.18s ease;
}

@media (hover: hover) {
    .stat-link:hover,
    .game:hover {
        transform: translateY(-4px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .stat-link,
    .game,
    .play-btn {
        transition: none;
    }
    .stat-link:hover,
    .game:hover {
        transform: none;
    }
}

/* =========================================================
   iPad: a bit more room, nav at the top-right
   ========================================================= */
@media (min-width: 768px) {
    .content {
        padding: 100px 32px 40px;
    }

    .island {
        top: 70px;
        right: 0;
        width: 360px;
        height: 340px;
    }

    .title {
        max-width: none;
        font-size: 64px;
    }

    .games {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

/* =========================================================
   Laptop (laptop handoff 05-WebJourney): 4-column bento
   ========================================================= */
@media (min-width: 1024px) {
    .wordmark {
        display: block;
        position: absolute;
        top: 30px;
        left: 7%;
        z-index: 2;
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .content {
        max-width: none;
        padding: 110px 7% 60px;
    }

    .glow {
        width: 520px;
        height: 520px;
        filter: blur(80px);
    }

    .island {
        top: 60px;
        right: 2%;
        width: 460px;
        height: 420px;
    }

    .title {
        font-size: 76px;
        line-height: 0.9;
    }

    /* like the design: trip (or the challenge) top-left, puzzle + week top-right,
       challenge bottom-left, places + spirits bottom-right */
    .bento {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-template-areas:
            "challenge challenge puzzle week"
            "challenge challenge places spirits";
        gap: 16px;
    }

    .bento.has-trip {
        grid-template-areas:
            "trip trip puzzle week"
            "challenge challenge places spirits";
    }

    .trip { grid-area: trip; padding: 24px; }
    .puzzle { grid-area: puzzle; }
    .week { grid-area: week; }
    .stat-places { grid-area: places; }
    .stat-spirits { grid-area: spirits; }

    .challenge {
        grid-area: challenge;
        justify-content: center;
        padding: 24px;
    }

    .challenge-title {
        font-size: 38px;
    }

    .challenge-chest {
        top: 14px;
        right: 14px;
        width: 140px;
        height: 140px;
    }

    .challenge-btn {
        align-self: flex-start;
    }

    .stat {
        min-height: 160px;
    }

    .games {
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 16px;
    }
}
</style>
