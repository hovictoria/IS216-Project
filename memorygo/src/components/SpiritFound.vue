<script setup>
import { ref, watch, nextTick } from 'vue'

// the spirit to show, e.g. { id: 3, name: 'Otter Spirit', emoji: '🦦' }
// when it's null, the popup is hidden
const props = defineProps({
    spirit: { type: Object, default: null },
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
    <!-- Teleport moves the popup to the end of <body>, so it sits above everything (including the sidebar) -->
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
                    class="spirit-popup card-soft text-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="spirit-found-title"
                >
                    <p class="spirit-kicker">✨ New spirit found!</p>

                    <!-- big emoji (aria-hidden: screen readers read the name instead) -->
                    <div class="spirit-emoji" aria-hidden="true">{{ spirit.emoji }}</div>

                    <h2 id="spirit-found-title">{{ spirit.name }}</h2>
                    <p class="text-muted-ink mb-0">It's now in your collection.</p>

                    <!-- big, full-width buttons, easy to tap -->
                    <div class="d-flex flex-column align-items-center gap-2 mt-4">
                        <router-link to="/spirits" class="btn-cta spirit-cta text-decoration-none" @click="emit('close')">
                            See my collection
                        </router-link>
                        <button ref="closeBtn" type="button" class="btn btn-lg btn-outline-dark w-100" @click="emit('close')">
                            Close
                        </button>
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
    padding: 1rem;
    background: rgba(42, 32, 24, 0.55);
}

/* the box itself (card-soft gives it the team's dashed-border style) */
.spirit-popup {
    width: 100%;
    max-width: 24rem;
}

/* "✨ New spirit found!" */
.spirit-kicker {
    font-weight: 800;
    color: var(--terracotta);
    margin: 0 0 0.5rem;
}

/* the big emoji */
.spirit-emoji {
    font-size: 5rem;
    line-height: 1;
    margin-bottom: 0.5rem;
}

/* smaller version of the team's big orange button, so it's closer in size to Close */
.spirit-cta {
    padding: 0.6rem 1.5rem;
    font-size: 1.15rem;
    box-shadow: 0 3px 0 var(--terracotta-deep);
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
