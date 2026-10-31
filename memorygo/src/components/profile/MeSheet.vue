<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/profile/MeSheet.vue
purpose:    - the frame around Edit profile, Change password and Delete account (Me handoff 04-05, laptop 02-03)
            - phone (< 768px): a full page over the Me page, "← Me" back pill at the top
            - iPad + laptop:   a 600px paper pop-up in the middle, page dimmed behind, close button top-right
            - keyboard: focus starts inside, Tab stays inside, Esc closes, focus goes back to the button
              that opened it
slots:      title (the heading), default (the content), actions (the buttons at the bottom)
emits:      close
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
    labelId: { type: String, required: true },     // id of the heading, read out as the pop-up's name
})
const emit = defineEmits(['close'])

const panel = ref(null)
let openedFrom = null           // the button that opened it, to put focus back

// everything Tab can land on inside the pop-up (not the phone's back button on a laptop, which is hidden)
const focusable = () => [...panel.value.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
)].filter((el) => el.offsetParent !== null)

function onKeydown(e) {
    if (e.key === 'Escape') {
        emit('close')
        return
    }
    if (e.key !== 'Tab') return

    // keep Tab inside: from the last item go back to the first (and the other way with Shift)
    const items = focusable()
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
    }
}

// listen on the whole page, so Esc works wherever the focus is
onMounted(async () => {
    openedFrom = document.activeElement
    document.body.style.overflow = 'hidden'          // the Me page behind doesn't scroll
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    focusable()[0]?.focus()
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    openedFrom?.focus?.()
})
</script>

<template>
    <Teleport to="body">
        <div class="me-sheet-layer" @click.self="emit('close')">
            <section ref="panel" class="me-sheet" role="dialog" aria-modal="true" :aria-labelledby="props.labelId">
                <!-- phone: back to the Me page -->
                <button type="button" class="back" @click="emit('close')">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M15 5 L8 12 L15 19" />
                    </svg>
                    Me
                </button>

                <!-- iPad + laptop: close button -->
                <button type="button" class="close" aria-label="Close" @click="emit('close')">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6 L18 18 M18 6 L6 18" />
                    </svg>
                </button>

                <h2 :id="props.labelId" class="sheet-title"><slot name="title" /></h2>

                <div class="sheet-body">
                    <slot />
                </div>

                <div class="sheet-actions">
                    <slot name="actions" />
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
/* =========================================================
   Phone: a full page
   ========================================================= */
.me-sheet-layer {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: var(--paper);
    font-family: var(--font);
    color: var(--ink);
}

.me-sheet {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 24px var(--gutter) 28px;
    background:
        radial-gradient(420px 320px at 0% 0%, rgba(246, 196, 164, 0.55), transparent 70%),
        radial-gradient(420px 320px at 100% 100%, rgba(200, 219, 169, 0.6), transparent 70%),
        var(--paper);
}

.back {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 6px;
    min-height: var(--tap-min);
    padding: 0 18px 0 12px;
    border: var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--glass-strong-bg);
    box-shadow: var(--glass-shadow);
    color: var(--ink);
    font-size: 17px;
    font-weight: 800;
}

.back svg,
.close svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.close {
    display: none;
}

.sheet-title {
    margin: 22px 0 22px;
    font-family: var(--font);
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.06em;
}

.sheet-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

/* the buttons sit at the bottom of the screen on phones */
.sheet-actions {
    display: flex;
    gap: 12px;
    margin-top: auto;
    padding-top: 28px;
}

/* phones: "← Me" at the top already cancels, so the Cancel button only shows on bigger screens */
.sheet-actions :slotted(.sheet-cancel) {
    display: none;
}

/* the main button takes the rest of the row */
.sheet-actions :slotted(.cta) {
    flex: 1;
    min-width: 0;
}

/* =========================================================
   iPad + laptop: a pop-up in the middle
   ========================================================= */
@media (min-width: 768px) {
    .me-sheet-layer {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(22, 20, 18, 0.38);
    }

    .me-sheet {
        position: relative;
        width: 600px;
        height: auto;
        max-height: calc(100vh - 48px);
        padding: 36px;
        border-radius: var(--radius-sheet);
        background: var(--paper);
        box-shadow: 0 30px 80px rgba(22, 20, 18, 0.3);
    }

    .back {
        display: none;
    }

    .close {
        position: absolute;
        top: 22px;
        right: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 50%;
        background: var(--white);
        box-shadow: var(--shadow-soft);
        color: var(--ink);
    }

    .sheet-title {
        margin-top: 0;
        padding-right: 60px;
    }

    .sheet-actions :slotted(.sheet-cancel) {
        display: block;
    }
}
</style>
