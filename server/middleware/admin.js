// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /middleware/admin.js
// purpose:    - lets a route through only if the signed-in person is an admin
//             - runs AFTER requireAuth (so req.user is already the verified user)
// how:        - an admin is a user whose row in the progress table has role = 'admin'
//             - we read it fresh from the database each time, so removing someone's admin role
//               takes effect straight away
//             - keep users from writing the role column themselves (see the revoke in the SQL notes)
// ----------------------------------------------------------------------------------------------------------

import { supabase } from '../supabase.js'

export async function requireAdmin(req, res, next) {
    try {
        const { data, error } = await supabase
            .from('progress')
            .select('role')
            .eq('user_id', req.user.id)
            .maybeSingle()

        if (error) throw error

        if (data?.role !== 'admin') {
            return res.status(403).json({ message: 'Admins only.' })
        }

        next()
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not check admin access.' })
    }
}