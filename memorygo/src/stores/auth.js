// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   stores/auth.js
// purpose:    1. const user        = a user log in detail object record {id, email, when it was created, wheter the email is confirmed}
//             2. const isLoggedIn  = a boolean derived from user. It is used under router/index.js for redirect guards
//             3. function init     = restores a saved session on startup and then keeps user updated for rest of the app's life through a listener
//             4. function signIn   = helps with signin. Sends email and password variables to Supabase and reports back
//             5. function sendPasswordReset / updatePassword = forgot password: email a reset link, then save the new password
//             6. function deleteAccount = checks the password, then asks the server (DELETE /api/me) to delete the account
// imports:    imports supabase to use supabase methods. Imports defineStore from pinia
// ----------------------------------------------------------------------------------------------------------


import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'

// Pinia "setup store"
export const useAuthStore = defineStore('auth', () => {

    // user will hold the Supabase user object [null when logged out]
    // router guard will read 'isLoggedIn' to check if the user is logged in to display the right screen pages
    const user = ref(null)
    const isLoggedIn = computed(() => user.value != null)

    // Helps the user SignIn. useAuthStore method used in file "xx"
    async function signIn(email, password) {
        // Use supabase method (.auth.signInWithPassword)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error) {
            // on Success. It contains a session: an access token, refresh token, expiry, and user object
            // Session is kept in memory only (persistSession: false in lib/supabase.js), so a refresh signs you out
            // Starts a timer to swap the access token for a new one before it expires
            return null
        }
        if (error.message === 'Email not confirmed') {
            return 'Please confirm your email first. Check your inbox for the link.'
        }
        return "That email or password doesn't match. Please try again"
    }

    // Helps with the signUp
    // Returns null on success, or a friendly message to show the user.
    async function signUp(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },   // saved on the user, readable later
        })
        if (!error) return null

        if (error.message.toLowerCase().includes('password')) {
            return 'Please choose a longer password (at least 6 characters).'
        }
        return "We couldn't create your account. Please check your details and try again."
    }

    // Helps with forgot password: Supabase emails a link that opens /reset-password
    // Returns null on success, or a friendly message to show the user
    async function sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        if (!error) return null
        return "We couldn't send the email just now. Please wait a minute and try again."
    }

    // Saves a new password. The reset link has already signed the user in
    // Returns null on success, or a friendly message to show the user
    async function updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (!error) return null

        if (error.message.toLowerCase().includes('different')) {
            return 'Please choose a password you have not used before.'
        }
        if (error.message.toLowerCase().includes('password')) {
            return 'Please choose a longer password (at least 6 characters).'
        }
        return "We couldn't save your new password. Please ask for a new reset link."
    }

    // Edit profile: change the name shown around the app (saved on the user as display_name)
    async function updateName(displayName) {
        const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
        if (error) return "We couldn't save your name. Please try again."

        user.value = data.user      // show the new name straight away
        return null
    }

    // Edit profile: change password. Checks the current password first by signing in with it
    async function changePassword(currentPassword, newPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.value.email,
            password: currentPassword,
        })
        if (signInError) return 'Your current password is not correct. Please try again.'

        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (!error) return null

        if (error.message.toLowerCase().includes('different')) {
            return 'Your new password must be different from your current one.'
        }
        if (error.message.toLowerCase().includes('password')) {
            return 'Please choose a longer password (at least 6 characters).'
        }
        return "We couldn't change your password. Please try again."
    }

    async function deleteAccount(password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.value.email,
            password,
        })
        if (signInError) return 'That password is not correct. Please try again.'

        try {
            await api.delete('/me')
        } catch {
            return "We couldn't delete your account just now. Please try again later."
        }

        // forget this player's saved map stations in this browser too
        try { localStorage.removeItem(`memorygo-stations-${user.value.id}`) } catch { /* storage blocked */ }
        return null
    }

    // Helps with the signOut
    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
    }

    // session listener
    // getSession() checks for a session saved in the browser (persistSession: true in lib/supabase.js)
    async function init() {
        const { data } = await supabase.auth.getSession()
        // if there is no session, return null
        user.value = data.session?.user ?? null

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user ?? null
        })
    }

    return {
        user, isLoggedIn, init, signIn, signUp, signOut,
        sendPasswordReset, updatePassword, updateName, changePassword, deleteAccount
    }
})