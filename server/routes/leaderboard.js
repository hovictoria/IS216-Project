// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename: /routes/leaderboard.js
// purpose:  - Display the MemoryGo leaderboard
//           - Rank all registered users based on total XP
//           - Display player names
//           - Highlight the currently logged-in user
// routes:   GET /api/leaderboard
// tables:   Supabase Auth + progress
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
    try {
        // Get registered users
        const users = []
        const perPage = 1000

        for (let page = 1; ; page++) {
            const { data, error } = await supabase.auth.admin.listUsers({
                page,
                perPage
            })

            if (error) throw error

            users.push(...data.users)

            if (data.users.length < perPage) break
        }

        // Get users' XP
        const { data: progress, error: progressError } = await supabase
            .from('progress')
            .select('user_id, xp')
            .range(0, 9999)

        if (progressError) throw progressError

        // Match XP with users
        const xpByUser = new Map(
            (progress || []).map(row => [row.user_id, row.xp ?? 0])
        )

        // Rank users from highest to lowest XP
        const leaderboard = users
            .map(user => ({
                userId: user.id,
                name: user.user_metadata?.display_name || 'MemoryGo Explorer',
                xp: xpByUser.get(user.id) ?? 0,
                isCurrentUser: user.id === req.user.id
            }))
            .sort((a, b) => b.xp - a.xp)
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }))

        res.json({ leaderboard })

    } catch (error) {
        console.error('LEADERBOARD ERROR:', error)
        res.status(500).json({
            message: 'Could not load leaderboard.'
        })
    }
})

export default router
