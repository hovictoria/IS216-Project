
<script setup>
import { computed, ref } from 'vue'
import AppMenu from '@/components/menu.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Temporary prototype data
const level = ref(3)
const xp = ref(170)
const coins = ref(45)
const completedStations = ref(4)
const totalStations = ref(10)

const xpForNextLevel = 250

const displayName = computed(() =>
  auth.user?.user_metadata?.display_name || 'Memory Go Explorer'
)

const progressPercentage = computed(() =>
  Math.min((xp.value / xpForNextLevel) * 100, 100)
)

const stationPercentage = computed(() =>
  Math.round((completedStations.value / totalStations.value) * 100)
)
</script>

<template>
  <AppMenu />

  <main class="profile-page">
    <div class="profile-container">

      <header class="page-heading">
        <p class="eyebrow">MY ADVENTURE</p>
        <h1>My Profile</h1>
        <p>Look how far you've come!</p>
      </header>

      <!-- User details -->
      <section class="profile-card user-card">
        <div class="avatar">👤</div>

        <div>
          <h2>{{ displayName }}</h2>
          <p>Memory Go Explorer</p>
          <span class="level-tag">⭐ Level {{ level }}</span>
        </div>
      </section>

      <!-- XP progress -->
      <section class="profile-card">
        <div class="section-heading">
          <h2>My Level</h2>
          <span class="level-tag">Level {{ level }}</span>
        </div>

        <p class="muted">Keep exploring to reach your next level!</p>

        <div
          class="progress-track"
          role="progressbar"
          :aria-valuenow="xp"
          aria-valuemin="0"
          :aria-valuemax="xpForNextLevel"
          aria-label="Experience points"
        >
          <div
            class="progress-fill"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>

        <p class="progress-label">
          {{ xp }} / {{ xpForNextLevel }} XP
        </p>
      </section>

      <!-- Stats -->
      <div class="stats-grid">
        <section class="profile-card stat-card">
          <div class="stat-icon">✨</div>
          <p class="stat-value">{{ xp }}</p>
          <p class="stat-label">Total XP</p>
        </section>

        <section class="profile-card stat-card">
          <div class="stat-icon">🪙</div>
          <p class="stat-value">{{ coins }}</p>
          <p class="stat-label">My Coins</p>
        </section>
      </div>

      <!-- Exploration -->
      <section class="profile-card">
        <h2>My Exploration</h2>
        <p class="muted">Every station is another memory made.</p>

        <div class="station-heading">
          <strong>Stations completed</strong>
          <strong>{{ completedStations }} / {{ totalStations }}</strong>
        </div>

        <div
          class="progress-track"
          role="progressbar"
          :aria-valuenow="completedStations"
          aria-valuemin="0"
          :aria-valuemax="totalStations"
          aria-label="Stations completed"
        >
          <div
            class="progress-fill green"
            :style="{ width: stationPercentage + '%' }"
          ></div>
        </div>

        <p class="encouragement">🌷 Keep going! You're doing great!</p>
      </section>

    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  margin-left: 250px;
  padding: 40px 24px 60px;
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
</style>
