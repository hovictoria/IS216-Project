<script setup>
import AuthLayout from './AuthLayout.vue'

const tagline = 'Take short walks around your neighbourhood, play gentle memory games, and collect Spirits along the way.'
</script>

<template>
    <AuthLayout center-title>

        <p class="tagline text-center mt-3 mb-4">{{ tagline }}</p>

        <!-- TODO: becomes <router-link to="/signup"> once the signup page exists -->
        <button type="button" class="start-btn d-flex align-items-center justify-content-center gap-2 w-100 rounded-4 border-0">
            Start exploring
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </button>

        <router-link to="/login" class="account-link d-block text-center mt-3">
            I already have an account
        </router-link>

    </AuthLayout>
</template>

<style scoped>
.tagline {
    font-size: 1.15rem;
    line-height: 1.55;
    color: #4d4134;
}

/* ---------- Primary button ---------- */
.start-btn {
    min-height: 60px;
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

.start-btn svg {
    width: 26px;
    height: 26px;
}

/* ---------- Secondary link ---------- */
.account-link {
    min-height: 44px;
    color: #2f668f;
    font-size: 1.1rem;
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
}

.account-link:hover {
    color: #244f70;
}

@media (min-width: 576px) {
    .tagline {
        font-size: 1.2rem;
    }

    .start-btn {
        min-height: 64px;
        font-size: 1.3rem;
    }
}

@media (min-width: 992px) {
    .tagline {
        font-size: 1.25rem;
    }
}

@media (min-width: 1200px) {
    .tagline {
        font-size: 1.3rem;
    }

    .start-btn {
        min-height: 68px;
        font-size: 1.35rem;
    }
}
</style>
