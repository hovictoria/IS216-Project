<!-- AuthLayout.vue 
- Shared background layout for Landing.vue ('/') & Login.vue ('/login')
- Imports and wraps the 3d SplashScene 
-->

<script setup>
import SplashScene from './scene/SplashScene.vue'
import logoUrl from '@/assets/app-logo.png'

defineProps({
    // Centre the title row (landing). Off = left-aligned (login, signup).
    centerTitle: { type: Boolean, default: false },
    // Shorter scene strip on phones, for pages with a tall card (login, signup).
    compact: { type: Boolean, default: false },
})
</script>

<template>
    <section class="auth position-relative min-vh-100" :class="{ compact }">

        <!-- Scene: sky gradient (on .scene) → sun + hills → 3D map on top -->
        <div class="scene overflow-hidden">

            <!-- Layer 1: sun and hills -->
            <div class="position-absolute top-0 start-0 w-100 h-100">
                <span class="sun position-absolute rounded-circle"></span>
                <svg class="hills position-absolute bottom-0 start-0 w-100" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <path d="M0 34C60 14 120 12 190 26s140 14 210-6v60H0Z" fill="#CFE0B4" />
                    <path d="M0 56c70-12 150-14 220-4s120 8 180-2v30H0Z" fill="#B6CF96" />
                </svg>
            </div>

            <!-- Layer 2: the 3D map -->
            <div class="canvas-layer position-absolute top-0 start-0 h-100">
                <SplashScene />
            </div>

        </div>

        <!-- Frosted card -->
        <div class="card-panel position-relative rounded-4">

            <div class="title-row d-flex align-items-center gap-2" :class="{ 'justify-content-center': centerTitle }">
                <img :src="logoUrl" alt="" class="logo" />
                <h1 class="title m-0">Memory Go</h1>
            </div>

            <!-- page content goes here -->
            <slot />

        </div>
    </section>
</template>

<style scoped>
/* =========================================================
   Base styles = phones (xs, below 576px). Stacked layout:
   scene strip on top, card overlapping the hills below.
   ========================================================= */

.auth {
    background: #fbf4e4;
    color: #2a2017;
    font-family: 'Nunito', system-ui, sans-serif;
}

/* ---------- Scene ---------- */
.scene {
    position: relative;
    height: 44vh;
    min-height: 240px;
    background: linear-gradient(180deg, #f6e6c4 0%, #f8ecd3 55%, #fbf4e4 100%);
}

.compact .scene {
    height: 32vh;
    min-height: 200px;
}

.canvas-layer {
    right: 0;
}

.sun {
    top: 16%;
    right: 12%;
    width: 52px;
    height: 52px;
    background: #f3c54b;
}

.sun::after {
    content: '';
    position: absolute;
    inset: -12px;
    border: 3px dashed #f3c54b;
    border-radius: 50%;
}

.hills {
    height: 26%;
}

/* ---------- Card ---------- */
.card-panel {
    margin: -56px 12px 16px;
    padding: 24px 20px;
    border: 2px solid rgba(237, 227, 204, 0.9);
    background: rgba(255, 251, 242, 0.85);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    box-shadow: 0 16px 32px -20px rgba(74, 52, 30, 0.4);
}

/* dashed inner border */
.card-panel::after {
    content: '';
    position: absolute;
    inset: 8px;
    border: 2px dashed #e3d6b8;
    border-radius: 17px;
    pointer-events: none;
}

/* ---------- Title ---------- */
.title-row {
    font-size: clamp(2.25rem, 10vw, 3rem);
}

.logo {
    height: 1.1em;
    width: auto;
}

.title {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
    letter-spacing: -0.01em;
    line-height: 1.05;
    font-size: inherit;
}

/* =========================================================
   sm (≥576px): larger phones / small tablets, still stacked.
   ========================================================= */
@media (min-width: 576px) {
    .scene {
        height: 48vh;
    }

    .compact .scene {
        height: 36vh;
    }

    .sun {
        width: 60px;
        height: 60px;
    }

    .card-panel {
        max-width: 520px;
        margin-left: auto;
        margin-right: auto;
        padding: 28px 28px 24px;
    }
}

/* =========================================================
   md (≥768px): glass layout. Scene fills the page,
   card floats on the right over the hills.
   ========================================================= */
@media (min-width: 768px) {
    .auth {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        height: 100vh;
        padding: 96px 4vw 40px;
        overflow: hidden;
    }

    .read-aloud {
        top: 24px;
        right: 24px;
        min-height: 52px;
        font-size: 1.1rem;
    }

    .scene,
    .compact .scene {
        position: absolute;
        inset: 0;
        height: auto;
        min-height: 0;
    }

    /* pull the 3D in from the right so the map sits beside the card */
    .canvas-layer {
        right: 22%;
    }

    .sun {
        right: auto;
        left: 8%;
        width: 68px;
        height: 68px;
    }

    .card-panel {
        width: min(500px, 48%);
        max-width: none;
        max-height: 100%;
        overflow-y: auto;
        margin: 0;
        padding: 36px;
    }

    .card-panel::after {
        inset: 10px;
        border-radius: 20px;
    }

    .title-row {
        font-size: clamp(2.5rem, 4.2vw, 3.25rem);
    }
}

/* Tablets held upright (md and up, portrait): card drops to the bottom
   so it doesn't cover the map */
@media (min-width: 768px) and (orientation: portrait) {
    .auth {
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding-bottom: 40px;
    }

    .canvas-layer {
        right: 0;
        bottom: 30%;
        height: auto;
    }

    .sun {
        left: auto;
        right: 10%;
    }

    .card-panel {
        width: min(560px, 88%);
    }
}

/* =========================================================
   lg (≥992px): laptops.
   ========================================================= */
@media (min-width: 992px) {
    .auth {
        padding: 96px 5vw 40px;
    }

    .canvas-layer {
        right: 24%;
    }

    .sun {
        width: 72px;
        height: 72px;
    }

    .card-panel {
        width: 500px;
        padding: 40px;
    }
}

/* =========================================================
   xl (≥1200px): large screens.
   ========================================================= */
@media (min-width: 1200px) {
    .auth {
        padding: 96px 6vw 40px;
    }

    .card-panel {
        width: 540px;
        padding: 44px;
    }

    .title-row {
        font-size: 3.5rem;
    }
}
</style>
