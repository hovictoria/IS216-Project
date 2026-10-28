<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/map/BottomSheet.vue
purpose:    - phone (< 768px): a glass sheet over the map with three resting positions ("detents")
                 down   = only the header shows, the map takes over
                 middle = default, cards swipe sideways
                 up     = sheet nearly full screen, cards become a vertical list
              tap the handle to step between them, or drag it and let go to snap to the nearest one
            - iPad / laptop: the same box becomes a fixed glass sidebar on the left (no dragging)
slots:      header  -> title + filters (always visible)
            default -> the scrolling content
v-model:    detent ('down' | 'middle' | 'up'), so the parent can switch the card layout
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const detent = defineModel('detent', { type: String, default: 'middle' })

// ---------- Where each detent sits (distance from the top of the screen, in px) ----------
// Numbers come from the 844px-tall prototype, turned into rules that work on any phone height
const screenH = ref(window.innerHeight)
const tops = computed(() => ({
    up: 84,                                  // just below the search bar
    middle: Math.round(screenH.value * 0.46),
    down: screenH.value - 204,               // header peeks out above the bottom nav
}))

function onResize() {
    screenH.value = window.innerHeight
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ---------- Dragging ----------
const dragTop = ref(null)        // a number while the finger is down, null otherwise
let drag = null                  // { startY, startTop } of the current drag
let moved = false                // true once the finger has moved more than a few px

const top = computed(() => dragTop.value ?? tops.value[detent.value])

function onPointerDown(e) {
    drag = { startY: e.clientY, startTop: top.value }
    moved = false
    e.currentTarget.setPointerCapture(e.pointerId)   // keep getting moves even if the finger leaves the handle
}

function onPointerMove(e) {
    if (!drag) return
    const dy = e.clientY - drag.startY
    if (Math.abs(dy) > 5) moved = true
    if (moved) {
        const min = tops.value.up - 14
        const max = tops.value.down + 40
        dragTop.value = Math.min(max, Math.max(min, drag.startTop + dy))
    }
}

function onPointerUp() {
    if (!drag) return
    drag = null
    if (moved && dragTop.value !== null) {
        // snap to whichever detent is closest to where they let go
        const entries = Object.entries(tops.value)
        const [nearest] = entries.reduce((a, b) =>
            Math.abs(b[1] - dragTop.value) < Math.abs(a[1] - dragTop.value) ? b : a)
        detent.value = nearest
    }
    dragTop.value = null
}

// A tap (no drag) steps: down -> middle -> up -> middle
function onHandleClick() {
    if (moved) {
        moved = false
        return
    }
    detent.value = { down: 'middle', middle: 'up', up: 'middle' }[detent.value]
}

const handleLabel = computed(() =>
    detent.value === 'up' ? 'Collapse the nearby panel' : 'Expand the nearby panel')
</script>

<template>
    <section class="sheet" :class="{ dragging: dragTop !== null }" :style="{ '--sheet-top': `${top}px` }">
        <button type="button" class="handle" :aria-label="handleLabel" @click="onHandleClick"
            @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp"
            @pointercancel="onPointerUp">
            <span class="handle-bar"></span>
        </button>

        <div class="sheet-header">
            <slot name="header" />
        </div>

        <div class="sheet-body">
            <slot />
        </div>
    </section>
</template>

<style scoped>
/* =========================================================
   Phone: sheet slides up from the bottom
   ========================================================= */
.sheet {
    position: fixed;
    top: var(--sheet-top);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 32px 32px 0 0;
    background: rgba(244, 240, 232, 0.38);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    backdrop-filter: blur(28px) saturate(160%);
    box-shadow: 0 -8px 24px rgba(22, 20, 18, 0.12);
    transition: top 0.34s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* follow the finger exactly while dragging; animate only when it snaps */
.sheet.dragging {
    transition: none;
}

.handle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 100%;
    height: 30px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;           /* stop the browser scrolling the page while dragging */
}

.handle-bar {
    width: 48px;
    height: 6px;
    border-radius: 3px;
    background: var(--ink);
    opacity: 0.35;
}

.sheet-header {
    flex-shrink: 0;
    padding: 0 20px;
    margin-bottom: 14px;
}

.sheet-body {
    flex: 1;
    min-height: 0;                /* lets the body shrink so its own content can scroll */
    display: flex;
    flex-direction: column;
}

/* =========================================================
   iPad + laptop: fixed glass sidebar on the left
   ========================================================= */
@media (min-width: 768px) {
    .sheet {
        top: 20px;
        left: 20px;
        right: auto;
        bottom: 20px;
        width: 370px;
        border: 1px solid rgba(255, 255, 255, 0.85);
        background: rgba(244, 240, 232, 0.5);
        border-radius: 32px;
        box-shadow: 0 20px 50px rgba(22, 20, 18, 0.15);
        overflow: hidden;
        transition: none;
    }

    .handle {
        display: none;
    }

    .sheet-header {
        padding: 22px 22px 0;
        margin-bottom: 0;
    }
}

@media (min-width: 1200px) {
    .sheet {
        width: 420px;
    }
}
</style>
