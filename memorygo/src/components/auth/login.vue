<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/login.vue
purpose:    - login page -> when user visits ('/login'). The form goes inside AuthLayout's sheet
            - handles the user login input form
            - function onSubmit handles the routing to the map or displaying error via useAuthStore function
imports:    AuthLayout.vue, ui/TextField.vue, ui/PrimaryButton.vue, ui/HandUnderline.vue, useAuthStore
---------------------------------------------------------------------------------------------------------->

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { useAuthStore } from '@/stores/auth.js'

    import AuthLayout from './AuthLayout.vue'
    import TextField from '@/components/ui/TextField.vue'
    import PrimaryButton from '@/components/ui/PrimaryButton.vue'
    import HandUnderline from '@/components/ui/HandUnderline.vue'

    const router = useRouter()
    const auth = useAuthStore()

    // User Login Inputs (the Show/Hide toggle now lives inside TextField)
    const email = ref('')
    const password = ref('')

    // Sign-in state
    const loading = ref(false)          // toggles the submit button based on if the user is "signing in" state
    const error = ref('')               // Store error messages to be displayed in <p> tag

    // Sign in Button
    async function onSubmit() {         // v-on:submit when the form is being submitted.
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
            router.push('/map')     // no error. signed in: go to the map (new home)
        }
    }
</script>

<template>
    <AuthLayout variant="form">
        <form class="auth-form" novalidate v-on:submit.prevent="onSubmit">

            <!-- Form Title -->
            <h1 class="heading">Welcome <HandUnderline>back</HandUnderline></h1>
            <p class="intro">Sign in to continue your journey</p>

            <div class="fields">
                <TextField id="login-email" v-model="email" label="Email" type="email" autocomplete="email"
                    placeholder="you@example.com" />
                <TextField id="login-password" v-model="password" label="Password" type="password"
                    autocomplete="current-password" />
            </div>

            <!-- Forgot password link -->
            <p class="forgot">
                <router-link to="/forgot-password" class="link">Forgot password?</router-link>
            </p>

            <!-- Display any error messages within a <p> tag if exists -->
            <p v-if="error" class="error" role="alert">{{ error }}</p>

            <!-- Submit Button -->
            <PrimaryButton type="submit" :disabled="loading" class="submit">
                {{ loading ? 'Signing in…' : 'Sign in' }}
            </PrimaryButton>

            <!-- Sign Up link -->
            <p class="switch">
                New to MemoryGo?
                <router-link to="/signup" class="link">Create an account</router-link>
            </p>
        </form>
    </AuthLayout>
</template>

<style scoped>
    .auth-form {
        display: flex;
        flex-direction: column;
    }

    .heading {
        margin: 0;
        font-family: var(--font);   /* the app font (not the browser's heading font) */
        font-size: clamp(40px, 11vw, 56px);
        font-weight: 700;
        line-height: 0.95;
        letter-spacing: var(--tracking-tight);
    }

    .intro {
        margin: 14px 0 0;
        color: var(--muted);
        font-size: 18px;
        font-weight: 500;
    }

    .fields {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 22px;
    }

    .forgot {
        margin: 4px 0 0;
        text-align: right;
        font-size: 17px;
    }

    .error {
        margin: 16px 0 0;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--error-bg);
        color: var(--error-ink);
        font-size: 17px;
        font-weight: 700;
    }

    .submit {
        margin-top: 24px;
    }

    .switch {
        margin: 12px 0 0;
        text-align: center;
        font-size: 17px;
        font-weight: 500;
    }

    .link {
        display: inline-flex;
        align-items: center;
        min-height: var(--tap-min);
        color: var(--ink);
        font-weight: 800;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 5px;
    }
</style>
