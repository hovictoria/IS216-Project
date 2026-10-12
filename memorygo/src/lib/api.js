// Axios instance for talking to OUR Express server (not Supabase directly).
// It automatically attaches the signed-in user's token to every request,
// so routes on the server can verify who is asking.
//
// Usage in a page:
//   import { api } from '@/lib/api'
//   const { data } = await api.get('/me')          // -> GET http://127.0.0.1:8000/api/me
//   await api.post('/progress', { xp: 50 })        // -> POST .../api/progress
import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
})

api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
        config.headers.Authorization = `Bearer ${data.session.access_token}`
    }
    return config
})
