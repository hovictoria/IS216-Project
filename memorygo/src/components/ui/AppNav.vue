<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/ui/AppNav.vue
purpose:    - the main navigation: Map, Spirits, Journey, Me
            - phone (< 768px):  floating glass pill at the bottom, icon + label per tab
            - iPad / laptop:    glass pill at the top-right with text tabs, the coin pill and an avatar
            - router-link adds the class "router-link-active" to the current tab; we style that black
props:      coins (shown in the top bar on big screens)
note:       Journey points to /menu for now (the old dashboard). It becomes the Journey tab later
---------------------------------------------------------------------------------------------------------->

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import CoinPill from './CoinPill.vue'

defineProps({
    coins: { type: Number, default: null },
})

const auth = useAuthStore()
const route = useRoute()

// a page under a tab (e.g. /spirits/kopi) keeps that tab highlighted
const isUnder = (to) => route.path.startsWith(`${to}/`)

// First letter of the name they signed up with, for the round avatar
const initial = computed(() => {
    const name = auth.user?.user_metadata?.display_name || auth.user?.email || '?'
    return name.trim().charAt(0).toUpperCase()
})

// One entry per tab. `icon` is the SVG path drawn inside a 24x24 box
const tabs = [
    {
        to: '/map',
        label: 'Map',
        icon: 'M3 6 L9 3.5 L15 6 L21 3.5 V18 L15 20.5 L9 18 L3 20.5 Z M9 3.5 V18 M15 6 V20.5',
    },
    {
        to: '/spirits',
        label: 'Spirits',
        icon: 'M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z',
    },
    {
        to: '/menu',
        label: 'Journey',
        icon: 'M8.5 18 H15 A3.5 3.5 0 0 0 15 11 H9 A3.5 3.5 0 0 1 9 4 H15.5 M6 15.5 A2.5 2.5 0 1 0 6 20.5 A2.5 2.5 0 1 0 6 15.5 M18 3.5 A2.5 2.5 0 1 0 18 8.5 A2.5 2.5 0 1 0 18 3.5',
    },
    {
        to: '/me',
        label: 'Me',
        icon: 'M12 4 A4 4 0 1 0 12 12 A4 4 0 1 0 12 4 M4 20.5 C5.5 16 8.5 14.5 12 14.5 C15.5 14.5 18.5 16 20 20.5',
    },
]
</script>

<template>
    <nav class="app-nav" aria-label="Main">
        <div class="tabs">
            <router-link v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab"
                :class="{ 'router-link-active': isUnder(tab.to) }">
                <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                    stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="tab.icon" />
                </svg>
                <span>{{ tab.label }}</span>
            </router-link>
        </div>

        <!-- big screens only: coins + avatar sit beside the tabs -->
        <CoinPill :coins="coins" class="nav-coins" />
        <router-link to="/me" class="avatar" aria-label="Your profile">{{ initial }}</router-link>
    </nav>
</template>

<style scoped>
/* =========================================================
   Phone: floating pill at the bottom
   ========================================================= */
.app-nav {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 20px;
    z-index: 30;
}

.tabs {
    display: flex;
    gap: 4px;
    height: 70px;
    padding: 7px;
    border: var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--glass-light-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: var(--glass-shadow);
    box-sizing: border-box;
}

.tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: var(--radius-pill);
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
}

.tab:hover {
    color: var(--ink);
}

.tab-icon {
    width: 22px;
    height: 22px;
}

/* the page you're on: black pill, white text */
.tab.router-link-active {
    background: var(--ink);
    color: var(--white);
}

.nav-coins,
.avatar {
    display: none;
}

/* =========================================================
   iPad + laptop: pill at the top-right
   ========================================================= */
@media (min-width: 768px) {
    .app-nav {
        top: 20px;
        left: auto;
        right: 24px;
        bottom: auto;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .tabs {
        height: auto;
        padding: 5px;
    }

    .tab {
        flex-direction: row;
        height: 44px;
        padding: 0 18px;
        font-size: 16px;
    }

    .tab-icon {
        display: none;
    }

    .nav-coins {
        display: flex;
        height: 54px;
    }

    .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 54px;
        border: 3px solid var(--white);
        border-radius: 50%;
        background: var(--peach);
        box-sizing: border-box;
        box-shadow: 0 6px 16px rgba(22, 20, 18, 0.12);
        color: var(--ink);
        font-size: 20px;
        font-weight: 800;
        text-decoration: none;
    }
}
</style>
