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
// persistSession: true -> the login is saved in the browser (localStorage), so closing the tab or
//   refreshing keeps the user signed in until they press Sign out. The landing page still shows
//   every time the app opens, with "Continue exploring" instead of the sign-up buttons.
//   Set it to false to sign everyone out whenever the tab closes.
export const supabase = createClient(url, key, {
    auth: { persistSession: true },
})