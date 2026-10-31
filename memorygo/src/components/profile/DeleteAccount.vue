<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/profile/DeleteAccount.vue
purpose:    - "Delete account?": type your password to confirm, then the account and everything saved for it
              is deleted (auth.deleteAccount → DELETE /api/me)
            - after: "Account deleted" with OK, which signs out and goes to the landing page
            - the logic is the original Delete account code; only the look changed (same frame as Edit profile)
emits:      close ("Keep my account" goes back to Edit profile)
---------------------------------------------------------------------------------------------------------->

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TextField from '@/components/ui/TextField.vue'
import MeSheet from './MeSheet.vue'

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
    <!-- Goodbye, after the account is deleted (can't be closed: OK signs out) -->
    <MeSheet v-if="deleted" label-id="bye-title" @close="finish">
        <template #title>Account deleted</template>
        <p class="lead">Your account and progress have been deleted. Thank you for exploring with MemoryGo.</p>
        <template #actions>
            <button type="button" class="main-btn" @click="finish">OK</button>
        </template>
    </MeSheet>

    <!-- Are you sure? -->
    <MeSheet v-else label-id="delete-title" @close="emit('close')">
        <template #title>Delete account?</template>

        <div class="warning">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 L22 20 H2 Z M12 9.5 V14 M12 17 V17.2" />
            </svg>
            <p>
                This <strong>cannot be undone</strong>. You will lose your level, XP, coins,
                Spirits and everywhere you have visited.
            </p>
        </div>

        <!-- ".prevent" stops the browser's default behaviour of reloading the page -->
        <form id="delete-form" novalidate @submit.prevent="confirmDelete">
            <TextField id="delete-password" v-model="password" label="Type your password to confirm"
                type="password" autocomplete="current-password" />
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        </form>

        <template #actions>
            <div class="delete-actions">
                <button type="submit" form="delete-form" class="danger-btn" :disabled="deleting">
                    {{ deleting ? 'Deleting…' : 'Delete my account' }}
                </button>
                <button type="button" class="keep-btn" @click="emit('close')">Keep my account</button>
            </div>
        </template>
    </MeSheet>
</template>

<style scoped>
.lead {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
}

.warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 20px;
    background: var(--error-bg);
    color: var(--error-ink);
}

.warning svg {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.warning p {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
}

.form-error {
    margin: 10px 0 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--error-bg);
    color: var(--error-ink);
    font-size: 16px;
    font-weight: 700;
}

/* buttons: one above the other on phones, side by side on bigger screens (Keep on the left) */
.delete-actions {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
}

@media (min-width: 768px) {
    .delete-actions {
        flex-direction: row-reverse;
    }
}

.keep-btn,
.danger-btn,
.main-btn {
    flex: 1;
    min-height: var(--cta-height);
    padding: 0 20px;
    border-radius: var(--radius-pill);
    font-size: 18px;
    font-weight: 800;
}

.keep-btn {
    border: 1.5px solid var(--ink);
    background: transparent;
    color: var(--ink);
}

.danger-btn {
    border: 0;
    background: #B23A1E;
    color: var(--white);
}

.danger-btn:disabled {
    opacity: 0.6;
}

.main-btn {
    border: 0;
    background: var(--ink);
    color: var(--white);
}
</style>
