
import { ref, computed } from 'vue';

// Use the Axios instance already configured in your project.
// It must include the authentication needed by /api/progress.
import { api } from '@/lib/api' //@ sign refer to the src folder

import {
  levelFromXp,
  progressToNext,
  unlockedUpTo,
  isGameUnlocked as checkGameUnlocked,
  isAreaUnlocked as checkAreaUnlocked,
  newUnlocks
} from '@/config/progression';

export function useProgression() {
  // The latest XP received from the backend.
  const xp = ref(0);

  // True while the latest XP is being fetched.
  const loading = ref(false);

  // Stores an error message if fetching fails.
  const error = ref('');

  // Calculate the current level whenever XP changes.
  const currentLevel = computed(() => levelFromXp(xp.value));

  // Calculate the progress bar whenever XP changes.
  const progress = computed(() => progressToNext(xp.value));

  // Get all games and areas unlocked at the current level.
  const unlocked = computed(() =>
    unlockedUpTo(currentLevel.value)
  );

  // Fetch the latest XP from the backend.
  async function refreshProgress() {
    loading.value = true;
    error.value = '';

    try {
        //api js has this -- baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
      const response = await api.get('/progress');

      // The existing endpoint returns the user's profile.
      const latestXp = Number(
        response.data.profile?.xp ?? response.data.xp
      );

      // Do not replace the XP with an invalid value.
      if (!Number.isFinite(latestXp) || latestXp < 0) {
        throw new Error('The API did not return valid XP.');
      }

      // Save the latest XP in Vue's reactive state.
      xp.value = latestXp;

      // Return the updated XP to the caller.
      return latestXp;
    } catch (err) {
      error.value = 'Unable to load your progress.';
      throw err;
    } finally {
      // Stop showing the loading state even if an error occurs.
      loading.value = false;
    }
  }

  // Check whether a game is unlocked using the latest XP.
  function canPlayGame(gameId) {
    return checkGameUnlocked(gameId, xp.value);
  }

  // Check whether an area is unlocked using the latest XP.
  function canEnterArea(areaId) {
    return checkAreaUnlocked(areaId, xp.value);
  }

  // Compare XP before and after a game is completed.
  async function refreshAndFindUnlocks(previousXp) {
    const updatedXp = await refreshProgress();

    return newUnlocks(previousXp, updatedXp);
  }

  return {
    xp,
    loading,
    error,
    currentLevel,
    progress,
    unlocked,
    refreshProgress,
    canPlayGame,
    canEnterArea,
    refreshAndFindUnlocks
  };
}
