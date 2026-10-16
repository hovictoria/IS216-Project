import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/spirits → every spirit, plus which ones this user has found
router.get('/', requireAuth, async (req, res) => {
    // 1. All 50 spirits 
    const { data: spirits, error: spiritsError } = await supabase
        .from('spirits')
        .select('id, name, category, emoji')
        .order('id')

    if (spiritsError) {
        console.error(spiritsError)
        return res.status(500).json({ message: 'Could not load spirits.' })
    }

    // 2. Only THIS (current) user's found spirits
    const { data: found, error: foundError } = await supabase
        .from('user_spirits')
        .select('spirit_id, station_id, collected_at')
        .eq('user_id', req.user.id)

    if (foundError) {
        console.error(foundError)
        return res.status(500).json({ message: 'Could not load your collection.' })
    }

    res.json({ spirits, found })
})

export default router
