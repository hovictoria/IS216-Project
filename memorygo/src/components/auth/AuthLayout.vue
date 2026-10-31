<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/AuthLayout.vue
purpose:    - the shared frame for landing, login and sign up: sky + 3D island + paper sheet
            - variant="landing": title on the sky, short sheet with buttons at the bottom
            - variant="form":    island at the top, tall sheet with the form
            - phone (< 768px):   everything stacked, sheet rises from the bottom
            - iPad / laptop:     split screen (landing: text left / island right; form: island left / form right)
slots:      hero    -> what sits on the sky (landing title)
            default -> what goes inside the sheet (buttons or a form)
imports:    SplashScene.vue (the TresJS 3D island)
---------------------------------------------------------------------------------------------------------->

<script setup>
import SplashScene from './scene/SplashScene.vue'
import SkyBackdrop from './SkyBackdrop.vue'
import appLogo from '@/assets/app-logo.png'      // importing gives Vite's final URL for the image
import { lessMotion } from '@/lib/useSettings'

defineProps({
    variant: { type: String, default: 'form' },   // 'landing' or 'form'
})

// Respect the device's "reduce motion" setting: the island stops wiggling
const reducedMotion = lessMotion()   // the Me page's switch, or the device's setting
</script>

<template>
    <section class="auth" :class="`auth--${variant}`">

        <!-- Layer 0: warm sky + faint paper map around the island -->
        <SkyBackdrop :variant="variant" />

        <!-- Layer 1: the sun and the 3D island floating on the sky -->
        <span class="sun" aria-hidden="true"></span>
        <div class="island" aria-hidden="true">
            <SplashScene :reduced-motion="reducedMotion" />
            <span v-if="variant === 'landing'" class="psst">
                <span class="psst-dot"></span>Psst, helloo!
            </span>
        </div>

        <!-- Layer 2: header (landing: logo + Sign in on big screens; form: back button) -->
        <header class="header">
            <router-link v-if="variant === 'form'" to="/" class="back" aria-label="Back to start">
                <span class="back-circle">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 5 L8 12 L15 19" />
                    </svg>
                </span>
                <span class="logo back-logo">
                    <img :src="appLogo" alt="" class="logo-mark" />MemoryGo
                </span>
            </router-link>

            <template v-else>
                <span class="logo">
                    <img :src="appLogo" alt="" class="logo-mark" />MemoryGo
                </span>
                <router-link to="/login" class="header-signin">Sign in</router-link>
            </template>
        </header>

        <!-- Layer 3: the content -->
        <div class="content">
            <div v-if="$slots.hero" class="hero">
                <slot name="hero" />
            </div>

            <div class="sheet">
                <div class="sheet-inner">
                    <slot />
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* =========================================================
   Phone (default)
   ========================================================= */
.auth {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;           /* dvh ignores the phone's address bar */
    overflow: hidden;
    background: var(--sky);
    color: var(--ink);
    font-family: var(--font);
}

/* ---------- island ---------- */
/* SplashScene fills whatever box it is given, so we only size this box */
.island {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 0;
}

/* phones: the island fills the gap between the tagline and the buttons, spilling a little past
   both sides like the prototype (a wider + taller box = a bigger island) */
.auth--landing .island {
    top: 21%;
    left: -12%;
    right: -12%;
    height: 66%;
}

/* taller box = bigger island. Its bottom tucks behind the sheet, like the prototype.
   SplashScene zooms out when its box is narrow, so on phones the box is made wider than the
   screen (left/right -20%); the island then spills past the edges like in the prototype */
.auth--form .island {
    top: -3%;
    left: -20%;
    right: -20%;
    height: 60%;
}

/* yellow sun in the top-right corner of the landing page (iPad / laptop only) */
.sun {
    display: none;
    position: absolute;
    top: 11%;
    right: 3%;
    z-index: 0;
    width: clamp(64px, 6.5vw, 96px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--butter);
}

/* the dark "Psst, helloo!" label beside the chest */
.psst {
    position: absolute;
    left: 58%;
    top: 52%;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
}

.psst-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--butter);
}

/* ---------- header ---------- */
.header {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* landing has no header on phones (the title is already big) */
.auth--landing .header {
    display: none;
}

/* logo picture + "MemoryGo" side by side */
.logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: var(--tracking-tight);
}

/* the pin image is 4:5 with empty space around it, so it needs to be a bit taller than the text */
.logo-mark {
    height: 44px;
    width: auto;
}

.back {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--ink);
    text-decoration: none;
}

.back-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--white);
    box-shadow: var(--shadow-soft);
}

.back-circle svg {
    width: 22px;
    height: 22px;
}

/* the logo next to the back button only shows on laptops */
.back-logo {
    display: none;
}

.header-signin {
    display: flex;
    align-items: center;
    height: 46px;
    padding: 0 20px;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-pill);
    color: var(--ink);
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
}

/* ---------- content ---------- */
/* fills the screen; hero at the top, sheet pushed to the bottom */
.content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    pointer-events: none;         /* let empty space pass through... */
}

.hero,
.sheet {
    pointer-events: auto;         /* ...but the real content is clickable */
}

.hero {
    padding: 52px var(--gutter) 0;
    text-align: center;
}

.sheet {
    margin-top: auto;             /* pushes the sheet to the bottom */
    background: var(--paper);
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
    box-shadow: var(--shadow-sheet);
}

.sheet-inner {
    padding: 20px var(--gutter) 24px;
}

.auth--form .sheet-inner {
    padding-top: 28px;
}

/* the form sheet must start below the island's top half */
.auth--form .content {
    padding-top: 34vh;
}

/* =========================================================
   iPad (768px+): split screen
   ========================================================= */
@media (min-width: 768px) {
    .auth {
        height: 100vh;
        min-height: 640px;
    }

    .content {
        min-height: 0;
        height: 100%;
    }

    .header {
        top: 28px;
        left: 6vw;
        right: 5vw;
    }

    .auth--landing .header {
        display: flex;
    }

    /* ---------- landing: text left, island right ---------- */
    /* The text column is 48% wide, but never narrower than its 6vw left margin + 520px: the
       "Start exploring" + "I already have an account" row needs ~500px and must never wrap.
       The island's box starts just before the column ends (8% overlap), so where the column has to
       grow (iPads), the box gets narrower and SplashScene zooms the island out to fit.
       A taller box = a bigger island; right: -4% lets the board run slightly off the edge */
    .auth--landing {
        --text-column: max(48%, calc(6vw + 520px));
    }

    .auth--landing .island {
        top: 6%;
        left: calc(var(--text-column) - 8%);
        right: -4%;
        height: 94%;
    }

    .auth--landing .sun {
        display: block;
    }

    /* text is centred vertically. padding-bottom: 10px nudges the centre up by 5px */
    .auth--landing .content {
        justify-content: center;
        width: var(--text-column);
        padding-bottom: 10px;
        padding-left: 6vw;
    }

    .auth--landing .hero {
        padding: 0;
        text-align: left;
    }

    /* on big screens the landing buttons sit on the sky, no paper sheet */
    .auth--landing .sheet {
        margin-top: 0;
        background: none;
        box-shadow: none;
    }

    .auth--landing .sheet-inner {
        padding: 34px 0 0;
    }

    /* ---------- form: island left, sheet right ---------- */
    .auth--form .header {
        top: 28px;
        left: 32px;
    }

    /* full height, and right edge slides ~60px under the sheet (the sheet is drawn on top) */
    .auth--form .island {
        top: 0;
        left: -4%;
        right: 45%;
        height: 100%;
    }

    .auth--form .content {
        align-items: flex-end;
        padding-top: 0;
    }

    .auth--form .sheet {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50%;
        height: 100%;
        margin-top: 0;
        border-radius: 40px 0 0 40px;
        box-shadow: -20px 0 50px rgba(22, 20, 18, 0.10);
        overflow-y: auto;
    }

    .auth--form .sheet-inner {
        width: min(440px, 100%);
        padding: 32px;
    }
}

/* =========================================================
   Laptop (1200px+)
   ========================================================= */
@media (min-width: 1200px) {
    .back-logo {
        display: inline-flex;
    }

    /* landing: a taller box than on iPad = a bigger island. It runs past the top, bottom and right
       edges a little; the text column still sits in front of it */
    .auth--landing .island {
        top: -6%;
        left: calc(var(--text-column) - 10%);
        right: -10%;
        height: 116%;
    }

    /* the form panel is 560px with a 480px form inside, so there's ~40px either side
       (it was 620px with a 440px form + 32px padding, which left ~120px of empty margin).
       The island's box ends 60px under the panel, which is drawn on top */
    .auth--form .island {
        right: 500px;
    }

    .auth--form .sheet {
        width: 560px;
    }

    .auth--form .sheet-inner {
        width: min(480px, 100%);
        padding: 32px 0;
    }
}
</style>
