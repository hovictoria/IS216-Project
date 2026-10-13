<script setup>
import { ref } from 'vue';
import SplashScene from './scene/SplashScene.vue';

const tagline = ref('As you are travelling, play gentle memory games, and collect Spirits along the way')
</script>

<template>
    <section class="landing min-vh-100">
        <div class="scene position-relative overflow-hidden">
            <!-- Layer 1: sun and hills -->
            <div class="position-absolute top-0 start-0 w-100 h-100">
                <span class="sun position-absolute rounded-circle"></span>     
                <!-- SVG for the hills -->                    
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

        <div class="card-panel position-relative rounded-4 mx-3 p-4">
            <h1 class="title m-0 text-center">Memory Go</h1>
            <p class="tagline text-center mt-3 mb-4">{{ tagline }}</p>

            <button type="button" class="start-btn w-100 rounded-4 border-0">Start exploring</button>
            <button type="button" class="account-link d-block mx-auto mt-3 border-0 bg-transparent">I already have an
                account</button>
        </div>
    </section>
</template>

<style scoped>
/* page */
.landing {
    display: flex;
    flex-direction: column;
    background: #fbf4e4;
    color: #2a2017;
    font-family: 'Nunito', system-ui, sans-serif;
}

/* scene: sky gradient box that holds the sun, hills and 3D map */
.scene {
    flex: 1 0 auto;        /* take whatever height the card doesn't use */
    min-height: 44vh;
    background: linear-gradient(180deg, #f6e6c4 0%, #f8ecd3 55%, #fbf4e4 100%);
}

/* sun: a round span, the dashed ring is its ::after */
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

/* hills: the SVG pinned to the bottom of the scene */
.hills {
    height: 26%;
}

/* 3D wrapper: fills the scene on phones; desktop pulls the right edge in */
.canvas-layer {
    right: 0;
}

/* card: negative top margin pulls it up over the hills */
.card-panel {
    margin-top: -56px;
    margin-bottom: 16px;
    border: 2px solid #e3d6b8;
    background: #fffbf2;
    box-shadow: 0 16px 32px -20px rgba(74, 52, 30, 0.4);
}

/* title */
.title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(2.25rem, 10vw, 3rem);
    font-weight: 700;
}

/* tagline */
.tagline {
    font-size: 1.15rem;
    line-height: 1.55;
    color: #4d4134;
}

/* primary button */
.start-btn {
    min-height: 64px;
    background: #b5492a;
    color: #fff;
    box-shadow: 0 5px 0 #8a3519;
    font-size: 1.25rem;
    font-weight: 800;
    cursor: pointer;
}

.start-btn:hover {
    background: #a3401f;
}

.start-btn:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #8a3519;
}

/* secondary link-style button */
.account-link {
    min-height: 44px;
    color: #2f668f;
    font-size: 1.1rem;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 5px;
    cursor: pointer;
}

/* =========================================================
   sm (576px+): bigger phones. Still stacked, slightly roomier.
   ========================================================= */
@media (min-width: 576px) {
    .scene {
        min-height: 48vh;
    }

    .sun {
        width: 60px;
        height: 60px;
    }

    .card-panel {
        max-width: 520px;
        margin-left: auto;
        margin-right: auto;
    }
}

/* =========================================================
   md (768px+): glass layout. Scene fills the page, card floats right.
   ========================================================= */
@media (min-width: 768px) {
    .landing {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        height: 100vh;
        padding: 96px 4vw 40px;
        overflow: hidden;
    }

    /* !important: overrides Bootstrap's position-relative on this div */
    .scene {
        position: absolute !important;
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

    /* !important: overrides Bootstrap's mx-3 on the card */
    .card-panel {
        width: min(500px, 48%);
        max-width: none;
        margin: 0 !important;
    }
}

/* =========================================================
   lg (992px+): laptops. More breathing room.
   ========================================================= */
@media (min-width: 992px) {
    .landing {
        padding: 96px 5vw 40px;
    }

    .canvas-layer {
        right: 24%;
    }

    .card-panel {
        width: 500px;
    }
}

/* =========================================================
   xl (1200px+): large screens.
   ========================================================= */
@media (min-width: 1200px) {
    .landing {
        padding: 96px 6vw 40px;
    }

    .card-panel {
        width: 540px;
    }

    .title {
        font-size: 3.5rem;
    }
}
</style>