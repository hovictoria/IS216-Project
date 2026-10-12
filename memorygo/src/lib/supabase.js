// One shared Supabase client for the whole app.
// Values come from .env.local (never commit that file).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
    throw new Error('Supabase env values are missing. Check .env.local and restart the dev server.')
}

export const supabase = createClient(url, key)
