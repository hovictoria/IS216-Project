// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/me.js
// purpose:    - a mini app via to be exported via const router. Router() basically creates a self-contained Express app
//             - handles CRUD for user me
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
    const { id, email, user_metadata } = req.user
    res.json({ id, email, displayName: user_metadata?.display_name ?? null })
})

// Every table that keeps rows for one player (user_id column)
const USER_TABLES = ['visits', 'daily_rewards', 'spirit_finds', 'spirit_sets_done', 'progress']

// DELETE /api/me → delete the signed-in player's account and everything saved for them
// The app checks their password before calling this (stores/auth.js deleteAccount)
router.delete('/', requireAuth, async (req, res) => {
    try {
        // Their game data first, so nothing is left behind
        for (const table of USER_TABLES) {
            const { error } = await supabase.from(table).delete().eq('user_id', req.user.id)
            if (error) throw error
        }

        // Then the account itself (needs the service role key, which only the server has)
        const { error } = await supabase.auth.admin.deleteUser(req.user.id)
        if (error) throw error

        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not delete your account.' })
    }
})

export default router