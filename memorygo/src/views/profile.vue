<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import { stations } from '@/data/stations'
import { levelFromXp, progressToNext } from '@/config/progression'
import AppNav from '@/components/ui/AppNav.vue'   // the app's nav (the old sidebar menu was removed)
import { useRouter } from "vue-router";

const auth = useAuthStore()
const router = useRouter();

// Username
const displayName = computed(() => {
  if (auth.user && auth.user.user_metadata) {
    if (auth.user.user_metadata.display_name) {
      return auth.user.user_metadata.display_name
    }
  }
  return 'Memory Go Explorer'
})

// User Progress
const xp = ref(0)
const coins = ref(0)
const loading = ref (true)
const errorMessage = ref ('')
const hasProgress = ref(false)
const hasCoins = ref(false)

// Level System
const level = computed(() => {
  return levelFromXp(xp.value)
})

const progress = computed(() => {
  return progressToNext(xp.value)
})

const progressPercentage = computed(() => {
  return progress.value.percent
})

// Station Progress
const completedStations = ref(0)
const totalStations = stations.length

const stationPercentage = computed(() => {
  if (totalStations === 0) {
    return 0
  }
  return Math.round(
    (completedStations.value / totalStations)*100
  )
})

// Get XP and Coins from Backend
async function loadProfileProgress() {
  loading.value = true
  errorMessage.value = ''
  hasProgress.value = false
  hasCoins.value = false

  try {
    const response = await api.get('/progress')

    let profile = response.data

    if (response.data.profile) {
      profile = response.data.profile
    }

    const latestXp = Number(profile.xp)

    if (!Number.isFinite(latestXp) || latestXp < 0) {
      throw new Error('Invalid XP received')
    }

    xp.value = latestXp
    hasProgress.value = true

    if (profile.coins !== undefined && profile.coins !== null) {
      const latestCoins = Number(profile.coins)

      if (Number.isFinite(latestCoins) && latestCoins >= 0) {
        coins.value = latestCoins
        hasCoins.value = true
      }
    }
  } catch (error) {
    console.error('Failed to load profile:', error)
    errorMessage.value = 'Unable to load your progress'
  } finally {
    loading.value = false
  }
}

// Get Completed Stations
function loadStationProgress() {
  if (!auth.user) {
    completedStations.value = 0
    return
  }

  const userId = auth.user.id
  const saveKey = `memorygo-stations-${userId}`

  try {
    const saved = localStorage.getItem(saveKey)

    let completedIds = []

    if (saved) {
      completedIds = JSON.parse(saved)
    }

    if (!Array.isArray(completedIds)) {
      completedStations.value = 0
      return
    }

    completedStations.value = stations.filter(station => {
      return completedIds.includes(station.id)
    }).length

  } catch (error) {
    console.error('Failed to load station progress:', error)
    completedStations.value = 0
  }
}
async function onSignOut() {
  await auth.signOut();
  router.push("/");
}

watch(
  () => auth.user,
  () => {
    loadStationProgress()
    loadProfileProgress()
  },
  {immediate: true}
)
</script>

<template>
  <AppNav :coins="hasCoins ? coins : null" />

  <main class="profile-page">
    <div class="profile-container">

      <!-- heading -->
      <header class="page-heading">
        <p class="eyebrow">MY ADVENTURE</p>
        <h1>My Profile</h1>
        <p>Look how far you've come!</p>
      </header>

      <!-- user profile -->
      <section class="profile-card user-card">
        <div class="avatar">👤</div>

        <div>
          <h2>{{ displayName }}</h2>
          <p>Memory Go Explorer</p>

          <span v-if="hasProgress" class="level-tag">
            ⭐ Level {{ level }}
          </span>

          <span v-else class="level-tag">
            ⭐ Level unavailable
          </span>
        </div>
      </section>

      <!-- level progress -->
      <section class="profile-card">
        <div class="section-heading">
          <h2>My Level</h2>

          <span v-if="hasProgress" class="level-tag">
            Level {{ level }}
          </span>
        </div>

        <p class="muted">
          Keep exploring to reach your next level!
        </p>

        <p v-if="loading" class="muted">
          Loading progress...
        </p>

        <div v-else-if="errorMessage" class="error-box">
          <div class="error-icon">↻</div>
          <p class="error-title">
            Your progress couldn't be loaded
          </p>

          <p class="error-description">
            Please try again in a moment.
          </p>

          <button
            class="retry-button"
            @click="loadProfileProgress"
          >
            Try Again
          </button>
        </div>

        <div v-if="hasProgress">

          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>

          <p v-if="progress.nextLevel !== null"
            class="progress-label">
            {{ progress.xpIntoLevel }} / {{ progress.xpNeeded }} XP 
            to Level {{ progress.nextLevel }}
          </p>

          <p v-else class="progress-label">
            ⭐ Maximum Level reached!
          </p>

        </div>
      </section>

      <!-- XP and Coins -->
      <div class="stats-grid">
        <section class="profile-card stat-card">
          <div class="stat-icon">✨</div>

          <p v-if="hasProgress" class="stat-value">
            {{ xp }}
          </p>

          <p v-else class="stat-value">—</p>

          <p class="stat-label">Total Xp</p>
        </section>

        <section class="profile-card stat-card">
          <div class="stat-icon">🪙</div>

          <p v-if="hasCoins" class="stat-value">
            {{ coins }}
          </p>

          <p v-else class="stat-value">—</p>

          <p class="stat-label">My Coins</p>
        </section>
      </div>

      <!-- Station Progress -->
      <section class="profile-card">
        <h2>My Exploration</h2>

        <p class="muted">
          Every station is another memory made.
        </p>

        <div class="station-heading">
          <strong>Stations completed</strong>

          <strong>{{ completedStations }} / {{ totalStations }}</strong>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill green"
            :style="{ width: stationPercentage + '%' }"
          ></div>
        </div>

        <p class="encouragement">
          🌷 Keep going! You're doing great!
        </p>
      </section>
      <button type="button" class="btn-cta mt-2 d-block" @click="onSignOut">
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        <span>Sign Out</span>
      </button>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  margin-left: 0;                 /* was 250px, room for the old sidebar */
  padding: 100px 24px 60px;       /* top: room for the nav at the top-right */
  background: var(--bg, #fbf5e6);
  color: var(--ink, #2a2018);
  font-family: 'Nunito Sans', sans-serif;
}

.profile-container {
  max-width: 850px;
  margin: 0 auto;
}

.page-heading {
  margin-bottom: 28px;
}

.eyebrow {
  color: var(--terracotta, #a64f31);
  font-weight: 800;
  letter-spacing: 2px;
  font-size: 0.85rem;
}

.page-heading h1 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.page-heading > p:last-child,
.muted {
  color: var(--ink-soft, #6b5d4d);
}

.profile-card {
  background: var(--card, #fffbf0);
  border: 2px solid var(--dash, #d8cba8);
  border-radius: 22px;
  padding: 26px;
  margin-bottom: 20px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #f3d97a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  flex-shrink: 0;
}

.user-card h2 {
  font-size: 1.65rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.user-card p {
  color: var(--ink-soft, #6b5d4d);
}

.level-tag {
  display: inline-block;
  background: #f3d97a;
  color: #503c18;
  padding: 7px 15px;
  border-radius: 999px;
  font-weight: 800;
}

.section-heading,
.station-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.profile-card h2 {
  font-size: 1.4rem;
  font-weight: 800;
}

.progress-track {
  width: 100%;
  height: 20px;
  background: #e8dfcb;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 20px;
}

.progress-fill {
  height: 100%;
  background: var(--terracotta, #a64f31);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-fill.green {
  background: var(--green, #4f7f55);
}

.progress-label {
  margin-top: 10px;
  text-align: right;
  font-weight: 800;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.stat-card {
  text-align: center;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
}

.stat-label {
  color: var(--ink-soft, #6b5d4d);
  font-weight: 700;
}

.station-heading {
  margin-top: 20px;
}

.encouragement {
  margin-top: 20px;
  color: var(--green, #4f7f55);
  font-weight: 800;
}

@media (max-width: 767px) {
  .profile-page {
    margin-left: 0;
    padding: 24px 16px 100px;
  }

  .page-heading h1 {
    font-size: 2rem;
  }

  .profile-card {
    padding: 20px;
  }

  .user-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .avatar {
    width: 80px;
    height: 80px;
  }

  .stats-grid {
    gap: 12px;
  }

  .stat-value {
    font-size: 1.8rem;
  }
}
.error-box {
  text-align: center;
  padding: 20px 10px;
}

.error-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #f5e8d8;
  color: #a64f31;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-title {
  font-weight: 800;
  color: #2a2018;
  margin-bottom: 5px;
}

.error-description {
  color: #6b5d4d;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.retry-button {
  background: #a64f31;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-weight: 700;
  cursor: pointer;
}

.retry-button:hover {
  background: #7d3a22;
}
</style>
