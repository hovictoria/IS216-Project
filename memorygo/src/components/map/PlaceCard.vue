<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/PlaceCard.vue
purpose:    - one place in the "Near you" list (DESIGN_SPEC.md section 5, "Place card")
            - colour by type/state: peach = playable spot, MRT = a soft tint of its line colour (blended
              for interchanges; butter if the line is unknown), sage = played here, dark = a Spirit you haven't found hides here (chest pin on the map)
            - layout="rail":    300 x 250 card, swiped sideways on phones (sheet in the middle)
            - layout="stacked": same card but full width, for the phone list when the sheet is up
            - layout="compact": shorter card for the iPad / laptop sidebar
props:      place (from GET /api/places, plus `state`), distance (metres from the user), layout
emits:      select -> the parent centres the map on this place
---------------------------------------------------------------------------------------------------------->

<script setup>
import { computed } from 'vue'
import { MRT_COLOURS } from '@/data/placeLabels'
import { distanceLabel } from '@/lib/geo'
import CoinIcon from '@/components/ui/CoinIcon.vue'

const props = defineProps({
    place: { type: Object, required: true },
    distance: { type: Number, required: true },
    layout: { type: String, default: 'rail' },
})

defineEmits(['select'])

const isMrt = computed(() => props.place.kind === 'mrt')
const isDark = computed(() => props.place.state === 'undiscovered')

// which colour class the card gets
const tone = computed(() => {
    if (props.place.state === 'undiscovered') return 'tone-dark'
    if (props.place.state === 'collected') return 'tone-sage'
    return isMrt.value ? 'tone-butter' : 'tone-peach'
})

// the reward chip at the top-right. Coins depend on how well you play (5-15, see COINS in
// server/routes/streak.js), so the card shows the most you can earn, not a fixed amount
const MAX_COINS = 15
const rewardLabel = computed(() => {
    if (props.place.inProgress) return `Continue · up to ${MAX_COINS}`     // tapped in, not finished yet
    if (props.place.playedToday) return 'Played today · back tomorrow'
    if (props.place.state === 'collected') return `Replay · up to ${MAX_COINS}`
    if (isMrt.value) return `Check in · up to ${MAX_COINS}`
    return `Up to ${MAX_COINS} coins`
})

// the outlined tag above the title
const tagLabel = computed(() => {
    if (props.place.state === 'collected') return 'Been here'       // "Spirit collected" once Spirits drop from visits
    if (props.place.state === 'undiscovered') return 'Spirit hiding here'
    if (isMrt.value) return 'MRT station'
    return 'Surprise game'          // the game is picked at random when you tap in (server/routes/visits.js)
})

// the big faint text behind the title: year built, station code, or "?"
const watermark = computed(() => {
    if (isDark.value) return '?'
    return isMrt.value ? props.place.lineCodes[0] : props.place.year
})

// long names get a smaller title so they fit on two lines
const longName = computed(() => props.place.name.length > 12)

// 'EW13' -> the green East-West line colour
const lineColour = (code) => MRT_COLOURS[code.slice(0, 2)] ?? 'var(--ink)'

// ---------- MRT cards take their line's colour ----------
// A soft tint (40% line colour mixed into the paper colour), so the black text stays easy to read.
// Interchanges blend their lines diagonally (City Hall: green → red). Collected / undiscovered
// stations keep their state colour instead. Phone cards are see-through glass, sidebar cards solid
const PAPER = [244, 240, 232]
function tint(hex, alpha) {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const [r, g, b] = rgb.map((c, i) => Math.round(c * 0.4 + PAPER[i] * 0.6))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const lineBackground = computed(() => {
    if (tone.value !== 'tone-butter') return null
    const colours = [...new Set(props.place.lineCodes.map((c) => MRT_COLOURS[c.slice(0, 2)]).filter(Boolean))]
    if (colours.length === 0) return null                       // unknown line: keep the butter colour
    const alpha = props.layout === 'compact' ? 1 : 0.7
    const tints = colours.map((c) => tint(c, alpha))
    return tints.length === 1 ? tints[0] : `linear-gradient(135deg, ${tints.join(', ')})`
})
</script>

<template>
    <button type="button" class="card" :class="[tone, `layout-${layout}`]" :style="{ background: lineBackground }"
        @click="$emit('select', place)">
        <span v-if="layout !== 'compact'" class="watermark" aria-hidden="true">{{ watermark }}</span>

        <!-- top row: category or MRT line chips, reward on the right -->
        <span class="chips">
            <!-- sidebar: one outlined chip, e.g. "Heritage" or "MRT · EW13 NS25" -->
            <span v-if="layout === 'compact'" class="chip chip-outline">
                {{ isMrt ? `MRT · ${place.lineCodes.join(' ')}` : place.category }}
            </span>
            <template v-else-if="isMrt">
                <span v-for="code in place.lineCodes" :key="code" class="chip chip-line"
                    :style="{ background: lineColour(code) }">{{ code }}</span>
            </template>
            <span v-else class="chip chip-solid">{{ place.category }}</span>

            <span class="chip chip-reward">
                <CoinIcon :size="14" />{{ rewardLabel }}
            </span>
        </span>

        <!-- bottom: tag, name, distance, arrow -->
        <span class="bottom">
            <span class="text">
                <span v-if="layout !== 'compact'" class="chip chip-outline">{{ tagLabel }}</span>
                <span class="title" :class="{ 'title-long': longName }">{{ place.name }}</span>
                <span class="distance">{{ distanceLabel(distance) }}</span>
            </span>

            <svg class="arrow" viewBox="0 0 46 24" aria-hidden="true" fill="none" stroke="currentColor"
                stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
                <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
            </svg>
        </span>
    </button>
</template>

<style scoped>
/* =========================================================
   Card shell (rail = default)
   ========================================================= */
.card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 0 0 300px;
    height: 250px;
    padding: 20px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 30px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 10px 28px rgba(22, 20, 18, 0.14);
    color: var(--ink);
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    scroll-snap-align: start;
    transition: transform 0.18s ease;
}

/* see-through tints so the map shows faintly behind (glass) */
.tone-peach { background: rgba(246, 196, 164, 0.62); }
.tone-butter { background: rgba(243, 213, 124, 0.6); }
.tone-sage { background: rgba(200, 219, 169, 0.62); }
.tone-dark {
    background: rgba(22, 20, 18, 0.64);
    border-color: rgba(255, 255, 255, 0.25);
    color: var(--white);
}

.watermark {
    position: absolute;
    top: 34px;
    right: -6px;
    color: rgba(22, 20, 18, 0.07);
    font-size: 118px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.06em;
    white-space: nowrap;
    pointer-events: none;
}

.tone-dark .watermark {
    color: rgba(255, 255, 255, 0.12);
}

/* =========================================================
   Chips
   ========================================================= */
.chips {
    position: relative;
    display: flex;
    gap: 6px;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
}

.chip-solid {
    border: 1.5px solid var(--ink);
    background: var(--ink);
    color: var(--white);
}

.tone-dark .chip-solid {
    border-color: var(--white);
    background: var(--white);
    color: var(--ink);
}

.chip-line {
    border: 1.5px solid var(--ink);
    color: var(--white);
}

.chip-reward {
    margin-left: auto;
    border: 1px solid rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.62);
    color: var(--ink);
}

.tone-dark .chip-reward {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.16);
    color: var(--white);
}

.chip-outline {
    align-self: flex-start;
    border: 1.5px solid currentColor;
    font-weight: 700;
}

/* =========================================================
   Bottom: text + arrow
   ========================================================= */
.bottom {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
}

.text {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.title {
    font-size: 50px;
    font-weight: 700;
    line-height: 0.9;
    letter-spacing: -0.05em;
}

.title-long {
    font-size: 36px;
    line-height: 0.95;
    letter-spacing: -0.045em;
}

.distance {
    font-size: 17px;
    font-weight: 500;
}

.tone-dark .distance {
    color: #E8E2D8;
}

.arrow {
    flex-shrink: 0;
    width: 46px;
    height: 24px;
    margin-bottom: 6px;
}

/* =========================================================
   Layouts
   ========================================================= */
/* phone, sheet pulled up: full-width cards stacked in a list */
.layout-stacked {
    flex: 0 0 250px;
    width: 100%;
}

/* sidebar on iPad / laptop: solid colours, no watermark, shorter */
.layout-compact {
    flex: 0 0 auto;
    width: 100%;
    height: auto;
    gap: 8px;
    padding: 16px 16px 16px 18px;
    border: 0;
    border-radius: 24px;
    box-shadow: none;
}

.layout-compact.tone-peach { background: var(--peach); }
.layout-compact.tone-butter { background: var(--butter); }
.layout-compact.tone-sage { background: var(--sage); }
.layout-compact.tone-dark { background: var(--ink); }

/* sidebar chips sit side by side (reward not pushed right) */
.layout-compact .chips {
    flex-wrap: wrap;
}

.layout-compact .chip-reward {
    margin-left: 0;
    border: 0;
    background: rgba(255, 255, 255, 0.7);
}

.layout-compact.tone-dark .chip-reward {
    background: rgba(255, 255, 255, 0.16);
}

.layout-compact .title,
.layout-compact .title-long {
    font-size: 30px;
    line-height: 0.95;
}

.layout-compact .distance {
    font-size: 16px;
    font-weight: 600;
    opacity: 0.85;
}

/* cards lift a little on hover (mouse only) */
@media (hover: hover) {
    .card:hover {
        transform: translateY(-3px);
    }
}
</style>
