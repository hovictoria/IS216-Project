<script setup>
import { ref, watch, nextTick } from 'vue'
import SpiritCanvas from '@/components/spirits/SpiritCanvas.vue'   // the live 3D spirit
import ChestCanvas from '@/components/ui/ChestCanvas.vue'          // the bonus chest when a set is finished
import PaperMap from '@/components/spirits/PaperMap.vue'           // the faint map behind the spirit

// the spirit to show, from POST /api/visits/:id/finish
// e.g. { id: 'kopi', name: 'Kopi', color: '#B07A45', rarity: 'Rare', set: 'Civic District', lore: '...' }
// when it's null, the popup is hidden
// setDone: { name: 'Civic District', bonus: 50 } when this spirit finished its area set (or null)
const props = defineProps({
    spirit: { type: Object, default: null },
    setDone: { type: Object, default: null },
})

// tells the page "the user wants to close the popup"
const emit = defineEmits(['close'])

// the Close button, so we can move keyboard focus to it when the popup opens
const closeBtn = ref(null)

// when a spirit arrives (popup opens), focus the Close button
// this helps keyboard and screen reader users, and lets Esc work straight away
watch(() => props.spirit, async (newSpirit) => {
    if (newSpirit) {
        await nextTick()          // wait until the popup is actually on the page
        closeBtn.value?.focus()
    }
})
</script>

<template>
    <!-- Teleport moves the popup to the end of <body>, so it sits above everything (including the game) -->
    <Teleport to="body">
        <Transition name="pop">

            <!-- dark background: click it (outside the box) or press Esc to close -->
            <div
                v-if="spirit"
                class="spirit-overlay"
                @click.self="emit('close')"
                @keydown.esc="emit('close')"
            >
                <!-- the popup box -->
                <div
                    class="spirit-popup"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="spirit-found-title"
                >
                    <!-- peach top: the spirit in 3D, standing on a faint paper map -->
                    <div class="spirit-hero">
                        <span class="spirit-kicker">You found a Spirit!</span>
                        <PaperMap />
                        <div class="spirit-model">
                            <SpiritCanvas :spirit-id="spirit.id" :color="spirit.color" :label="spirit.name" />
                        </div>
                    </div>

                    <div class="spirit-body">
                        <span class="spirit-rarity">{{ spirit.rarity }} · {{ spirit.set }}</span>
                        <h2 id="spirit-found-title" class="spirit-name">{{ spirit.name }}</h2>
                        <p class="spirit-lore">{{ spirit.lore }}</p>

                        <!-- this spirit finished its area set: bonus chest -->
                        <p v-if="setDone" class="set-done">
                            <ChestCanvas class="set-done-chest" />
                            <span><strong>{{ setDone.name }} set complete!</strong> +{{ setDone.bonus }} coins</span>
                        </p>

                        <!-- big, full-width buttons, easy to tap -->
                        <div class="spirit-actions">
                            <router-link :to="`/spirits/${spirit.id}`" class="spirit-cta" @click="emit('close')">
                                See my Spirit
                            </router-link>
                            <button ref="closeBtn" type="button" class="spirit-close" @click="emit('close')">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </Transition>
    </Teleport>
</template>

<style scoped>
/* dims the whole screen behind the popup */
.spirit-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overflow-y: auto;
    background: rgba(22, 20, 18, 0.55);
    font-family: var(--font);
    color: var(--ink);
}

/* the box itself (paper card with a peach top, like the Spirit page) */
.spirit-popup {
    width: 100%;
    max-width: 400px;
    margin: auto;
    overflow: hidden;
    border-radius: 32px;
    background: var(--paper);
    box-shadow: 0 24px 60px rgba(22, 20, 18, 0.35);
}

.spirit-hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 280px;
    overflow: hidden;
    border-radius: 0 0 32px 32px;
    background: var(--peach);
}

/* "You found a Spirit!" */
.spirit-kicker {
    position: absolute;
    top: 18px;
    left: 50%;
    z-index: 1;
    transform: translateX(-50%);
    padding: 6px 14px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 16px;
    font-weight: 800;
    white-space: nowrap;
}


.spirit-model {
    position: relative;
    width: 220px;
    height: 220px;
    margin-top: 24px;
}

.spirit-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px 22px 22px;
}

.spirit-rarity {
    font-size: 16px;
    font-weight: 700;
    opacity: 0.7;
}

.spirit-name {
    margin: 0;
    font-family: var(--font);          /* the app font (not the browser's heading font) */
    font-size: 48px;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.055em;
}

.spirit-lore {
    margin: 4px 0 0;
    font-size: 17px;
    font-weight: 500;
    line-height: 1.4;
}

/* "Civic District set complete! +50 coins" */
.set-done {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0 0;
    padding: 8px 14px 8px 6px;
    border-radius: 20px;
    background: var(--butter, #F3D57C);
    font-size: 17px;
    line-height: 1.3;
}

.set-done-chest {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
}

.spirit-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
}

/* black pill, same as the app's main buttons */
.spirit-cta,
.spirit-close {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
    border-radius: var(--radius-pill);
    font: 700 18px var(--font);
    text-decoration: none;
    cursor: pointer;
}

.spirit-cta {
    border: 0;
    background: var(--ink);
    color: var(--white);
}

.spirit-close {
    border: 1.5px solid var(--ink);
    background: transparent;
    color: var(--ink);
}

/* fade the background in and out */
.pop-enter-active,
.pop-leave-active {
    transition: opacity 0.25s;
}
.pop-enter-from,
.pop-leave-to {
    opacity: 0;
}

/* the box "pops" in, growing slightly */
.pop-enter-active .spirit-popup {
    animation: pop-in 0.35s ease-out;
}
@keyframes pop-in {
    from { transform: scale(0.85); }
    to   { transform: scale(1); }
}

/* users who turn off animations get no fade or pop */
@media (prefers-reduced-motion: reduce) {
    .pop-enter-active,
    .pop-leave-active {
        transition: none;
    }
    .pop-enter-active .spirit-popup {
        animation: none;
    }
}
</style>
