<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/CoinIcon.vue
purpose:    the little stacked gold coin from the design (two overlapping circles)
props:      size in px
---------------------------------------------------------------------------------------------------------->

<script setup>
defineProps({
    size: { type: Number, default: 16 },
})
</script>

<template>
    <svg :width="size" :height="size" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="11" cy="11" r="8" fill="#C9A23A" stroke="#161412" stroke-width="1.7" />
        <circle cx="9.5" cy="9.5" r="8" fill="#F3D57C" stroke="#161412" stroke-width="1.7" />
    </svg>
</template>
