<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'

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
    exitTo: { type: String, default: '/map' },
    wide: { type: Boolean, default: false },
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
      <router-link :to="exitTo" class="btn btn-pill rounded-pill px-3 px-md-4">
        <i class="fa-solid fa-xmark me-2"></i>Stop
      </router-link>

      <div class="brand d-none d-md-flex align-items-center gap-2">
        <img src="@/assets/app-logo.png" alt="" width="32">
        <span>MemoryGo</span>
      </div>

      <button
        v-if="supported"
        type="button"
        class="btn btn-pill rounded-pill px-3 px-md-4"
        :aria-pressed="speaking"
        @click="toggle(textToRead)"
      >
        <span class="live-dot me-2" :class="{ on: speaking }" aria-hidden="true"></span>
        {{ speaking ? 'Stop reading' : 'Read aloud' }}
      </button>
      <span v-else></span>
    </header>

    <main class="game-main mx-auto px-3 pt-2 pt-md-4 pb-5" :class="{ wide }">

      <!-- Game introduction -->
      <div class="game-intro text-start text-md-center mb-4">
        <h1 class="game-title mb-3">
          <span class="title-mark">
            <span class="d-md-none">{{ title }}</span>
            <span class="d-none d-md-inline">{{ desktopTitle }}</span>
            <!-- hand-drawn underline, same as the "On your way" / "Cathedral" headings -->
            <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 7 C 25 2.5, 55 2.5, 98 6 M 20 10 C 45 6.5, 70 7.5, 90 10" />
            </svg>
          </span>
        </h1>
        <p class="game-lead mb-0 d-md-none" aria-live="polite">{{ intro }}</p>
        <p class="game-lead mb-0 d-none d-md-block" aria-live="polite">{{ desktopIntro || `${title}. ${intro}` }}</p>
      </div>

      <slot />

    </main>
  </div>
</template>

<!-- Shared game styles. Not scoped, so game pages can use .btn-memory, .restart etc.
     Tip: move the @import into index.html as a <link> so the font loads sooner. -->
<style>
@import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700;800&display=swap");

.game-page {
    /* New MemoryGo palette. The old names are kept so each game's own styles still work. */
    --paper: #f4f0e8;
    --cream: var(--paper);
    --ink: #161412;
    --muted: #5a5148;
    --peach: #f6c4a4;
    --accent: #c9673f;      /* terracotta underline colour */
    --blue: #2f6fb0;
    --green: #3f8f4e;       /* borders / ticks (readable on light backgrounds) */
    --green-soft: #e1f2dc;  /* correct-answer background */
    --green-dot: #8fd18b;   /* the little status dot */
    --gold: #f3d57c;
    --gold-deep: #c9a23a;
    --red: #c9673f;
    --red-soft: #f8e0d4;    /* wrong-answer background */
    --line: rgba(22, 20, 18, 0.14);

    --glass-bg: rgba(255, 255, 255, 0.82);
    --glass-border: rgba(255, 255, 255, 0.95);
    --glass-shadow: inset 0 1px 0 #fff, 0 10px 28px rgba(22, 20, 18, 0.14);

    background: var(--paper);
    color: var(--ink);
    font-family: 'Inter Tight', 'Helvetica Neue', Arial, sans-serif;
    font-size: 1.125rem;
    font-weight: 500;
    padding-bottom: 2rem;
}

.game-page .text-blue { color: var(--blue); }
.game-page .text-gold { color: var(--gold-deep); }

/* One clear focus ring everywhere (blue has far better contrast than peach on paper) */
.game-page :focus-visible {
    outline: 3px solid var(--blue);
    outline-offset: 3px;
}

/* ---------- Header ---------- */
.game-page .game-header { background: transparent; }

.game-page .brand {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.05em;
}

/* Glass pill buttons (Stop, Read aloud) */
.game-page .btn-pill {
    --bs-btn-color: var(--ink);
    --bs-btn-bg: var(--glass-bg);
    --bs-btn-border-color: var(--glass-border);
    --bs-btn-hover-color: var(--ink);
    --bs-btn-hover-bg: #fff;
    --bs-btn-hover-border-color: #fff;
    --bs-btn-active-color: var(--ink);
    --bs-btn-active-bg: #fff;
    --bs-btn-active-border-color: #fff;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    font-weight: 700;
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    backdrop-filter: blur(20px) saturate(170%);
    box-shadow: var(--glass-shadow);
}

.game-page .live-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ink);
    opacity: 0.35;
}
.game-page .live-dot.on {
    background: var(--green-dot);
    opacity: 1;
}

/* ---------- Heading ---------- */
.game-page .game-main { max-width: 440px; }

.game-page .game-title {
    font-size: clamp(2.1rem, 8vw, 2.6rem);
    font-weight: 700;
    line-height: 0.98;
    letter-spacing: -0.045em;
}
.game-page .title-mark {
    position: relative;
    display: inline-block;
    padding-bottom: 4px;
}
.game-page .title-mark svg {
    position: absolute;
    left: -2%;
    bottom: -9px;
    width: 104%;
    height: 12px;
}
.game-page .title-mark path {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.8;
    stroke-linecap: round;
}
.game-page .game-lead {
    font-size: 1.15rem;
    font-weight: 600;
    color: #3a332d;
}

/* ---------- Primary button: black pill with a green dot (like "Tap in") ---------- */
.game-page .btn-memory {
    --bs-btn-color: #fff;
    --bs-btn-bg: var(--ink);
    --bs-btn-border-color: var(--ink);
    --bs-btn-border-width: 0;
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: #000;
    --bs-btn-hover-border-color: #000;
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: #000;
    --bs-btn-active-border-color: #000;
    --bs-btn-disabled-color: #fff;
    --bs-btn-disabled-bg: var(--ink);
    --bs-btn-disabled-border-color: var(--ink);
    --bs-btn-disabled-opacity: 0.35;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60px;
    border-radius: 999px;
    font-size: 1.2rem;
    font-weight: 700;
    transition: transform 0.08s;
}
.game-page .btn-memory:active:not(:disabled) { transform: translateY(2px); }
/* the dot only shows when the button has no icon of its own */
.game-page .btn-memory:not(:has(i))::before {
    content: '';
    width: 9px;
    height: 9px;
    margin-right: 0.65rem;
    border-radius: 50%;
    background: var(--green-dot);
}

/* "Start again" becomes an underlined text link (like "About this place") */
.game-page .restart {
    --bs-btn-color: var(--ink);
    --bs-btn-hover-color: #000;
    min-height: 48px;
    font-weight: 700;
    text-decoration: underline !important;
    text-decoration-thickness: 2px !important;
    text-underline-offset: 5px;
}

/* ---------- Shared bits ---------- */
/* Correct tick */
.game-page .check {
    width: 22px;
    height: 22px;
    background: var(--green);
    color: #fff;
    font-size: 11px;
}

/* Reusable surfaces for game tiles and answer buttons */
.game-page .g-tile {
    background: #fff;
    border: 1.5px solid var(--line);
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(22, 20, 18, 0.06);
}
.game-page .g-option {
    background: #fff;
    border: 2px solid var(--ink);
    border-radius: 20px;
}
.game-page .g-option:hover:not(:disabled) { background: #fffaf3; box-shadow: 0 0 0 2px var(--ink); }
.game-page .g-option.correct { background: var(--green-soft); border-color: var(--green); }
.game-page .g-option.wrong { background: var(--red-soft); border-color: var(--red); }

/* ---------- Desktop: content sits on a soft glass sheet ---------- */
@media (min-width: 768px) {
    .game-page .game-main {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid var(--glass-border);
        border-radius: 32px;
        box-shadow: 0 10px 28px rgba(22, 20, 18, 0.08);
        padding: 2rem 2.25rem 2.5rem !important;
    }
    .game-page .game-main.wide { max-width: 800px; }
}

@media (prefers-reduced-motion: reduce) {
    .game-page .btn-memory { transition: none; }
}
</style>