// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   stores/auth.js
// purpose:    1. const user        = a user log in detail object record {id, email, when it was created, wheter the email is confirmed}
//             2. const isLoggedIn  = a boolean derived from user. It is used under router/index.js for redirect guards
//             3. function init     = restores a saved session on startup and then keeps user updated for rest of the app's life through a listener
//             4. function signIn   = helps with signin. Sends email and password variables to Supabase and reports back
// imports:    imports supabase to use supabase methods. Imports defineStore from pinia
// ----------------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------------------
// useAuthStore()
//  1. const user
//      - returns a Supabase user object [null when logged out]
//  2. const isLoggedIn
//      - a boolean variable to check if a user isLoggedIn
//      - used in src/router/index.js to check if there is a protected guard for that page whenever the user switches page, 'to'
//  3. function init()
//      - function to check if user has a saved session
//      - used in main.js before app runs to check if the user has a stored saved session within the browser
//  4. function signIn()
//      - function to signIn 
//      - used in login.vue for user error validation during signIn
// ----------------------------------------------------------------------------------------------------------

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

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
            // Client saves session to localStorage, so refresh keeps you logged in
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

    // Helps with the signOut
    async function signOut() {
        await supabase.auth.signOut()
        user.value = null
    }

    // session listener
    // getSession() reads the saved session back by looking in localStorage to check if there is a user or not
    async function init() {
        const { data } = await supabase.auth.getSession()
        // if there is no session, return null
        user.value = data.session?.user ?? null

        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user ?? null
        })
    }

    return { user, isLoggedIn, init, signIn, signUp, signOut }
})