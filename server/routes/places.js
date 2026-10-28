// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/places.js
// purpose:    - sends the map every place a player can visit (heritage spots + MRT stations)
//             - reads the `places` table (docs/places.sql). The browser can't read that table itself (RLS),
//               so this route is the only way in
//             - renames columns to camelCase (radius_m -> radiusM) so the Vue code reads like the rest of it
// note:       - only facts that are the same for everyone. Whether THIS user has played a place comes later
//               from the `visits` table
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

// GET /api/places → [{ id, name, kind, category, lineCodes, lat, lng, radiusM, gameType, rewardCoins, year, fact }]
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('places')
        .select('id, name, kind, category, line_codes, lat, lng, radius_m, game_type, reward_coins, year, fact')
        .eq('is_active', true)          // hidden places stay in the table but don't show on the map
        .order('id')

    if (error) {
        console.error(error)
        return res.status(500).json({ message: 'Could not load places.' })
    }

    // database names (snake_case) -> JavaScript names (camelCase)
    const places = data.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        category: row.category,
        lineCodes: row.line_codes,
        lat: row.lat,
        lng: row.lng,
        radiusM: row.radius_m,
        gameType: row.game_type,
        rewardCoins: row.reward_coins,
        year: row.year,
        fact: row.fact,
    }))

    res.json({ places })
})

export default router
