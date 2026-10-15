// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /supabase.js
// purpose:    - builds the connection to Supabase project within server and hands it out to the rest of the files in /server
//             - built from .env.local. variables therefore import dotenv/config
// imports:    imports createClient from supabase library to make a connection object
// ----------------------------------------------------------------------------------------------------------

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
// This key bypasses Row Level Security, so every route MUST scope its queries
// to req.user.id (set by the auth middleware). Never send this key to a browser.

// Server key > Allow server to read and change anyone's data
// Client key > Resident key. Row Level security because even if the user fiddles with the browser, it can't get into anyone else's data

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.')
    process.exit(1)
}

// Anyone can use supabase methods by calling supabase within server
export const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },   // a server has no "logged-in user" of its own
})