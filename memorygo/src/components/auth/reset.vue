<!--------------------------------------------------------------------------------------------------------
PSEUDOCODE
filename:   components/auth/reset.vue
purpose:    - reset password page -> opened from the link in the forgot password email ('/reset-password')
            - the link signs the user in for this visit, so they can save a new password, then go to the map
            - no sign-in from the link (it expired, was used already, or the page was refreshed):
              tell them to ask for a new link
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

    const password = ref('')
    const loading = ref(false)          // toggles the submit button while saving
    const error = ref('')               // Store error messages to be displayed in <p> tag

    // Save password Button
    async function onSubmit() {
        error.value = ''

        if (password.value.length < 6) {
            error.value = 'Please choose a longer password (at least 6 characters).'
            return
        }

        loading.value = true
        const message = await auth.updatePassword(password.value)
        loading.value = false

        if (message) {
            error.value = message
        } else {
            password.value = ''
            router.push('/map')     // saved, and already signed in: go to the map
        }
    }
</script>

<template>
    <AuthLayout variant="form">
        <form class="auth-form" novalidate v-on:submit.prevent="onSubmit">

            <h1 class="heading">New <HandUnderline>password</HandUnderline></h1>

            <!-- The link signed them in and let them choose a new password -->
            <template v-if="auth.isLoggedIn">
                <p class="intro">Choose a new password for your account.</p>

                <div class="fields">
                    <TextField id="reset-password" v-model="password" label="New password" type="password"
                        autocomplete="new-password" />
                </div>
                
                <p v-if="error" class="error" role="alert">{{ error }}</p>

                <PrimaryButton type="submit" :disabled="loading" class="submit">
                    {{ loading ? 'Saving…' : 'Save password' }}
                </PrimaryButton>
            </template>

            <!-- The link didn't work: ask for a new one -->
            <template v-else>
                <p class="error" role="alert">
                    This link has expired or was already used. Please ask for a new one.
                </p>
                <p class="switch">
                    <router-link to="/forgot-password" class="link">Send me a new link</router-link>
                </p>
            </template>
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
