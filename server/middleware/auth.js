// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /middleware/auth.js
// purpose:    - runs before any protected route and decides whether the request gets in
//             - checks whether the user is legitimate and return the userID so it is able to access the server supabase database
// imports:    the shared supabase client from ../supabase.js (used only to verify the token with getUser)
// ----------------------------------------------------------------------------------------------------------

// Checks the "Authorization: Bearer <token>" header the client sends,
// asks Supabase who the token belongs to, and puts that user on req.user.
// Routes behind this middleware can trust req.user.id.
import { supabase } from '../supabase.js'

export async function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? ''                          // read the authorization header in the browser
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''       // Strip 'Bearer' from the string header to get the token

    if (!token) {                                                           // no token means nobody logged in
        return res.status(401).json({ message: 'Not signed in.' })      
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
        return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }

    // Stick the user onto the request route
    // Browser got the token from Supabase on login
    // Supabase issued it > browser carried the token > server hand it back to Supabae to verify (for security)
    req.user = data.user        
    next()
}