<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/JourneyHud.vue
purpose:    - the live journey screen on top of the map (prototype 10-Journey, 11-JourneyArrived)
            - top: the trip's stops as numbered dots (✓ when done), then ONE card that changes:
                next stop   "Next game · Stop 1 of 3", its name, "140 m away"
                arrived     dark "You've arrived" card with Tap in / Not now (after 20 s in its zone)
                off route   "You're off the route" with Update route
                reached end "You've arrived at <destination>" with Finish
            - bottom: "To <destination> · 16 min left", progress bar, End journey (asks first), minimise
props:      trip, nextStop, arrived, reachedEnd, offRoute, progress, minutesLeft, nextStopMetres,
            tapping (a tap in is starting), message (the server's reason if tapping in failed),
            updating (a new route is loading)
emits:      tap-in(stop), skip, update-route, end, minimise
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed } from 'vue'
import { distanceLabel } from '@/lib/geo'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'

const props = defineProps({
    trip: { type: Object, required: true },
    nextStop: { type: Object, default: null },
    arrived: { type: Object, default: null },
    reachedEnd: { type: Boolean, default: false },
    offRoute: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    minutesLeft: { type: Number, default: 0 },
    nextStopMetres: { type: Number, default: null },
    tapping: { type: Boolean, default: false },
    message: { type: String, default: '' },
    updating: { type: Boolean, default: false },
    spiritHere: { type: Boolean, default: false },      // the arrived stop hides a Spirit they haven't found
})
const emit = defineEmits(['tap-in', 'skip', 'update-route', 'end', 'minimise'])

const confirming = ref(false)            // the "End this trip?" question is showing

const stopNumber = computed(() => (props.nextStop ? props.trip.stops.findIndex((s) => s.id === props.nextStop.id) + 1 : 0))
const isDone = (stop) => props.trip.doneIds.includes(stop.id)
</script>

<template>
    <div class="hud">
        <!-- ================= Top ================= -->
        <div class="top">
            <ol v-if="trip.stops.length" class="dots" aria-label="Stops on this trip">
                <li v-for="(stop, i) in trip.stops" :key="stop.id" class="dot"
                    :class="{ done: isDone(stop), current: nextStop && stop.id === nextStop.id }">
                    <span v-if="isDone(stop)" aria-label="done">✓</span>
                    <span v-else>{{ i + 1 }}</span>
                </li>
            </ol>

            <!-- arrived at a stop -->
            <section v-if="arrived" class="card card-dark" role="alert">
                <p class="eyebrow"><span class="live"></span>You’ve arrived</p>
                <h2 class="name">{{ arrived.name }}</h2>
                <p class="sub">Play a short game here. Stop walking first.</p>
                <p v-if="spiritHere" class="spirit-note">A Spirit is hiding here. Your game will find it.</p>
                <div class="actions">
                    <PrimaryButton class="tap-in" :disabled="tapping" @click="emit('tap-in', arrived)">
                        {{ tapping ? 'Tapping in…' : 'Tap in' }}
                    </PrimaryButton>
                    <button type="button" class="ghost ghost-light" @click="emit('skip')">Not now</button>
                </div>
                <p v-if="message" class="message" role="alert">{{ message }}</p>
            </section>

            <!-- reached the destination -->
            <section v-else-if="reachedEnd" class="card card-dark" role="alert">
                <p class="eyebrow"><span class="live"></span>You’ve arrived</p>
                <h2 class="name">{{ trip.destination.name }}</h2>
                <p class="sub">{{ trip.doneIds.length }} of {{ trip.stops.length }} stops on this trip done.</p>
                <PrimaryButton class="tap-in" @click="emit('end')">Finish trip</PrimaryButton>
            </section>

            <!-- off route -->
            <section v-else-if="offRoute" class="card" role="alert">
                <p class="eyebrow">You’re off the route</p>
                <p class="sub">Get a new route from where you are now?</p>
                <button type="button" class="pill-btn" :disabled="updating" @click="emit('update-route')">
                    {{ updating ? 'Finding a new route…' : 'Update route' }}
                </button>
            </section>

            <!-- next stop -->
            <section v-else-if="nextStop" class="card">
                <p class="eyebrow">Next game · Stop {{ stopNumber }} of {{ trip.stops.length }}</p>
                <h2 class="name">{{ nextStop.name }}</h2>
                <p v-if="nextStopMetres !== null" class="sub">{{ distanceLabel(nextStopMetres) }}</p>
            </section>

            <!-- no games left (or none on this route) -->
            <section v-else class="card">
                <p class="eyebrow">{{ trip.stops.length ? 'All stops done' : 'No games on this route' }}</p>
                <h2 class="name">Heading to {{ trip.destination.name }}</h2>
            </section>
        </div>

        <!-- ================= Bottom ================= -->
        <div class="bottom">
            <div class="bottom-row">
                <div class="to">
                    <p class="to-name">To {{ trip.destination.name }}</p>
                    <p class="to-time">{{ minutesLeft }} min left</p>
                </div>
                <button type="button" class="round" aria-label="Minimise the journey, back to the map"
                    @click="emit('minimise')">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"
                        stroke-linecap="round" stroke-linejoin="round"><path d="M5 9 L12 16 L19 9" /></svg>
                </button>
            </div>

            <div class="bar" role="progressbar" aria-label="Trip progress" aria-valuemin="0" aria-valuemax="100"
                :aria-valuenow="Math.round(progress * 100)">
                <span class="bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></span>
            </div>

            <div class="bottom-actions">
                <button type="button" class="end" @click="confirming = true">End journey</button>
            </div>
        </div>

        <!-- ================= End this trip? ================= -->
        <div v-if="confirming" class="dialog-backdrop" @click.self="confirming = false">
            <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="end-title">
                <h2 id="end-title" class="dialog-title">End this trip?</h2>
                <p class="dialog-text">Your coins and any Spirits you found are saved.</p>
                <div class="dialog-actions">
                    <button type="button" class="pill-btn" @click="confirming = false">Keep going</button>
                    <button type="button" class="ghost" @click="confirming = false; emit('end')">End trip</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hud {
    position: absolute;
    inset: 0;
    z-index: 25;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    color: var(--ink);
    font-family: var(--font);
    pointer-events: none;                /* the map stays draggable between the cards */
}

.top,
.bottom,
.dialog-backdrop {
    pointer-events: auto;
}

.top {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 460px;
}

/* ---------- stop dots ---------- */
.dots {
    display: flex;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 3px solid var(--white);
    border-radius: 50%;
    background: var(--user-blue);
    box-shadow: 0 4px 10px rgba(22, 20, 18, 0.2);
    color: var(--white);
    font-size: 14px;
    font-weight: 800;
}

.dot.done {
    background: var(--sage);
    color: var(--ink);
}

.dot.current {
    transform: scale(1.15);
}

/* ---------- the card ---------- */
.card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 20px;
    border: var(--glass-border);
    border-radius: 26px;
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
}

.card-dark {
    border-color: transparent;
    background: var(--ink);
    color: var(--white);
}

.eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.85;
}

.live {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--live-green);
    box-shadow: 0 0 0 4px rgba(143, 209, 139, 0.3);
}

.name {
    margin: 0;
    font-family: var(--font);           /* the app font (not the browser's heading font) */
    font-size: 28px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.sub {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
}

.spirit-note {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--peach);
}

.actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
}

.tap-in {
    margin-top: 6px;
}

/* on the dark "You've arrived" card the black button would disappear, so it turns white */
.card-dark .tap-in {
    background: var(--white);
    color: var(--ink);
}

.message {
    margin: 4px 0 0;
    font-size: 16px;
    font-weight: 600;
}

.pill-btn {
    align-self: flex-start;
    min-height: var(--tap-min);
    padding: 0 20px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font: 700 16px var(--font);
    cursor: pointer;
}

.ghost {
    min-height: var(--tap-min);
    padding: 0 18px;
    border: 2px solid var(--ink);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font: 700 16px var(--font);
    cursor: pointer;
}

.ghost-light {
    border-color: rgba(255, 255, 255, 0.6);
    color: var(--white);
}

/* ---------- bottom ---------- */
.bottom {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 460px;
    padding: 16px 18px;
    border: var(--glass-border);
    border-radius: 26px;
    background: var(--glass-strong-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    box-sizing: border-box;
}

.bottom-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.to {
    flex: 1;
    min-width: 0;
}

.to-name {
    margin: 0;
    overflow: hidden;
    font-size: 17px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.to-time {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
}

.round {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 50%;
    background: var(--white);
    box-shadow: 0 4px 12px rgba(22, 20, 18, 0.12);
    color: var(--ink);
    cursor: pointer;
}

.round svg {
    width: 24px;
    height: 24px;
}

.bar {
    height: 10px;
    overflow: hidden;
    border-radius: 5px;
    background: rgba(22, 20, 18, 0.12);
}

.bar-fill {
    display: block;
    height: 100%;
    border-radius: 5px;
    background: var(--user-blue);
    transition: width 0.6s ease;
}

.bottom-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.end {
    flex: 1;
    min-height: var(--cta-height);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font: 700 18px var(--font);
    cursor: pointer;
}

/* ---------- End this trip? ---------- */
.dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(22, 20, 18, 0.4);
}

.dialog {
    width: min(400px, 100%);
    padding: 24px;
    border-radius: 28px;
    background: var(--paper);
    box-shadow: 0 20px 50px rgba(22, 20, 18, 0.3);
}

.dialog-title {
    margin: 0 0 8px;
    font-family: var(--font);
    font-size: 26px;
    font-weight: 700;
}

.dialog-text {
    margin: 0 0 18px;
    font-size: 17px;
}

.dialog-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

@media (min-width: 768px) {
    .hud {
        padding: 24px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .bar-fill {
        transition: none;
    }
}
</style>
