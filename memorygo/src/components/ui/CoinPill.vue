<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/CoinPill.vue
purpose:    the glass pill with the coin icon and the player's coin count
imports:    CoinIcon.vue (the coin drawing, also used on the place cards)
props:      coins (number, or null while loading / if the server is off -> shows "–")
---------------------------------------------------------------------------------------------------------->

<script setup>
import { computed } from 'vue'
import CoinIcon from './CoinIcon.vue'

const props = defineProps({
    coins: { type: Number, default: null },
})

// 1240 -> "1,240"
const label = computed(() => (props.coins === null ? '–' : props.coins.toLocaleString('en-SG')))
</script>

<template>
    <div class="coin-pill" :aria-label="`${label} coins`">
        <CoinIcon :size="20" />
        <span>{{ label }}</span>
    </div>
</template>

<style scoped>
.coin-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 56px;
    padding: 0 16px;
    border: var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--glass-light-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    font-size: 17px;
    font-weight: 800;
}
</style>
