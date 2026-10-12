// Checks the "Authorization: Bearer <token>" header the client sends,
// asks Supabase who the token belongs to, and puts that user on req.user.
// Routes behind this middleware can trust req.user.id.
import { supabase } from '../supabase.js'

export async function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
        return res.status(401).json({ message: 'Not signed in.' })
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
        return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }

    req.user = data.user
    next()
}
