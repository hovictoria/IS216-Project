<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   views/leaderboard.vue
purpose:    - the Leaderboard tab (/leaderboard): every MemoryGo explorer ranked by total XP
            - the page sorts them from highest to lowest XP and gives each explorer a rank
            - "Your current rank": a peach card with the logged-in user's rank and XP.
            - Top explorers: the top 3 on a podium, 2nd on the left, 1st in the middle, 3rd on the right. 
            - All explorers: everyone from 4th place down in a ranked list; the logged-in user's row is highlighted.
imports:    Vue, lib/api.js (leaderboard + coins), components/ui/AppNav.vue, components/ui/HandUnderline.vue,
            assets/spirits-map-bg.webp
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../lib/api'
import AppNav from '@/components/ui/AppNav.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import mapBackground from '@/assets/spirits-map-bg.webp'

// Leaderboard data
const leaderboard = ref([])
const loading = ref(true)
const errorMessage = ref('')
const coins = ref(null)

// Get leaderboard data from backend
async function loadLeaderboard() {
    loading.value = true
    errorMessage.value = ''
    try {
        const response = await api.get('/leaderboard')
        leaderboard.value = response.data.leaderboard
    } catch (error) {
        console.error(error)
        errorMessage.value = 'Could not load leaderboard.'
    } finally {
        loading.value = false
    }
}

// Top 3: second, first, third
const podiumPlayers = computed(() => {
    const top = leaderboard.value.slice(0, 3)
    return [top[1], top[0], top[2]].filter(Boolean)
})

const remainingPlayers = computed(() => 
    leaderboard.value.slice(3)
)

const currentPlayer = computed(() => 
    leaderboard.value.find(p => p.isCurrentUser)
)

// Display first letter of name as avatar
function initials(name) {
    return name ? name[0].toUpperCase() : '?'
}

// Crown and Medals for podium
const medals = { 1: '👑', 2: '🥈', 3: '🥉' }

onMounted(() => {
    loadLeaderboard()

    // coins for the nav 
    api.get('/progress')
        .then(({ data }) => { coins.value = data.coins })
        .catch(() => { coins.value = null })
})

</script>

<template>
    <div class="leaderboard-page">

        <!-- Blurred map background -->
        <div class="backdrop" aria-hidden="true">
            <img :src="mapBackground" alt="" class="backdrop-map" />
            <span class="glow glow-peach"></span>
            <span class="glow glow-sage"></span>
        </div>

        <!-- Laptop logo -->
        <p class="wordmark">MemoryGo</p>

        <main class="content">

            <!-- Heading -->
            <header class="page-header">
                <p class="eyebrow">
                    MemoryGo explorers
                </p>

                <h1 class="title">
                    <HandUnderline>leaderboard</HandUnderline>
                </h1>

                <p class="note">
                    Every adventure brings you closer to the top.
                </p>
            </header>

            <!-- Loading -->
            <div v-if="loading" class="glass-card state-card">
                Loading explorers...
            </div>

            <!-- Error -->
            <div v-else-if="errorMessage" class="glass-card state-card">
                <p role="alert">{{ errorMessage }}</p>

                <button type="button" class="retry-btn" @click="loadLeaderboard">
                    Try again
                </button>
            </div>

            <!-- Empty -->
            <div
                v-else-if="leaderboard.length === 0"
                class="glass-card state-card"
            >
                <p class="empty-icon">🏆</p>

                <h2>No explorers yet!</h2>

                <p>
                    Be the first to earn XP and join the leaderboard.
                </p>
            </div>

            <template v-else>

                <!-- Your current ranking -->
                <section v-if="currentPlayer" class="glass-card my-rank">
    
                    <div>
                        <span class="rank-label">
                            Your current rank
                        </span>

                        <p class="my-rank-number">
                            # {{ currentPlayer.rank }}
                        </p>
                    </div>

                    <div class="my-rank-xp">
                        <span class="xp-icon">★</span>

                        {{ currentPlayer.xp.toLocaleString() }}

                        <span class="xp-unit">XP</span>
                    </div>

                </section>

                <!-- Top three explorers -->
                <section class="podium-section">

                    <h2 class="section-title">
                        Top <HandUnderline>explorers</HandUnderline>
                    </h2>

                    <div class="podium">

                        <div
                            v-for="player in podiumPlayers"
                            :key="player.userId"
                            class="podium-player"
                            :class="'place-' + player.rank"
                        >

                            <!-- Crown for 1st, medal for 2nd and 3rd -->
                            <p class="podium-medal">{{ medals[player.rank] }}</p>

                            <!-- Player avatar -->
                            <div class="podium-avatar">
                                {{ initials(player.name) }}
                            </div>

                            <p class="podium-name">
                                {{ player.name }}
                            </p>

                            <span
                                v-if="player.isCurrentUser"
                                class="you-tag"
                            >
                                You
                            </span>

                            <p class="podium-xp">
                                <span class="star">★</span>
                                {{ player.xp.toLocaleString() }} XP
                            </p>

                            <!-- Podium block -->
                            <div class="podium-block">
                                <span>{{ player.rank }}</span>
                            </div>

                        </div>
                    </div>
                </section>

                <!-- Remaining explorers -->
                <section class="rankings-section">

                    <div class="rankings-header">
                        <h2 class="section-title">
                            All <HandUnderline>explorers</HandUnderline>
                        </h2>

                        <span class="explorer-count">
                            {{ leaderboard.length }} explorers
                        </span>
                    </div>

                    <div
                        v-if="remainingPlayers.length === 0"
                        class="glass-card empty-rankings"
                    >
                        More explorers will appear here as they join!
                    </div>

                    <div v-else class="rankings-list">

                        <div
                            v-for="player in remainingPlayers"
                            :key="player.userId"
                            class="glass-card player-row"
                            :class="{ current: player.isCurrentUser }"
                        >

                            <span class="player-rank">
                                {{ player.rank }}
                            </span>

                            <span class="player-avatar">
                                {{ initials(player.name) }}
                            </span>

                            <div class="player-info">
                                <span class="player-name">
                                    {{ player.name }}
                                </span>

                                <span
                                    v-if="player.isCurrentUser"
                                    class="current-tag"
                                >
                                    You
                                </span>
                            </div>

                            <span class="player-xp">
                                <span class="xp-icon">★</span>
                                {{ player.xp.toLocaleString() }}
                                <small>XP</small>
                            </span>

                        </div>
                    </div>

                </section>

                <p class="footer-note">
                    Keep exploring. Every step counts!
                </p>

            </template>
        </main>

        <AppNav :coins="coins" />
    </div>
</template>

<style scoped>
/* =========================================================
    Page + background
   ========================================================= */

.leaderboard-page {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font);
}

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.backdrop-map {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(18px) saturate(1.3);
    opacity: 0.55;
    transform: scale(1.3);
}

.glow {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    filter: blur(60px);
}

.glow-peach {
    top: 160px;
    left: -100px;
    background: var(--peach);
    opacity: 0.7;
}

.glow-sage {
    bottom: -60px;
    right: -100px;
    background: var(--sage, #C8DBA9);
    opacity: 0.8;
}

/* Logo hidden on smaller screens */
.wordmark {
    display: none;
}

.content {
    position: relative;
    z-index: 2;
    max-width: 900px;
    margin: 0 auto;
    padding: 28px 20px 130px;
}

/* =========================================================
    Header
   ========================================================= */

.page-header {
    margin-bottom: 28px;
}

.eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 700;
}

.title {
    margin: 0;
    font-family: var(--font);
    font-size: 54px;
    font-weight: 700;
    line-height: 0.95;
    letter-spacing: -0.06em;
}

.note {
    margin: 14px 0 0;
    font-size: 16px;
    font-weight: 600;
}

/* =========================================================
   Glass cards
   ========================================================= */

.glass-card {
    border: 1px solid rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.5);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.95),
        0 10px 30px rgba(22, 20, 18, 0.12);
    color: var(--ink);
}

/* =========================================================
   Your current ranking
   ========================================================= */

.my-rank {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 26px;
    margin-bottom: 40px;
    background: rgba(246, 196, 164, 0.65);
}

.rank-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 800;
}

.my-rank-number {
    margin: 5px 0 0;
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.06em;
}

.my-rank-xp {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 26px;
    font-weight: 800;
    white-space: nowrap;
}

.xp-icon {
    color: #B15F39;
}

.xp-unit {
    font-size: 15px;
    font-weight: 700;
}

/* =========================================================
    Section headings
   ========================================================= */

.section-title {
    margin: 0;
    font-family: var(--font);
    font-size: 28px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.04em;
}

/* =========================================================
    Podium: bottom-aligned
   ========================================================= */

.podium-section {
    margin-bottom: 44px;
}

.podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 12px;
    margin-top: 26px;
}

.podium-player {
    flex: 1;
    min-width: 0;
    max-width: 240px;
    height: 350px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;

    text-align: center;
}

.podium-medal {
    font-size: 30px;
    margin: 0 0 6px;
}

/* Avatar circles */
.podium-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    width: 70px;
    height: 70px;
    margin-bottom: 10px;

    border: 4px solid white;
    border-radius: 50%;
    background: var(--sage, #C8DBA9);

    font-size: 28px;
    font-weight: 800;

    box-shadow: 0 5px 16px rgba(22, 20, 18, 0.12);
}

.place-1 .podium-avatar {
    width: 82px;
    height: 82px;
    background: #F3D57C;
}

.place-2 .podium-avatar {
    background: #A9CDE8;
}

.place-3 .podium-avatar {
    background: #E9A08C;
}

.podium-name {
    max-width: 100%;
    margin: 0 0 5px;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
    overflow-wrap: anywhere;
}

.you-tag {
    display: inline-block;
    margin-bottom: 5px;
    padding: 3px 10px;
    border-radius: var(--radius-pill, 999px);
    background: var(--peach);
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
}

.podium-xp {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 700;
}

.podium-xp .star {
    margin-right: 4px;
    color: #B15F39;
}

/* Podium blocks */
.podium-block {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    width: 100%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 24px 24px 8px 8px;

    font-size: 38px;
    font-weight: 800;
    color: var(--ink);

    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.8),
        0 8px 22px rgba(22, 20, 18, 0.12);
}

/* First place: tallest, centre */
.place-1 .podium-block {
    height: 155px;
    background: #F3D57C;
}

/* Second place: left */
.place-2 .podium-block {
    height: 112px;
    background: #A9CDE8;
}

/* Third place: right */
.place-3 .podium-block {
    height: 88px;
    background: #E9A08C;
}

/* =========================================================
    Rankings list
   ========================================================= */

.rankings-section {
    margin-bottom: 30px;
}

.rankings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
}

.explorer-count {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 700;
    opacity: 0.7;
}

.rankings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.player-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
}

.player-row.current {
    background: rgba(246, 196, 164, 0.75);
    border: 2px solid var(--peach);
}

.player-rank {
    width: 34px;
    flex-shrink: 0;
    text-align: center;
    font-size: 22px;
    font-weight: 800;
}

.player-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    width: 48px;
    height: 48px;
    border: 3px solid white;
    border-radius: 50%;

    background: var(--sage, #C8DBA9);
    font-size: 19px;
    font-weight: 800;
}

.player-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.player-name {
    font-size: 17px;
    font-weight: 800;
    overflow-wrap: anywhere;
    text-align: left;
}

.current-tag {
    padding: 3px 10px;
    border-radius: var(--radius-pill, 999px);
    background: var(--peach);
    font-size: 12px;
    font-weight: 800;
}

.player-xp {
    flex-shrink: 0;
    font-size: 19px;
    font-weight: 800;
    white-space: nowrap;
}

.player-xp small {
    font-size: 13px;
}

/* =========================================================
    Other states
   ========================================================= */

.state-card,
.empty-rankings {
    padding: 35px 22px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
}

.empty-icon {
    margin: 0 0 12px;
    font-size: 48px;
}

.retry-btn {
    min-height: 48px;
    margin-top: 12px;
    padding: 0 22px;
    border: none;
    border-radius: var(--radius-pill, 999px);
    background: var(--ink);
    color: white;
    font: 800 16px var(--font);
    cursor: pointer;
}

.footer-note {
    margin-top: 32px;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    opacity: 0.75;
}

/* =========================================================
    Mobile
   ========================================================= */

@media (max-width: 600px) {
    .content {
        padding: 28px 16px 130px;
    }

    .my-rank {
        padding: 18px 20px;
        margin-bottom: 32px;
    }

    .my-rank-number {
        font-size: 36px;
    }

    .my-rank-xp {
        font-size: 21px;
    }

    .section-title {
        font-size: 24px;
    }

    .podium {
        gap: 6px;
    }

    .podium-player {
        height: 290px;
    }

    .podium-medal {
        font-size: 27px;
    }

    .podium-avatar {
        width: 54px;
        height: 54px;
        font-size: 21px;
    }

    .place-1 .podium-avatar {
        width: 64px;
        height: 64px;
    }

    .podium-name {
        font-size: 13px;
    }

    .podium-xp {
        font-size: 12px;
    }

    .podium-block {
        font-size: 30px;
        border-radius: 16px 16px 6px 6px;
    }

    .place-1 .podium-block {
        height: 125px;
    }

    .place-2 .podium-block {
        height: 95px;
    }

    .place-3 .podium-block {
        height: 75px;
    }

    .player-row {
        padding: 14px 12px;
        gap: 10px;
    }

    .player-rank {
        width: 24px;
        font-size: 18px;
    }

    .player-avatar {
        width: 40px;
        height: 40px;
        font-size: 16px;
    }

    .player-name {
        font-size: 15px;
    }

    .player-xp {
        font-size: 15px;
    }

    .player-xp small {
        font-size: 11px;
    }

    .explorer-count {
        font-size: 12px;
    }
}

/* =========================================================
   iPad - nav top right
   ========================================================= */

@media (min-width: 768px) {
    .content {
        padding: 100px 32px 40px;
    }

    .title {
        font-size: 64px;
    }
}

/* =========================================================
    Laptop - logo top left
   ========================================================= */

@media (min-width: 1024px) {
    .wordmark {
        display: block;
        position: absolute;
        top: 30px;
        left: 7%;
        z-index: 2;
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.05em;
    }

    .content {
        max-width: none;
        padding: 110px 7% 60px;
    }

    .title {
        font-size: 76px;
        line-height: 0.9;
    }

    .podium {
        gap: 20px;
    }

    .podium-player {
        max-width: 320px;
    }
}

</style>
