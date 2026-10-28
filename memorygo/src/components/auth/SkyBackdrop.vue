<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/SkyBackdrop.vue
purpose:    - the sky behind the landing / sign in / sign up pages (it used to be one flat colour)
            - 3 layers, back to front:
                1. glow  : warm morning gradient (lighter at the top) + soft sunlight behind the island
                2. map   : a faint paper map (streets, river, blocks, parks, dashed routes, pins) in a patch
                           around the island only, fading out before the title so "MemoryGo" stays the focus
                3. grain : very light paper texture so the sky feels like warm paper, not a flat screen
            - drawn with CSS + inline SVG (no images, no three.js), behind the island
props:      variant ('landing' | 'form'): the island sits right on the landing page and left on the
            forms (iPad / laptop), so the glow and the map patch follow it
---------------------------------------------------------------------------------------------------------->

<script setup>
defineProps({
    variant: { type: String, default: 'landing' },
})
</script>

<template>
    <div class="backdrop" :class="`on-${variant}`" aria-hidden="true">
        <div class="glow"></div>

        <svg class="map-lines" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            <!-- river -->
            <path class="river" d="M-20 760 C 220 700, 360 820, 600 760 S 980 640, 1180 700 S 1400 820, 1480 780" />
            <!-- main roads -->
            <path class="road wide" d="M120 -20 C 160 240, 120 520, 240 920" />
            <path class="road wide" d="M-20 300 C 400 330, 900 260, 1460 320" />
            <path class="road wide" d="M980 -20 C 940 300, 1060 600, 1000 920" />
            <!-- small streets -->
            <path class="road" d="M500 -20 C 520 200, 470 420, 540 700" />
            <path class="road" d="M-20 520 C 300 560, 700 500, 1000 560 S 1300 600, 1460 560" />
            <path class="road" d="M700 300 L 760 90 M1180 320 L 1250 60 M1250 330 L 1300 640 M760 540 L 820 760" />
            <path class="road" d="M330 310 L 300 120 M640 520 L 600 300 M1100 560 L 1180 820" />
            <!-- blocks -->
            <rect class="block" x="1040" y="360" width="90" height="60" rx="10" />
            <rect class="block" x="1150" y="380" width="70" height="90" rx="10" />
            <rect class="block" x="1300" y="400" width="100" height="70" rx="10" />
            <rect class="block" x="820" y="160" width="110" height="70" rx="10" />
            <rect class="block" x="1060" y="120" width="80" height="80" rx="10" />
            <rect class="block" x="560" y="380" width="70" height="80" rx="10" />
            <circle class="park" cx="1320" cy="180" r="80" />
            <circle class="park" cx="760" cy="420" r="55" />
            <!-- dashed walking routes -->
            <path class="route" d="M1120 760 C 1180 640, 1060 560, 1160 470 S 1300 360, 1340 250" />
            <path class="route" d="M620 860 C 700 760, 860 700, 900 600 S 960 420, 880 300" />
            <!-- pins -->
            <g class="pins">
                <circle cx="1340" cy="250" r="9" />
                <circle cx="1160" cy="470" r="7" />
                <circle cx="880" cy="300" r="9" />
                <circle cx="1240" cy="600" r="6" />
                <circle cx="640" cy="200" r="6" />
            </g>
        </svg>

        <div class="grain"></div>
    </div>
</template>

<style scoped>
.backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

/* ---------- 1. warm morning light ---------- */
/* lighter at the top, warmer near the bottom, and a soft sunny glow where the island sits */
.glow {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 60% 45% at 50% 55%, rgba(255, 238, 200, 0.95), rgba(255, 238, 200, 0) 70%),
        linear-gradient(180deg, #F8EFD9 0%, #F4E7C8 45%, #EFD8B4 100%);
}

@media (min-width: 768px) {
    .on-landing .glow {
        background:
            radial-gradient(ellipse 42% 55% at 72% 55%, rgba(255, 238, 200, 0.95), rgba(255, 238, 200, 0) 70%),
            linear-gradient(180deg, #F8EFD9 0%, #F4E7C8 45%, #EFD8B4 100%);
    }

    .on-form .glow {
        background:
            radial-gradient(ellipse 35% 55% at 25% 50%, rgba(255, 238, 200, 0.95), rgba(255, 238, 200, 0) 70%),
            linear-gradient(180deg, #F8EFD9 0%, #F4E7C8 45%, #EFD8B4 100%);
    }
}

/* ---------- 2. paper map ---------- */
/* A patch of map around the island: the drawing shrinks with its box, and a soft circular fade
   keeps it away from the title and buttons, so "MemoryGo" stays the thing people look at */
.map-lines {
    position: absolute;
    left: 0;
    right: 0;
    top: 20%;
    height: 68%;
    width: 100%;
    fill: none;
    -webkit-mask-image: radial-gradient(closest-side, black 55%, transparent 100%);
    mask-image: radial-gradient(closest-side, black 55%, transparent 100%);
}

@media (min-width: 768px) {
    .on-landing .map-lines {
        left: auto;
        right: -4%;
        top: 4%;
        width: 64%;
        height: 96%;
    }

    .on-form .map-lines {
        left: -4%;
        top: 4%;
        width: 60%;
        height: 92%;
    }
}

.river { stroke: #DEE8E2; stroke-width: 30; stroke-linecap: round; }
.road { stroke: #EBDBBB; stroke-width: 4; stroke-linecap: round; }
.road.wide { stroke-width: 9; }
.block { fill: #F0E1C3; }
.park { fill: #E6E8CC; }
.route { stroke: #E0B79E; stroke-width: 3; stroke-dasharray: 2 9; stroke-linecap: round; }
.pins circle { fill: #E0B79E; }

/* ---------- 3. paper grain ---------- */
/* a tiny SVG noise pattern, tiled and blended very lightly over everything */
.grain {
    position: absolute;
    inset: 0;
    opacity: 0.28;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
</style>
