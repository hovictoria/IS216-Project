<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import TextField from '@/components/ui/TextField.vue'

const emit = defineEmits(['close', 'delete'])
const auth = useAuthStore()

// starts as the current name
const savedName = auth.user?.user_metadata?.display_name ?? ''
const name = ref(savedName)
const nameError = ref('')

// both boxes empty = keep the current password
const currentPassword = ref('')
const newPassword = ref('')
const passwordError = ref('')

const saving = ref(false)       // toggles the Save button while saving
const generalError = ref('')    // e.g. nothing was changed

// The "updated" pop-up: holds its message while it is open
const popup = ref('')

// Checks both parts before saving anything, so a mistake in one doesn't half-save the other
function checkForm(nameChanged, passwordChanged) {
    if (nameChanged) {
        const trimmed = name.value.trim()
        if (!trimmed) nameError.value = 'Please type your name.'
        else if (trimmed.length > 40) nameError.value = 'Please keep your name under 40 letters.'
    }

    if (passwordChanged) {
        if (!currentPassword.value || !newPassword.value) {
            passwordError.value = 'Please type both your current password and your new password.'
        } else if (newPassword.value.length < 6) {
            passwordError.value = 'Please choose a longer password (at least 6 characters).'
        } else if (newPassword.value === currentPassword.value) {
            passwordError.value = 'Your new password must be different from your current one.'
        }
    }

    return !nameError.value && !passwordError.value
}

async function save() {
    nameError.value = ''
    passwordError.value = ''
    generalError.value = ''

    const nameChanged = name.value.trim() !== savedName
    const passwordChanged = Boolean(currentPassword.value || newPassword.value)

    if (!nameChanged && !passwordChanged) {
        generalError.value = "You haven't changed anything yet."
        return
    }
    // if theres is a mistake in the form, it will return nothing and stop the save
    if (!checkForm(nameChanged, passwordChanged)) return

    saving.value = true
    const updated = []

    if (nameChanged) {
        const message = await auth.updateName(name.value.trim())
        if (message) nameError.value = message
        else updated.push('name')
    }

    if (passwordChanged) {
        const message = await auth.changePassword(currentPassword.value, newPassword.value)
        if (message) {
            passwordError.value = updated.length ? `${message} (Your name was saved.)` : message
        } else {
            updated.push('password')
            currentPassword.value = ''
            newPassword.value = ''
        }
    }

    saving.value = false

    // show the pop-up once is done saving
    if (!nameError.value && !passwordError.value) {
        popup.value = updated.length === 2
            ? 'Your name and password have been updated.'
            : `Your ${updated[0]} has been updated.`
    }
}

// everything is saved close the edit pop-up
function finish() {
    popup.value = ''
    emit('close')
}
</script>

<template>
  //moves it to the end of body (allow the pop-up to be at the very font layer)
  <Teleport to="body">
  <!-- hidden once everything is saved, so only the "Updated" pop-up shows -->
  <div v-if="!popup" class="popup-overlay" @keydown.esc="emit('close')">
  <section class="edit-card" role="dialog" aria-modal="true" aria-labelledby="edit-title">
    <div class="edit-heading">
      <h2 id="edit-title">Edit Profile</h2>
      <button type="button" class="close-btn" aria-label="Close" @click="emit('close')">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
    <!-- ".prevent" stops the browser’s default behaviour of reloading the page -->
    <form novalidate @submit.prevent="save">
      <!-- Name -->
      <div class="edit-part">
        <h3>Your name</h3>
        <!-- autocomplete tells the browser's password manager what each box is for:
        "current-password": the password they already have → the browser can fill in the saved one
        "new-password": a brand new password → the browser won't fill in the old one here,
        and may suggest a strong password and offer to save it. It doesn't change how the page looks; it only helps the browser fill in the right box -->

        <TextField id="edit-name" v-model="name" label="Name" autocomplete="name" />
        <p v-if="nameError" class="form-error" role="alert">{{ nameError }}</p>
      </div>

      <!-- Password -->
      <div class="edit-part">
        <h3>Change password</h3>
        <p class="hint top">Leave these empty to keep your current password.</p>
        <div class="fields">
          <TextField id="edit-current-password" v-model="currentPassword" label="Current password"
            type="password" autocomplete="current-password" />
          <TextField id="edit-new-password" v-model="newPassword" label="New password"
            type="password" autocomplete="new-password" />
        </div>
        <p class="hint">At least 6 characters.</p>
        <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
      </div>

      <p v-if="generalError" class="form-error" role="alert">{{ generalError }}</p>

      <!-- One Save button for both parts -->
      <button type="submit" class="save-btn" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save changes' }}
      </button>
    </form>

    <div class="delete-row">
      <button type="button" class="delete-btn" @click="emit('delete')">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        Delete account
      </button>
    </div>
  </section>
  </div>
  </Teleport>

  <!-- "Updated" pop-up, replaces the edit pop-up after saving -->
  <Teleport to="body">
    <Transition name="popup">
      <!-- ".self" clicking the dark background closes it -->
      <div v-if="popup" class="popup-overlay on-top" @click.self="finish">
        <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <div class="popup-tick" aria-hidden="true"><i class="fa-solid fa-check"></i></div>
          <h2 id="popup-title">Updated!</h2>
          <p>{{ popup }}</p>
          <button type="button" class="save-btn" @click="finish">OK</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Edit pop-up card: scrolls inside itself on short phone screens */
.edit-card {
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  background: #fffbf0;
  border: 2px solid #d8cba8;
  border-radius: 22px;
  color: #2a2018;
  font-family: 'Nunito Sans', sans-serif;
  box-shadow: 0 18px 40px rgba(42, 32, 24, 0.3);
  /* cubic-bezier: controls the speed of an animation as it plays  (start timing(x), startpush(), endtiming, endpush)
  (a custom speed curve for the animation, and because one value is above 1, the popup slightly overshoots and bounces into place) */
  animation: card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.edit-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.edit-heading h2 {
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

.edit-part {
  margin-top: 22px;
  padding-top: 22px;
  /* reads a colour from a saved variable, with a backup colour in case 
  the variable doesn’t exist */
  border-top: 2px dashed var(--dash, #d8cba8);
}

.edit-part h3 {
  margin: 0 0 12px;
  font-size: 1.15rem;
  font-weight: 800;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  margin: 8px 0 0;
  color: var(--ink-soft, #6b5d4d);
  font-size: 1rem;
}

.hint.top {
  margin: -4px 0 12px;
}

.form-error {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--error-bg, #f8e1d8);
  color: var(--error-ink, #8a3519);
  font-weight: 700;
}

.save-btn {
  width: 100%;
  min-height: 52px;
  margin-top: 16px;
  border: 0;
  border-radius: 16px;
  background: var(--terracotta, #a64f31);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 0 var(--terracotta-deep, #7d3a22);
}

.save-btn:active {
  /* moves the element down by 2px, without affecting anything around it */
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--terracotta-deep, #7d3a22);
}

.save-btn:disabled {
  opacity: 0.6;
}

.delete-row {
  margin-top: 22px;
  padding-top: 14px;
  border-top: 2px dashed var(--dash, #d8cba8);
  text-align: center;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  background: none;
  color: #b23a2a;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* Pop-up */
.popup-overlay {
  position: fixed;
  /* makes the element stretch to cover its whole container */
  inset: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(42, 32, 24, 0.55);
}

/* the "Updated" pop-up sits above the edit pop-up */
.popup-overlay.on-top {
  z-index: 1060;
}

.popup-card {
  width: 100%;
  max-width: 360px;
  padding: 28px 24px 24px;
  text-align: center;
  background: #fffbf0;
  border: 2px solid #d8cba8;
  border-radius: 22px;
  color: #2a2018;
  font-family: 'Nunito Sans', sans-serif;
  box-shadow: 0 18px 40px rgba(42, 32, 24, 0.3);
}

.popup-card h2 {
  margin: 0 0 6px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.8rem;
  font-weight: 700;
}

.popup-card p {
  margin: 0;
  font-size: 1.15rem;
  color: #6b5d4d;
}

.popup-tick {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #4f7f55;
  color: #fff;
  font-size: 2rem;
  /* (name, duration, delay, fill-mode (control how it looks before and after))*/
  animation: tick-pop 0.5s 0.1s both;
}

.popup-enter-active,
.popup-leave-active { transition: opacity 0.2s ease; }
.popup-enter-from,
.popup-leave-to { opacity: 0; }
.popup-enter-active .popup-card { animation: card-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }

@keyframes card-pop {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

@keyframes tick-pop {
  0%   { transform: scale(0); }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}

/* Players who turn off motion in their device settings get no animation */
@media (prefers-reduced-motion: reduce) {
  .popup-tick,
  .edit-card,
  .popup-enter-active .popup-card { animation: none; }
}
</style>
