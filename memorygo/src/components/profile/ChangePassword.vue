<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/profile/ChangePassword.vue
purpose:    - Change password (Me handoff 05 / laptop 03), split out of the original Edit Profile pop-up
            - the checks and the save are the original code: both boxes needed, at least 6 characters,
              different from the current one, then auth.changePassword (checks the current password first)
            - "Email me a reset link" sends the same reset email as "Forgot password?" at sign in
emits:      close
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import TextField from '@/components/ui/TextField.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import HandUnderline from '@/components/ui/HandUnderline.vue'
import MeSheet from './MeSheet.vue'

const emit = defineEmits(['close'])
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const passwordError = ref('')
const saving = ref(false)       // toggles the Update button while saving
const done = ref(false)         // true once saved: shows the "Updated!" message

const resetNote = ref('')       // "We've emailed you a link" (or why it couldn't)

// Checks the boxes before saving
function checkForm() {
    if (!currentPassword.value || !newPassword.value) {
        passwordError.value = 'Please type both your current password and your new password.'
    } else if (newPassword.value.length < 6) {
        passwordError.value = 'Please choose a longer password (at least 6 characters).'
    } else if (newPassword.value === currentPassword.value) {
        passwordError.value = 'Your new password must be different from your current one.'
    }
    return !passwordError.value
}

async function save() {
    passwordError.value = ''
    if (!checkForm()) return

    saving.value = true
    const message = await auth.changePassword(currentPassword.value, newPassword.value)
    saving.value = false

    if (message) {
        passwordError.value = message
    } else {
        currentPassword.value = ''
        newPassword.value = ''
        done.value = true
    }
}

// Forgot the current one: the reset email (same as at sign in)
async function sendReset() {
    const message = await auth.sendPasswordReset(auth.user.email)
    resetNote.value = message ?? `We've emailed a reset link to ${auth.user.email}.`
}
</script>

<template>
    <!-- "Updated!" after saving -->
    <MeSheet v-if="done" label-id="password-done-title" @close="emit('close')">
        <template #title>Updated!</template>
        <div class="done">
            <span class="done-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" /></svg>
            </span>
            <p class="done-text">Your password has been updated.</p>
        </div>
        <template #actions>
            <PrimaryButton type="button" @click="emit('close')">OK</PrimaryButton>
        </template>
    </MeSheet>

    <MeSheet v-else label-id="password-title" @close="emit('close')">
        <template #title>Change <HandUnderline>password</HandUnderline></template>

        <p class="lead">Keep your account safe. You'll stay signed in on this device.</p>

        <!-- ".prevent" stops the browser's default behaviour of reloading the page -->
        <!-- autocomplete: "current-password" lets the browser fill in the saved one, "new-password" lets it
             suggest a strong new one and offer to save it -->
        <form id="password-form" class="fields" novalidate @submit.prevent="save">
            <TextField id="current-password" v-model="currentPassword" label="Current password" type="password"
                autocomplete="current-password" />
            <div>
                <TextField id="new-password" v-model="newPassword" label="New password" type="password"
                    autocomplete="new-password" />
                <p class="hint">At least 6 characters.</p>
            </div>
            <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
        </form>

        <p class="forgot">
            Forgot your current password?<br />
            <button type="button" class="link" @click="sendReset">Email me a reset link</button>
        </p>
        <p v-if="resetNote" class="reset-note" role="status">{{ resetNote }}</p>

        <template #actions>
            <button type="button" class="outline-btn sheet-cancel" @click="emit('close')">Cancel</button>
            <PrimaryButton type="submit" form="password-form" :disabled="saving">
                {{ saving ? 'Saving…' : 'Update password' }}
            </PrimaryButton>
        </template>
    </MeSheet>
</template>

<style scoped>
.lead {
    margin: -8px 0 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--muted);
}

/* the boxes sit in a glass card */
.fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border: var(--glass-border);
    border-radius: var(--radius-card);
    background: var(--glass-strong-bg);
    box-shadow: var(--glass-shadow);
}

.hint {
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--muted);
}

.form-error {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--error-bg);
    color: var(--error-ink);
    font-size: 16px;
    font-weight: 700;
}

.forgot {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    text-align: center;
}

.link {
    min-height: var(--tap-min);
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    font-size: 17px;
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
}

.reset-note {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
}

.outline-btn {
    flex-shrink: 0;
    min-height: var(--cta-height);
    padding: 0 26px;
    border: 1.5px solid var(--ink);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font-size: 18px;
    font-weight: 800;
}

.done {
    display: flex;
    align-items: center;
    gap: 16px;
}

.done-tick {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--sage);
}

.done-tick svg {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.done-text {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
}
</style>
