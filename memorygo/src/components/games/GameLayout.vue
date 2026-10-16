<script setup>
import { computed,ref,onBeforeUnmount } from 'vue'

const props = defineProps({
    // Heading shown on mobile, e.g. "Memory Match"
    title: { type: String, required: true },
    // Heading shown on desktop
    desktopTitle: { type: String, default: "Today's game" },
    // Short line under the heading (mobile, and desktop if no desktopIntro)
    intro: { type: String, default: '' },
    desktopIntro: { type: String, default: '' },
    // Text for Read aloud. Defaults to the title + intro.
    speech: { type: String, default: '' },
    // Where the Stop button goes
    exitTo: { type: String, default: '/map' }
})

// Read-aloud helper: start, stop, or toggle. Stops automatically when the
// component using it is removed (e.g. when the player leaves the page).
function useSpeech() {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
    const speaking = ref(false)
    let current = null

    function stop() {
        current = null
        if (supported) window.speechSynthesis.cancel()
        speaking.value = false
    }

    function speak(text, rate = 0.9) {
        if (!supported || !text) return

        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = rate
        current = utterance

        // Ignore events from an utterance that has already been replaced
        const done = () => {
            if (current === utterance) speaking.value = false
        }
        utterance.onend = done
        utterance.onerror = done

        speaking.value = true
        window.speechSynthesis.speak(utterance)
    }

    function toggle(text) {
        if (speaking.value) stop()
        else speak(text)
    }

    onBeforeUnmount(stop)

    return { supported, speaking, speak, stop, toggle }
}

const { supported, speaking, toggle } = useSpeech()

const textToRead = computed(() => props.speech || `${props.title}. ${props.intro}`)
</script>

<template>
  <div class="game-page min-vh-100">

    <!-- Header -->
    <header class="game-header d-flex align-items-center justify-content-between px-3 px-md-4 py-3">
      <router-link :to="exitTo" class="btn btn-pill rounded-pill fw-bold shadow-sm px-3 px-md-4">
        <i class="fa-solid fa-xmark me-2"></i>Stop
      </router-link>

      <div class="d-none d-md-flex align-items-center gap-2 fs-4 fw-bold serif">
        <img src="@/assets/app-logo.png" alt="" width="35">
        <span>Memory Go</span>
      </div>

      <button
        v-if="supported"
        type="button"
        class="btn btn-pill rounded-pill fw-bold shadow-sm px-3 px-md-4"
        :aria-pressed="speaking"
        @click="toggle(textToRead)"
      >
        <i class="fa-solid me-2 text-blue" :class="speaking ? 'fa-stop' : 'fa-volume-high'"></i>
        {{ speaking ? 'Stop reading' : 'Read aloud' }}
      </button>
      <span v-else></span>
    </header>

    <main class="game-main mx-auto px-3 pt-2 pt-md-4 pb-5">

      <!-- Game introduction -->
      <div class="text-start text-md-center mb-3">
        <h1 class="serif fw-bold fs-2 mb-2">
          <span class="d-md-none">{{ title }}</span>
          <span class="d-none d-md-inline">{{ desktopTitle }}</span>
        </h1>
        <p class="mb-0 d-md-none" aria-live="polite">{{ intro }}</p>
        <p class="mb-0 d-none d-md-block" aria-live="polite">{{ desktopIntro || `${title}. ${intro}` }}</p>
      </div>

      <slot />

    </main>
  </div>
</template>

<!-- Shared game styles. Not scoped, so game pages can use .btn-memory, .restart etc.
     Move this block into your global theme.css if you prefer. -->
<style>
.game-page {
    --cream: #faf5e6;
    --ink: #2a1d14;
    --blue: #3f6190;
    --green: #4a7c59;
    --gold: #e5b93c;
    --red: #b5544a;

    background: var(--cream);
    color: var(--ink);
}

.game-page .serif {
    font-family: Georgia, 'Times New Roman', serif;
}

.game-page .text-blue {
    color: var(--blue);
}

.game-page .text-gold {
    color: var(--gold);
}

/* Header */
.game-page .game-header {
    background: #efe8d4;
    border-bottom: 1px solid #e0d8c0;
}

@media (max-width: 767.98px) {
    .game-page .game-header {
        background: transparent;
        border-bottom: none;
    }
}

.game-page .game-main {
    max-width: 440px;
}

/* Bootstrap button colour overrides */
.game-page .btn-pill {
    --bs-btn-color: var(--ink);
    --bs-btn-bg: #fffdf6;
    --bs-btn-border-color: #e3dcc6;
    --bs-btn-hover-color: var(--ink);
    --bs-btn-hover-bg: #fff;
    --bs-btn-hover-border-color: #e3dcc6;
    --bs-btn-active-color: var(--ink);
    --bs-btn-active-bg: #fff;
    --bs-btn-active-border-color: #e3dcc6;
}

.game-page .btn-memory {
    --bs-btn-color: var(--blue);
    --bs-btn-bg: #fffdf6;
    --bs-btn-border-color: var(--blue);
    --bs-btn-border-width: 2px;
    --bs-btn-hover-color: var(--blue);
    --bs-btn-hover-bg: #fff;
    --bs-btn-hover-border-color: var(--blue);
    --bs-btn-active-color: var(--blue);
    --bs-btn-active-bg: #fff;
    --bs-btn-active-border-color: var(--blue);
    --bs-btn-disabled-color: var(--blue);
    --bs-btn-disabled-bg: #fffdf6;
    --bs-btn-disabled-border-color: var(--blue);
    border-radius: 14px;
}

.game-page .restart {
    --bs-btn-color: var(--blue);
    --bs-btn-hover-color: var(--blue);
}

/* Shared check badge */
.game-page .check {
    width: 20px;
    height: 20px;
    background: var(--green);
    color: #fff;
    font-size: 11px;
}
</style>