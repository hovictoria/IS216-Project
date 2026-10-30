<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/RoutePanel.vue
purpose:    - what the sheet (phone) / sidebar (iPad, laptop) shows after you pick a place
            - stage "preview" (prototype 07-PlacePreview): name, what it is, how far, its description,
              "Take me there"
            - stage "route" (prototype 09-Route), like Google Maps: Transit | Walk, up to 3 options
              (minutes, the MRT lines / buses, walking, transfers, "N games on the way"), then the chosen
              option step by step, and the MemoryGo places on the way, numbered like their pins on the map
            - directions come from our server: GET /api/route (OneMap routing, server/routes/route.js)
            - "Start journey" starts the live journey (stores/journey.js, JourneyHud.vue). It needs your real
              location, except while running `pnpm run dev` (demo mode can walk the route for you)
props:      destination { name, sub, fact, url, lat, lng, placeId?, spiritHidden? }, userPos ([lng, lat]), knowsLocation
emits:      close, show-route (the chosen option, or null → the map draws it / clears it),
            start { mode, option } (Start journey),
            focus (an { lng, lat } to centre on, when a step or stop is tapped)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/lib/api'
import { distanceM, distanceLabel } from '@/lib/geo'
import { MRT_LINE_NAMES, lineColour } from '@/data/placeLabels'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import ChestCanvas from '@/components/ui/ChestCanvas.vue'

const props = defineProps({
    destination: { type: Object, required: true },
    userPos: { type: Array, required: true },
    knowsLocation: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'show-route', 'focus', 'start'])

const stage = ref('preview')             // 'preview' | 'route'
const mode = ref('transit')              // 'transit' | 'walk'
const status = ref('idle')               // 'idle' | 'loading' | 'error'
const errorMessage = ref('')
const options = ref([])
const chosen = ref(0)

// a journey follows your real location; while developing, demo mode can stand in for it
const canStart = computed(() => props.knowsLocation || import.meta.env.DEV)

const distance = computed(() => distanceM(props.userPos, [props.destination.lng, props.destination.lat]))
const selected = computed(() => options.value[chosen.value] ?? null)

// a new place picked: back to its preview
watch(() => props.destination, () => {
    stage.value = 'preview'
    options.value = []
    emit('show-route', null)
})

// the map always draws the option you're looking at
watch(selected, (option) => emit('show-route', option))

async function loadRoute() {
    stage.value = 'route'
    status.value = 'loading'
    options.value = []
    chosen.value = 0
    const [lng, lat] = props.userPos
    try {
        const { data } = await api.get('/route', {
            params: {
                from: `${lat},${lng}`,
                to: `${props.destination.lat},${props.destination.lng}`,
                mode: mode.value,
                name: props.destination.name,
            },
        })
        options.value = data.options
        status.value = 'idle'
    } catch (error) {
        errorMessage.value = error.response?.data?.message ?? 'Couldn’t get directions. Please try again.'
        status.value = 'error'
    }
}

function setMode(next) {
    if (mode.value === next) return
    mode.value = next
    loadRoute()
}

function close() {
    emit('show-route', null)
    emit('close')
}

// ---------- How each part of a trip is described ----------
const lineName = (line) => MRT_LINE_NAMES[line] ?? `${line} line`
const stopWord = (n) => (n === 1 ? '1 stop' : `${n} stops`)

function stepText(leg) {
    if (leg.mode === 'walk') return `Walk ${leg.minutes} min to ${leg.to.name}`
    const stops = stopWord(leg.passes.length + 1)
    if (leg.mode === 'bus') return `Bus ${leg.line} · ${stops} to ${leg.to.name}`
    return `${lineName(leg.line)} · ${stops} to ${leg.to.name}`
}

// the little chain on each option: 🚶 › DT › 155 › 🚶 (very short walks are left out)
const chain = (option) => option.legs.filter((leg) => leg.mode !== 'walk' || leg.minutes >= 2)
const gamesLabel = (n) => (n === 1 ? '1 game on the way' : `${n} games on the way`)
const WHY = { 'get on': 'Get on here', 'get off': 'Get off here', 'walk past': 'You walk past' }
</script>

<template>
    <section class="route-panel" aria-live="polite">
        <!-- top: where to, and a close button -->
        <header class="head">
            <div class="head-text">
                <p class="eyebrow">{{ stage === 'preview' ? 'Place' : 'Directions to' }}</p>
                <h2 class="title">{{ destination.name }}</h2>
                <p class="sub">
                    {{ [destination.sub, knowsLocation ? distanceLabel(distance) : null].filter(Boolean).join(' · ') }}
                </p>
            </div>
            <button type="button" class="close" aria-label="Close" @click="close">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"
                    stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
            </button>
        </header>

        <!-- ================= Preview ================= -->
        <template v-if="stage === 'preview'">
            <p v-if="destination.spiritHidden" class="spirit-hint">
                <ChestCanvas class="spirit-hint-chest" />
                <span><strong>A Spirit is hiding here.</strong> Play a game here to find it.</span>
            </p>
            <p v-if="destination.fact" class="fact">{{ destination.fact }}</p>
            <a v-if="destination.url" class="read-more" :href="destination.url" target="_blank" rel="noopener">
                Read more on Roots.sg
            </a>
            <PrimaryButton class="go" @click="loadRoute">Take me there</PrimaryButton>
            <p v-if="!knowsLocation" class="note">Your location is off, so directions start from the SMU area.</p>
        </template>

        <!-- ================= Route ================= -->
        <template v-else>
            <div class="modes" role="group" aria-label="How to get there">
                <button type="button" class="mode" :class="{ active: mode === 'transit' }" :aria-pressed="mode === 'transit'"
                    @click="setMode('transit')">MRT & bus</button>
                <button type="button" class="mode" :class="{ active: mode === 'walk' }" :aria-pressed="mode === 'walk'"
                    @click="setMode('walk')">Walk</button>
            </div>

            <p v-if="status === 'loading'" class="note">Finding the best ways there…</p>
            <div v-else-if="status === 'error'" class="note" role="alert">
                {{ errorMessage }}
                <button type="button" class="retry" @click="loadRoute">Try again</button>
            </div>

            <template v-else>
                <!-- the options, like Google Maps -->
                <div class="options">
                    <button v-for="(option, i) in options" :key="i" type="button" class="option"
                        :class="{ active: i === chosen }" :aria-pressed="i === chosen" @click="chosen = i">
                        <span class="option-top">
                            <span class="minutes">{{ option.minutes }} min</span>
                            <span class="chain">
                                <template v-for="(leg, j) in chain(option)" :key="j">
                                    <span v-if="j > 0" class="sep" aria-hidden="true">›</span>
                                    <span v-if="leg.mode === 'walk'" class="leg-walk">Walk</span>
                                    <span v-else-if="leg.mode === 'train'" class="leg-chip"
                                        :style="{ background: lineColour(leg.line) }">{{ leg.line }}</span>
                                    <span v-else class="leg-chip leg-bus">{{ leg.line }}</span>
                                </template>
                            </span>
                        </span>
                        <span class="option-sub">
                            {{ option.walkMeters }} m walk{{ mode === 'transit' ? ` · ${option.transfers} change${option.transfers === 1 ? '' : 's'}` : '' }}
                        </span>
                        <span v-if="option.onTheWay.length" class="games">{{ gamesLabel(option.onTheWay.length) }}</span>
                    </button>
                </div>

                <!-- the chosen option, step by step -->
                <template v-if="selected">
                    <h3 class="section">Step by step</h3>
                    <ol class="steps">
                        <li v-for="(leg, i) in selected.legs" :key="i" class="step">
                            <button type="button" class="step-btn" @click="emit('focus', { lng: leg.from.lng, lat: leg.from.lat })">
                                <span class="step-icon" :class="`icon-${leg.mode}`"
                                    :style="leg.mode === 'train' ? { background: lineColour(leg.line) } : null">
                                    {{ leg.mode === 'walk' ? 'Walk' : leg.line }}
                                </span>
                                <span class="step-text">
                                    <span class="step-main">{{ stepText(leg) }}</span>
                                    <span v-if="leg.mode !== 'walk'" class="step-sub">
                                        From {{ leg.from.name }}{{ leg.from.code && leg.mode === 'train' ? ` (${leg.from.code})` : '' }} · {{ leg.minutes }} min
                                    </span>
                                    <span v-if="leg.mode === 'train' && leg.passes.length" class="step-sub">
                                        Passes {{ leg.passes.map((s) => s.name.replace(/ MRT Station$/, '')).join(', ') }}
                                    </span>
                                </span>
                            </button>
                        </li>
                    </ol>

                    <h3 class="section">On your way</h3>
                    <p v-if="selected.onTheWay.length === 0" class="note">
                        No MemoryGo places on this route. Try another option, or walk.
                    </p>
                    <ol v-else class="stops">
                        <li v-for="(stop, i) in selected.onTheWay" :key="stop.id">
                            <button type="button" class="stop" @click="emit('focus', { lng: stop.lng, lat: stop.lat })">
                                <span class="stop-number">{{ i + 1 }}</span>
                                <span class="stop-text">
                                    <span class="stop-name">{{ stop.name }}</span>
                                    <span class="stop-why">{{ WHY[stop.why] }}</span>
                                </span>
                            </button>
                        </li>
                    </ol>

                    <PrimaryButton class="go" :disabled="!canStart" @click="emit('start', { mode, option: selected })">
                        Start journey
                    </PrimaryButton>
                    <p v-if="!canStart" class="note">Turn on location to start a journey.</p>
                    <p class="note">Play the games when you stop, not while walking.</p>
                </template>
            </template>
        </template>
    </section>
</template>

<style scoped>
.route-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 20px 120px;            /* room for the phone's bottom nav */
    color: var(--ink);
    font-family: var(--font);
}

@media (min-width: 768px) {
    .route-panel {
        padding: 0 22px 24px;
    }
}

/* ---------- head ---------- */
.head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.head-text {
    flex: 1;
    min-width: 0;
}

.eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
}

.title {
    margin: 2px 0 4px;
    font-family: var(--font);           /* the app font (not the browser's heading font) */
    font-size: 30px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.sub {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
}

.close {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: rgba(22, 20, 18, 0.08);
    color: var(--ink);
    cursor: pointer;
}

.close svg {
    width: 20px;
    height: 20px;
}

/* ---------- preview ---------- */
/* "A Spirit is hiding here" (places with a Spirit the user hasn't found) */
.spirit-hint {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    padding: 10px 14px 10px 8px;
    border-radius: 20px;
    background: rgba(246, 196, 164, 0.55);
    font-size: 17px;
    line-height: 1.35;
}

.spirit-hint-chest {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
}

.fact {
    margin: 0;
    font-size: 17px;
    line-height: 1.45;
}

.read-more {
    align-self: flex-start;
    color: var(--ink);
    font-size: 16px;
    font-weight: 700;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
}

.go {
    margin-top: 4px;
}

.note {
    margin: 0;
    color: var(--muted);
    font-size: 16px;
    font-weight: 600;
}

.retry {
    margin-left: 8px;
    padding: 6px 14px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font: 700 15px var(--font);
    cursor: pointer;
}

/* ---------- Transit | Walk ---------- */
.modes {
    display: flex;
    gap: 4px;
    align-self: flex-start;
    padding: 4px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.7);
}

.mode {
    min-height: var(--tap-min);
    padding: 0 18px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font: 700 16px var(--font);
    cursor: pointer;
}

.mode.active {
    background: var(--ink);
    color: var(--white);
}

/* ---------- options ---------- */
.options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.option {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 14px 16px;
    border: 2px solid transparent;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.75);
    color: var(--ink);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.option.active {
    border-color: var(--ink);
    background: var(--white);
}

.option-top {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.minutes {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.chain {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

.sep {
    color: var(--muted);
    font-weight: 700;
}

.leg-walk {
    font-size: 15px;
    font-weight: 700;
}

.leg-chip {
    padding: 2px 8px;
    border-radius: 6px;
    color: var(--white);
    font-size: 14px;
    font-weight: 800;
}

.leg-bus {
    background: #3A332D;
}

.option-sub {
    color: var(--muted);
    font-size: 16px;
    font-weight: 600;
}

.games {
    align-self: flex-start;
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    background: var(--sage);
    font-size: 14px;
    font-weight: 700;
}

/* ---------- steps + stops ---------- */
.section {
    margin: 8px 0 0;
    font-family: var(--font);
    font-size: 20px;
    font-weight: 800;
}

.steps,
.stops {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.step-btn,
.stop {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 10px 8px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    color: var(--ink);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
}

.step-btn:hover,
.stop:hover {
    background: rgba(22, 20, 18, 0.06);
}

.step-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 48px;
    height: 30px;
    padding: 0 6px;
    border-radius: 8px;
    color: var(--white);
    font-size: 14px;
    font-weight: 800;
}

.icon-walk {
    background: rgba(22, 20, 18, 0.1);
    color: var(--ink);
}

.icon-bus {
    background: #3A332D;
}

.step-text,
.stop-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.step-main,
.stop-name {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.25;
}

.step-sub,
.stop-why {
    color: var(--muted);
    font-size: 15px;
    font-weight: 500;
}

.stop-number {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--user-blue);
    color: var(--white);
    font-size: 15px;
    font-weight: 800;
}
</style>
