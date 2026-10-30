<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/HandUnderline.vue
purpose:    - draws the orange hand-drawn scribble under one word in a heading
            - the word goes in the slot; the SVG sits just below it
usage:      <h1>Welcome <HandUnderline>back</HandUnderline></h1>
---------------------------------------------------------------------------------------------------------->

<template>
    <span class="hand-underline">
        <slot />
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
            <path d="M2 7 C 25 2.5, 55 2.5, 98 6 M 20 10 C 45 6.5, 70 7.5, 90 10" fill="none"
                stroke-width="2.8" stroke-linecap="round" />
        </svg>
    </span>
</template>

<style scoped>
/* position: relative lets the SVG be placed relative to the word */
.hand-underline {
    position: relative;
    white-space: nowrap;
}

/* preserveAspectRatio="none" lets the scribble stretch to any word length */
svg {
    position: absolute;
    left: -2%;
    bottom: -9px;
    width: 104%;
    height: 12px;
}

/* colour set in CSS, because SVG attributes can't read var(--...) */
path {
    stroke: var(--terracotta);
}
</style>
