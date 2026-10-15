<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/signup.vue
purpose:    - sign up page -> when user visits ('/signup'). Configure the card within </slot> in AuthLayout.vue
            - handles the create-account form (name, email, password, confirm password)
            - function onSubmit checks the two passwords match, then asks useAuthStore.signUp to create the account
imports:    imports AuthLayout.vue, useAuthStore functions from src/stores/auth
---------------------------------------------------------------------------------------------------------->

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { useAuthStore } from '@/stores/auth.js';

    import AuthLayout from './AuthLayout.vue';

    const router = useRouter()
    const auth = useAuthStore()

    // User Sign Up Inputs
    const name = ref('')
    const email = ref('')
    const password = ref('')
    const confirm = ref('')
    const showPassword = ref(false)     // one toggle reveals both password boxes

    // Sign-up state
    const loading = ref(false)          // toggles the submit button while the account is being created
    const error = ref('')               // Store error messages to be displayed in <p> tag

    // Create account Button
    async function onSubmit() {
        error.value = ''

        // Check locally first. Nothing is sent to Supabase if the passwords differ
        if (password.value !== confirm.value) {
            error.value = "Those passwords don't match."
            return
        }

        loading.value = true

        // Ask the store to create the account. Returns null on success, or an error message to show
        const message = await auth.signUp(email.value.trim(), password.value, name.value.trim())

        // resets const variables
        password.value = ''
        confirm.value = ''
        loading.value = false

        // If there is an error upon sign up (useAuthStore would return an error message, else null if success)
        if (message) {
            error.value = message
        } else {
            router.push('/menu')    // no error. account created and signed in: go to the main menu
        }
    }
</script>

<template>
    <AuthLayout>
        <form class="signup-form mt-3" novalidate v-on:submit.prevent="onSubmit">

            <!-- Form Title -->
            <p class="intro">Create your account to start exploring</p>

            <!-- Name Field -->
            <div class="field">
                <label for="signup-name">Name</label>
                <input id="signup-name" v-model="name" type="text" autocomplete="name" required />
            </div>

            <!-- Email Field -->
            <div class="field">
                <label for="signup-email">Email</label>
                <input id="signup-email" v-model="email" type="email" autocomplete="email" required />
            </div>

            <!-- Password Field -->
            <div class="field">
                <label for="signup-password">Password</label>
                <div class="password-wrap">
                    <input id="signup-password" v-model="password" v-bind:type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password" required />
                    <button type="button" class="toggle" v-on:click="showPassword = !showPassword">
                        {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                </div>
            </div>

            <!-- Confirm Password Field (follows the same show/hide toggle) -->
            <div class="field">
                <label for="signup-confirm">Confirm password</label>
                <input id="signup-confirm" v-model="confirm" v-bind:type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password" required />
            </div>

            <!-- Display any error messages within a <p> tag if exists-->
            <p v-if="error" class="error">{{ error }}</p>

            <!-- Submit Button -->
            <button type="submit" class="signin-btn" v-bind:disabled="loading">
                {{ loading ? 'Creating account…' : 'Create account' }}
            </button>

            <!-- Back to Login -->
            <p class="signup">
                Already have an account?
                <router-link to="/login" class="link">Sign in</router-link>
            </p>
        </form>
    </AuthLayout>
</template>

<style scoped>
    /* form: stack everything vertically with even gaps */
    .signup-form {
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

    /* create account button: same look as the login's sign in button */
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

    /* "Already have an account? Sign in" */
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
        display: inline-flex;         /* a link is not a button: centre its text ourselves */
        align-items: center;
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
