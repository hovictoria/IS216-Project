// One Supabase client for the server, using the secret service_role key.
// This key bypasses Row Level Security, so every route MUST scope queries
// to req.user.id (set by the auth middleware). Never send this key to a browser.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.')
    process.exit(1)
}

export const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
})
