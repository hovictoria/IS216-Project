<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from './AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()

// ---------- Form state ----------
const email = ref('')            // what the user typed in the email box
const password = ref('')         // what the user typed in the password box
const showPassword = ref(false)  // eye toggle: true = show as text, false = dots

// ---------- Sign-in state ----------
const loading = ref(false)       // true while we wait for Supabase
const error = ref('')            // friendly message to show if sign-in fails

async function onSubmit() {
    loading.value = true
    error.value = ''

    const message = await auth.signIn(email.value.trim(), password.value)
    password.value = ''
    loading.value = false

    if (message) {
        error.value = message      // show it above the sign-in button
    } else {
        router.push('/home')       // signed in: go to the main menu
    }
}

function onForgotPassword() {
    // TODO: password reset flow
}

function onCreateAccount() {
    // TODO: router.push('/signup') once the signup page exists
}
</script>

<template>
    <AuthLayout compact>
        <form class="login mt-3" novalidate @submit.prevent="onSubmit">

            <p class="intro">Welcome back! Sign in to continue your journey.</p>

            <!-- Email -->
            <div class="field">
                <label for="login-email">Email</label>
                <input
                    id="login-email"
                    v-model="email"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    autocapitalize="none"
                    spellcheck="false"
                    required
                />
            </div>

            <!-- Password with show/hide toggle -->
            <div class="field">
                <label for="login-password">Password</label>
                <div class="password-wrap">
                    <input
                        id="login-password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password"
                        required
                    />
                    <button
                        type="button"
                        class="toggle"
                        @click="showPassword = !showPassword"
                    >
                        <svg v-if="!showPassword" viewBox="0 0 24 24">
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2" />
                            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
                        </svg>
                        <svg v-else viewBox="0 0 24 24">
                            <path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                </div>
            </div>

            <!-- Error message, only in the page when there is one -->
            <p v-if="error" id="login-error" class="error" role="alert">{{ error }}</p>

            <button type="button" class="link forgot" @click="onForgotPassword">
                Forgot your password?
            </button>

            <button type="submit" class="signin-btn" :disabled="loading">
                {{ loading ? 'Signing in…' : 'Sign in' }}
            </button>

            <p class="signup">
                New to Memory Go?
                <button type="button" class="link" @click="onCreateAccount">Create an account</button>
            </p>

        </form>
    </AuthLayout>
</template>

<style scoped>
.login {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    text-align: left;
    color: #2a2017;
}

.intro {
    margin: 0 0 4px;
    font-size: 1.25rem;
    line-height: 1.5;
    color: #4d4134;
}

/* ---------- Fields ---------- */
.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

label {
    font-size: 1.15rem;
    font-weight: 800;
}

input {
    width: 100%;
    min-height: 58px;
    padding: 0 16px;
    border: 2px solid #e3d6b8;
    border-radius: 16px;
    background: #fffbf2;
    color: #2a2017;
    font: inherit;
    font-size: 1.2rem;
}

input:focus-visible {
    outline: none;
    border-color: #2f668f;
    box-shadow: 0 0 0 3px rgba(47, 102, 143, 0.35);
}

/* ---------- Show / hide toggle ---------- */
.password-wrap {
    position: relative;
}

.password-wrap input {
    padding-right: 108px;
}

.toggle {
    position: absolute;
    top: 50%;
    right: 7px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 12px;
    background: #f3e8d2;
    color: #2f668f;
    font: inherit;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    transform: translateY(-50%);
}

.toggle svg {
    width: 22px;
    height: 22px;
}

.toggle:focus-visible {
    outline: 3px solid #2f668f;
    outline-offset: 2px;
}

/* ---------- Error ---------- */
.error {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: #f8e1d8;
    color: #8a3519;
    font-size: 1.05rem;
    font-weight: 700;
}

/* ---------- Links ---------- */
.link {
    min-height: 44px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: #2f668f;
    font: inherit;
    font-size: 1.1rem;
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
    cursor: pointer;
}

.link:focus-visible {
    outline: 3px solid #2f668f;
    outline-offset: 3px;
    border-radius: 6px;
}

.forgot {
    align-self: flex-end;
    margin-top: -6px;
}

/* ---------- Sign in button ---------- */
.signin-btn {
    min-height: 64px;
    border: 0;
    border-radius: 18px;
    background: #b5492a;
    color: #fff;
    box-shadow: 0 5px 0 #8a3519;
    font: inherit;
    font-size: 1.3rem;
    font-weight: 800;
    cursor: pointer;
}

.signin-btn:hover:not(:disabled) {
    background: #a3401f;
}

.signin-btn:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 2px 0 #8a3519;
}

.signin-btn:disabled {
    opacity: 0.7;
    cursor: progress;
}

.signin-btn:focus-visible {
    outline: 4px solid #2f668f;
    outline-offset: 4px;
}

.signup {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 4px 0 0;
    font-size: 1.1rem;
    color: #4d4134;
}
</style>
