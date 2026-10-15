// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/api.js
// purpose:    - axios to call our server
// imports:    axios (HTTP calls to our server), the client's supabase from ./supabase (to read the current session token)
// ----------------------------------------------------------------------------------------------------------

import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
})

// Get the user token from the browser
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
        config.headers.Authorization = `Bearer ${data.session.access_token}`
    }
    return config
})