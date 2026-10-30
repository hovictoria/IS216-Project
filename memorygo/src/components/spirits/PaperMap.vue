<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/spirits/PaperMap.vue
purpose:    - a faint hand-drawn paper map behind a Spirit (Spirit page hero, "You found a Spirit!" popup)
            - same style as the landing page's paper map (components/auth/SkyBackdrop.vue): river, roads,
              blocks, parks and a dotted walking route ending at a pin, recoloured for the peach panel
            - fades out at the edges so the Spirit stays the focus; plain SVG (no images, no WebGL)
            - colours are CSS variables, so a grey panel (Spirit not found yet) can use greys
usage:      <PaperMap />  inside a box with position: relative (it fills the box, behind everything else)
---------------------------------------------------------------------------------------------------------->

<template>
    <svg class="paper-map" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <!-- river -->
        <path class="river" d="M-20 470 C 120 430, 220 500, 330 460 S 520 400, 640 440" />
        <!-- main roads -->
        <path class="road wide" d="M80 -20 C 110 160, 70 340, 150 620" />
        <path class="road wide" d="M-20 200 C 200 220, 420 170, 640 210" />
        <path class="road wide" d="M460 -20 C 430 200, 510 380, 470 620" />
        <!-- small streets -->
        <path class="road" d="M290 -20 C 300 120, 270 260, 310 440" />
        <path class="road" d="M-20 340 C 160 360, 380 320, 640 360" />
        <path class="road" d="M-20 90 C 150 110, 330 70, 640 100" />
        <path class="road" d="M-20 560 C 180 540, 400 590, 640 550" />
        <path class="road" d="M370 200 L 400 60 M210 360 L 190 560 M520 210 L 560 20 M380 350 L 400 450" />
        <path class="road" d="M200 210 L 180 100 M560 360 L 600 520 M40 340 L 20 200" />
        <!-- blocks -->
        <rect class="block" x="340" y="240" width="80" height="54" rx="10" />
        <rect class="block" x="170" y="120" width="70" height="60" rx="10" />
        <rect class="block" x="500" y="250" width="70" height="70" rx="10" />
        <rect class="block" x="190" y="240" width="60" height="70" rx="10" />
        <rect class="block" x="320" y="120" width="40" height="50" rx="8" />
        <rect class="block" x="100" y="240" width="60" height="44" rx="8" />
        <rect class="block" x="400" y="380" width="50" height="40" rx="8" />
        <rect class="block" x="230" y="20" width="44" height="48" rx="8" />
        <rect class="block" x="510" y="500" width="64" height="40" rx="8" />
        <rect class="block" x="240" y="500" width="60" height="36" rx="8" />
        <!-- parks -->
        <circle class="park" cx="530" cy="120" r="56" />
        <circle class="park" cx="90" cy="420" r="40" />
        <circle class="park" cx="390" cy="20" r="34" />
        <!-- dotted walking route to a pin -->
        <path class="route" d="M60 580 C 140 490, 120 410, 220 390 S 280 340, 300 310" />
        <circle class="pin" cx="60" cy="580" r="7" />
    </svg>
</template>

<style scoped>
.paper-map {
    --map-river: #EFD3C4;
    --map-road: #E9B597;
    --map-block: #EFC6AD;
    --map-park: #E6CFA6;
    --map-route: #C9673F;

    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    fill: none;
    pointer-events: none;
    -webkit-mask-image: radial-gradient(closest-side, black 60%, transparent 100%);
    mask-image: radial-gradient(closest-side, black 60%, transparent 100%);
}

.river { stroke: var(--map-river); stroke-width: 26; stroke-linecap: round; }
.road { stroke: var(--map-road); stroke-width: 4; stroke-linecap: round; opacity: 0.8; }
.road.wide { stroke-width: 9; opacity: 1; }
.block { fill: var(--map-block); }
.park { fill: var(--map-park); }
.route { stroke: var(--map-route); stroke-width: 3; stroke-dasharray: 2 9; stroke-linecap: round; }
.pin { fill: var(--map-route); }
</style>
