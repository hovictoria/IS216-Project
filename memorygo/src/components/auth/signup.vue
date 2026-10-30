<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/signup.vue
purpose:    - sign up page -> when user visits ('/signup'). The form goes inside AuthLayout's sheet
            - handles the create-account form (name, email, password)
            - no "confirm password": the Show button lets people check what they typed, and typing a
              password twice on a phone keyboard is a common reason older users give up
            - function onSubmit asks useAuthStore.signUp to create the account
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

    // User Sign Up Inputs
    const name = ref('')
    const email = ref('')
    const password = ref('')

    // Sign-up state
    const loading = ref(false)          // toggles the submit button while the account is being created
    const error = ref('')               // Store error messages to be displayed in <p> tag

    // Create account Button
    async function onSubmit() {
        error.value = ''
        loading.value = true

        // Ask the store to create the account. Returns null on success, or an error message to show
        const message = await auth.signUp(email.value.trim(), password.value, name.value.trim())

        // resets const variables
        password.value = ''
        loading.value = false

        // If there is an error upon sign up (useAuthStore would return an error message, else null if success)
        if (message) {
            error.value = message
        } else {
            router.push('/map')     // no error. account created and signed in: go to the map (new home)
        }
    }
</script>

<template>
    <AuthLayout variant="form">
        <form class="auth-form" novalidate v-on:submit.prevent="onSubmit">

            <!-- Form Title -->
            <h1 class="heading">Join <HandUnderline>MemoryGo</HandUnderline></h1>
            <p class="intro">Create your account to start exploring</p>

            <div class="fields">
                <TextField id="signup-name" v-model="name" label="Name" autocomplete="name"
                    placeholder="What should we call you?" />
                <TextField id="signup-email" v-model="email" label="Email" type="email" autocomplete="email"
                    placeholder="you@example.com" />
                <TextField id="signup-password" v-model="password" label="Password" type="password"
                    autocomplete="new-password" placeholder="At least 6 characters" />
            </div>

            <!-- Display any error messages within a <p> tag if exists -->
            <p v-if="error" class="error" role="alert">{{ error }}</p>

            <!-- Submit Button -->
            <PrimaryButton type="submit" :disabled="loading" class="submit">
                {{ loading ? 'Creating account…' : 'Create account' }}
            </PrimaryButton>

            <!-- Back to Login -->
            <p class="switch">
                Already have an account?
                <router-link to="/login" class="link">Sign in</router-link>
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
        font-size: clamp(38px, 10.5vw, 54px);
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
        gap: 12px;
        margin-top: 18px;
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
        margin-top: 22px;
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
