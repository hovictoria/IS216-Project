<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/landing.vue
purpose:    landing page -> when user visits ('/'). Title goes in AuthLayout's hero slot, buttons in the sheet
imports:    AuthLayout.vue, ui/PrimaryButton.vue, ui/HandUnderline.vue
---------------------------------------------------------------------------------------------------------->

<script setup>
import AuthLayout from './AuthLayout.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'

const tagline = 'Play brain games as you travel and collect Spirits along the way'

// the three numbered pills shown on iPad / laptop
const steps = ["Search where you're going", 'Play games on the way', 'Collect Spirits']
</script>

<template>
    <AuthLayout variant="landing">
        <!-- on the sky -->
        <template #hero>
            <span class="motto">Jalan-Jalan the mind</span>
            <h1 class="title">Memory<HandUnderline>Go</HandUnderline></h1>
            <p class="tagline">{{ tagline }}</p>
        </template>

        <!-- in the sheet -->
        <div class="actions">
            <PrimaryButton to="/signup" class="start">Start exploring</PrimaryButton>
            <router-link to="/login" class="account-link">I already have an account</router-link>
        </div>

        <ol class="steps">
            <li v-for="(step, i) in steps" :key="step" class="step">
                <span class="step-number">{{ i + 1 }}</span>{{ step }}
            </li>
        </ol>
    </AuthLayout>
</template>

<style scoped>
/* =========================================================
   Phone (default)
   ========================================================= */
.motto {
    display: inline-block;
    padding: 6px 14px;
    border: 1.5px solid currentColor;
    border-radius: var(--radius-pill);
    font-size: 16px;
    font-weight: 700;
}

.title {
    margin: 12px 0 0;
    font-family: var(--font);     /* views/main.vue sets every h1 to Fraunces; override it */
    font-size: clamp(56px, 18vw, 76px);
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.055em;
}

.tagline {
    max-width: 320px;
    margin: 18px auto 0;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.3;
}

.actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.account-link {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--tap-min);
    color: var(--ink);
    font-size: 17px;
    font-weight: 700;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
}

/* steps only appear on bigger screens */
.steps {
    display: none;
}

/* =========================================================
   iPad + laptop (768px+): left-aligned text, buttons in a row
   ========================================================= */
@media (min-width: 768px) {
    .title {
        margin-top: 20px;
        font-size: clamp(96px, 9vw, 132px);
        line-height: 0.88;
        letter-spacing: -0.06em;
    }

    .tagline {
        max-width: 500px;
        margin: 26px 0 0;
        font-size: 24px;
        line-height: 1.35;
    }

    /* flex-wrap: if the column is too narrow (iPad), the link drops under the button */
    /* always one row: AuthLayout keeps the text column wide enough (~500px) for both */
    .actions {
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: 12px 22px;
    }

    .start {
        width: auto;
    }

    .account-link {
        font-size: 18px;
        white-space: nowrap;
    }

    /* pinned to the bottom-left of the page in one row, like the prototype.
       position: absolute lets it escape the narrow left column it sits in */
    .steps {
        position: absolute;
        left: 6vw;
        bottom: 56px;
        display: flex;
        gap: 12px;
        width: max-content;           /* don't squeeze into the column's width */
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .step {
        white-space: nowrap;
    }

    /* strong glass pill from the design spec */
    .step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px 10px 10px;
        border: var(--glass-border);
        border-radius: var(--radius-pill);
        background: var(--glass-strong-bg);
        -webkit-backdrop-filter: var(--glass-blur);
        backdrop-filter: var(--glass-blur);
        box-shadow: var(--glass-shadow);
        font-size: 16px;
        font-weight: 700;
    }

    .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--ink);
        color: var(--white);
        font-size: 16px;
        font-weight: 800;
    }
}
</style>
