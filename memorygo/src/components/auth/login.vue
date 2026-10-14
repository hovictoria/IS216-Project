<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/login.vue 
purpose:    - login page -> when user visits ('/login'). Configure the card within </slot> in AuthLayout.vue
            - handles the user login input form
            - function onSubmit handles the routing to menu or displaying error via useAuthStore function
imports:    imports AuthLayout.vue, useAuthStore functions from src/stores/auth
---------------------------------------------------------------------------------------------------------->

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { useAuthStore } from '@/stores/auth.js';

    import AuthLayout from './AuthLayout.vue';

    const router = useRouter()
    const auth = useAuthStore()

    // User Login Inputs
    const email = ref('')
    const password = ref('')
    const showPassword = ref(false)     // for the show password toggle

    // Sign-in state
    const loading = ref(false)          // toggles the submit button based on if the user is "signing in" state
    const error = ref('')               // Store error messages to be displayed in <p> tag

    // Sign in Button
    async function onSubmit() {         // v-on:click when the form is being submitted.
        loading.value = true
        error.value = ''

        // Ask the store to sign in. Returns null on success, or an error message to show
        const message = await auth.signIn(email.value.trim(), password.value)

        // resets const variables
        password.value = ''
        loading.value = false

        // If there is an error upon sign in (useAuthStore would return an error message upon sign in, else null if success)
        if (message) {
            error.value = message       
        } else {
            router.push('/menu')    // no error. signed in: go to the main menu
        }
    }
</script>

<template>
    <AuthLayout>
        <form class="login mt-3" novalidate v-on:submit.prevent="onSubmit">

            <!-- Form Title -->
            <p class="intro">Welcome back! Sign in to continue your journey</p>

            <!-- Email Field -->
            <div class="field">
                <label for="login-email">Email</label>
                <input id="login-email" v-model="email" type="email" autocomplete="email" required />
            </div>

            <!-- Password Field -->
            <div class="field">
                <label for="login-password">Password</label>
                <div class="password-wrap">
                    <input id="login-password" v-model="password" v-bind:type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password" required />
                    <button type="button" class="toggle" v-on:click="showPassword = !showPassword">
                        {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                </div>
            </div>

            <!-- Display any error messages within a <p> tag if exists-->
            <p v-if="error" class="error">{{ error }}</p>

            <!-- Submit Button -->
            <button type="submit" class="signin-btn" v-bind:disabled="loading">
                {{ loading ? 'Signing in…' : 'Sign in' }}
            </button>

            <!-- Sign Up Button -->
            <p class="signup">
                New to Memory Go?
                <button type="button" class="link">Create an account</button>
            </p>
        </form>
    </AuthLayout>
</template>

<style scoped>
    /* form: stack everything vertically with even gaps */
    .login {
        display: flex;
        flex-direction: column;
        gap: 16px;
        text-align: left;
    }

    .intro {
        margin: 0 0 4px;
        font-size: 1.2rem;
        line-height: 1.5;
        color: #4d4134;
    }

    /* one label + one input */
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

    /* password box with the Show/Hide button sitting inside it on the right */
    .password-wrap {
        position: relative;
    }

    .password-wrap input {
        padding-right: 90px;          /* leave room for the toggle */
    }

    .toggle {
        position: absolute;
        top: 50%;
        right: 7px;
        transform: translateY(-50%);  /* centre it vertically */
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
    }

    /* error box */
    .error {
        margin: 0;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f8e1d8;
        color: #8a3519;
        font-size: 1.05rem;
        font-weight: 700;
    }

    /* sign in button: same look as the landing's start button */
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

    /* "New to Memory Go? Create an account" */
    .signup {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 4px;
        margin: 4px 0 0;
        font-size: 1.1rem;
        color: #4d4134;
    }

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
        text-underline-offset: 4px;
        cursor: pointer;
    }
</style>