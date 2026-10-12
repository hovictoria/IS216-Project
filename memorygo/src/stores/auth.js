// Auth store: the one place that talks to Supabase Auth.
// Pages read `user` / `isLoggedIn` from here and call signIn / signUp / signOut.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const isLoggedIn = computed(() => user.value !== null)

    // Runs once at startup. Restores a saved session (if any) and keeps
    // `user` in sync when the session changes, e.g. sign-out in another tab.
    async function init() {
        const { data } = await supabase.auth.getSession()
        user.value = data.session?.user ?? null

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user ?? null
        })
    }

    // Returns null on success, or a friendly message to show the user.
    async function signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error) return null

        if (error.message === 'Email not confirmed') {
            return 'Please confirm your email first. Check your inbox for the link.'
        }
        // Generic on purpose: never reveal whether the email exists.
        return "That email or password doesn't match. Please try again."
    }

    // Returns null on success, or a friendly message to show the user.
    async function signUp(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
        })
        if (!error) return null

        if (error.message.toLowerCase().includes('password')) {
            return 'Please choose a longer password (at least 6 characters).'
        }
        return "We couldn't create your account. Please check your details and try again."
    }

    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
    }

    return { user, isLoggedIn, init, signIn, signUp, signOut }
})
