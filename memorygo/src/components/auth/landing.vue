<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/landing.vue 
purpose:    landing page -> when user visits ('/'). Configure the card within </slot> in AuthLayout.vue
imports:    imports AuthLayout.vue
---------------------------------------------------------------------------------------------------------->

<script setup>
import AuthLayout from './AuthLayout.vue'

const tagline = 'As you are travelling, play cognitive games and collect Spirits along the way'
</script>

<template>
    <!-- imports the card layout -->
    <AuthLayout>
        <!-- items within </slot> -->
        <p class="tagline text-center mt-3 mb-4">{{ tagline }}</p>

        <button type="button" class="start-btn w-100 rounded-4 border-0">
            Start exploring
        </button>

        <router-link to="/login" class="account-link d-block mx-auto mt-3 border-0 bg-transparent">
            I already have an account
        </router-link>
    </AuthLayout>
</template>

<style scoped>
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
</style>