<script setup>
    import { ref } from 'vue'
    import { useAuthStore } from '@/stores/auth.js'

    import AuthLayout from './AuthLayout.vue'
    import TextField from '@/components/ui/TextField.vue'
    import PrimaryButton from '@/components/ui/PrimaryButton.vue'
    import HandUnderline from '@/components/ui/HandUnderline.vue'

    const auth = useAuthStore()

    const email = ref('')
    const loading = ref(false)          // toggles the submit button while the email is being sent
    const error = ref('')               // Store error messages to be displayed
    const sent = ref(false)             // true once the link has been sent

    // Send link Button
    async function onSubmit() {
        error.value = ''

        if (!email.value.trim().includes('@')) {
            error.value = 'Please type the email you signed up with.'
            return
        }

        loading.value = true
        const message = await auth.sendPasswordReset(email.value.trim())
        loading.value = false

        if (message) {
            error.value = message
        } else {
            sent.value = true
        }
    }
</script>

<template>
    <AuthLayout variant="form">
        <form class="auth-form" novalidate v-on:submit.prevent="onSubmit">

            <h1 class="heading">Forgot <HandUnderline>password?</HandUnderline></h1>

            <template v-if="sent">
                <p class="notice" role="status">
                    If <strong>{{ email.trim() }}</strong> has a MemoryGo account, we've sent it a link.
                    Open the email and tap the link to choose a new password.
                </p>
                <p class="intro">No email after a few minutes? Check your spam folder, or
                    <button type="button" class="link link-button" @click="sent = false">try again</button>.
                </p>
            </template>


            <template v-else>
                <p class="intro">Type your email and we'll send you a link to choose a new password.</p>

                <div class="fields">
                    <TextField id="forgot-email" v-model="email" label="Email" type="email" autocomplete="email"
                        placeholder="you@example.com" />
                </div>

                <!-- Display any error messages if exists -->
                <p v-if="error" class="error" role="alert">{{ error }}</p>

                <PrimaryButton type="submit" :disabled="loading" class="submit">
                    {{ loading ? 'Sending…' : 'Send link' }}
                </PrimaryButton>
            </template>

            <p class="switch">
                Remembered it?
                <router-link to="/login" class="link">Back to sign in</router-link>
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
        margin: 30px 0 0;
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

    .notice {
        margin: 45px 0 0;
        padding: 14px 16px;
        border-radius: 14px;
        background: var(--sage);
        color: var(--ink);
        font-size: 18px;
        font-weight: 600;
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

    .link-button {
        padding: 0;
        border: 0;
        background: none;
        font: inherit;
        font-weight: 800;
    }

    .sent-box {
    margin-top: 32px;          
    padding: 20px 24px;        
    line-height: 1.55;
    }

    .hint {
        margin-top: 24px;
        line-height: 1.6;
    }

    .switch {
        margin-top: 40px;         
    }
</style>
