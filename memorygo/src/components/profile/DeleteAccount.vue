<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TextField from '@/components/ui/TextField.vue'

const emit = defineEmits(['close'])
const auth = useAuthStore()
const router = useRouter()

const password = ref('')
const error = ref('')
const deleting = ref(false)     // toggles the Delete button while deleting
const deleted = ref(false)      // true once the account is gone: shows the goodbye message

async function confirmDelete() {
    error.value = ''

    if (!password.value) {
        error.value = 'Please type your password to confirm.'
        return
    }

    deleting.value = true
    const message = await auth.deleteAccount(password.value)
    deleting.value = false

    if (message) {
        error.value = message
    } else {
        password.value = ''
        deleted.value = true
    }
}

// OK on the goodbye message: sign out and leave
async function finish() {
    await auth.signOut()
    router.push('/')
}
</script>

<template>
  <Teleport to="body">
    <div class="popup-overlay" @keydown.esc="!deleted && emit('close')">

      <!-- Goodbye, after the account is deleted -->
      <div v-if="deleted" class="popup-card text-center" role="dialog" aria-modal="true" aria-labelledby="bye-title">
        <div class="popup-icon green" aria-hidden="true"><i class="fa-solid fa-check"></i></div>
        <h2 id="bye-title">Account deleted</h2>
        <p class="lead-text">Your account and progress have been deleted. Thank you for exploring with MemoryGo.</p>
        <button type="button" class="main-btn" @click="finish">OK</button>
      </div>

      <!-- Are you sure? -->
       <!-- ".prevent" stops the browser’s default behaviour of reloading the page -->
      <form v-else class="popup-card" role="dialog" aria-modal="true" aria-labelledby="delete-title"
        novalidate @submit.prevent="confirmDelete">
        <div class="popup-heading">
          <h2 id="delete-title">Delete account?</h2>
          <button type="button" class="close-btn" aria-label="Close" @click="emit('close')">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div class="warning">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <p>
            This <strong>cannot be undone</strong>. You will lose your level, XP, coins,
            Memory Spirits and everywhere you have visited.
          </p>
        </div>

        <TextField id="delete-password" v-model="password" label="Type your password to confirm"
          type="password" autocomplete="current-password" />

        <p v-if="error" class="form-error" role="alert">{{ error }}</p>

        <button type="submit" class="danger-btn" :disabled="deleting">
          {{ deleting ? 'Deleting…' : 'Delete my account' }}
        </button>
        <button type="button" class="keep-btn" @click="emit('close')">Keep my account</button>
      </form>

    </div>
  </Teleport>
</template>

<style scoped>
.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(42, 32, 24, 0.55);
}

.popup-card {
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  background: #fffbf0;
  border: 2px solid #d8cba8;
  border-radius: 22px;
  color: #2a2018;
  font-family: 'Nunito Sans', sans-serif;
  box-shadow: 0 18px 40px rgba(42, 32, 24, 0.3);
  animation: card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popup-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.popup-card h2 {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.8rem;
  font-weight: 700;
}

.close-btn {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #2a2018;
  border-radius: 50%;
  background: #fff;
  color: #2a2018;
  font-size: 1.3rem;
}

/* What they will lose */
.warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8e1d8;
  color: #8a3519;
  font-size: 1.05rem;
}

.warning i {
  margin-top: 4px;
  font-size: 1.3rem;
}

.warning p {
  margin: 0;
}

.form-error {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8e1d8;
  color: #8a3519;
  font-weight: 700;
}

/* Red: the dangerous action */
.danger-btn {
  width: 100%;
  min-height: 52px;
  margin-top: 18px;
  border: 0;
  border-radius: 16px;
  background: #b23a2a;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 0 #7f2519;
}

.danger-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #7f2519;
}

.danger-btn:disabled {
  opacity: 0.6;
}

/* The safe choice, just as easy to tap */
.keep-btn {
  width: 100%;
  min-height: 52px;
  margin-top: 12px;
  border: 2px solid #2a2018;
  border-radius: 16px;
  background: #fff;
  color: #2a2018;
  font-size: 1.1rem;
  font-weight: 800;
}

/* Goodbye message */
.popup-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 2rem;
}

.popup-icon.green {
  background: #4f7f55;
}

.lead-text {
  margin: 8px 0 0;
  font-size: 1.15rem;
  color: #6b5d4d;
}

.main-btn {
  width: 100%;
  min-height: 52px;
  margin-top: 20px;
  border: 0;
  border-radius: 16px;
  background: #a64f31;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 0 #7d3a22;
}

@keyframes card-pop {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

/* Players who turn off motion in their device settings get no animation */
@media (prefers-reduced-motion: reduce) {
  .popup-card { animation: none; }
}
</style>
