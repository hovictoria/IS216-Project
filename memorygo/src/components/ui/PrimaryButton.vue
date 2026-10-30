<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/PrimaryButton.vue
purpose:    - the black pill button used across the app (Start exploring, Sign in, Take me there...)
            - green dot + label on the left, hand-drawn arrow on the right
            - give it `to` and it becomes a router-link (changes page). Without `to` it is a normal <button>
props:      to (page to go to), type ('button' or 'submit'), disabled
usage:      <PrimaryButton to="/signup">Start exploring</PrimaryButton>
            <PrimaryButton type="submit" :disabled="loading">Sign in</PrimaryButton>
---------------------------------------------------------------------------------------------------------->

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
    to: { type: [String, Object], default: null },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
})

// <component :is="tag"> renders either a RouterLink or a <button>
const tag = computed(() => (props.to ? RouterLink : 'button'))

// A link needs `to`. A button needs `type` and `disabled`
const tagProps = computed(() =>
    props.to ? { to: props.to } : { type: props.type, disabled: props.disabled }
)
</script>

<template>
    <component :is="tag" v-bind="tagProps" class="cta">
        <span class="cta-label">
            <span class="cta-dot" aria-hidden="true"></span>
            <slot />
        </span>

        <!-- Hand-drawn arrow from the design spec -->
        <svg class="cta-arrow" viewBox="0 0 46 24" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 13.5 C 13 11, 26 13.5, 41 11" />
            <path d="M32 4.5 C 35.5 7.5, 38.5 9.5, 42 11 C 38 13, 34.5 16, 32.5 19.5" />
        </svg>
    </component>
</template>

<style scoped>
.cta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    width: 100%;
    height: var(--cta-height);
    padding: 0 18px 0 24px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--ink);
    color: var(--white);
    font-family: inherit;
    font-size: 20px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.18s ease, opacity 0.18s ease;
}

/* Bootstrap colours links on hover; keep ours white */
.cta:hover {
    color: var(--white);
}

.cta-label {
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;          /* button text never splits over two lines */
}

.cta-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--live-green);
}

.cta-arrow {
    width: 52px;
    height: 26px;
    flex-shrink: 0;
}

.cta:disabled {
    opacity: 0.6;
    cursor: progress;
}

/* Lift on hover, only on devices with a real mouse */
@media (hover: hover) {
    .cta:hover:not(:disabled) {
        transform: translateY(-3px);
    }
}
</style>
