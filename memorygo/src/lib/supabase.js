// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   lib/supabase.js
// purpose:    - builds the connection to Supabase project and hands it out to the rest of the app
//             - built from .env.local. variables
// imports:    imports createClient from supabase library to make a connection object
// ----------------------------------------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
    throw new Error('Supabase env values are missing. Check .env.local and restart the dev server.')
}

// create a supabase connection object
// exported so any file can just use import { supabase }
// persistSession: false -> the login is kept in memory only, not saved to localStorage.
//   Closing the tab or refreshing the page signs the user out, so every visit starts at login.
//   To remember users again, delete the options object (Supabase saves to localStorage by default).
export const supabase = createClient(url, key, {
    auth: { persistSession: false },
})