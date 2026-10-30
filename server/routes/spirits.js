import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

// Spirits now come from the new tables (docs/spirits.sql):
//   spirit_catalog   = all 24 spirits, each hiding at one place
//   spirit_finds     = which spirits this player has found
//   spirit_sets_done = which area sets this player has completed
// Finding a spirit happens in /api/visits/:id/finish (your first paid game at its place), not here.
// The old `spirits` / `user_spirits` tables are left in Supabase but no longer used.

// GET /api/spirits → every spirit (with its place), plus which ones this user has found and which sets they finished
router.get('/', requireAuth, async (req, res) => {
    // all 3 at the same time (one after another took about 3x as long)
    const [catalog, finds, sets] = await Promise.all([
        // 1. All 24 spirits, in the design's order, with the place they hide at
        supabase
            .from('spirit_catalog')
            .select('id, name, color, rarity, set_name, lore, sort_order, place_id, places(name, lat, lng)')
            .order('sort_order'),
        // 2. Only THIS (current) user's found spirits
        supabase
            .from('spirit_finds')
            .select('spirit_id, found_at, game, visit_id')
            .eq('user_id', req.user.id),
        // 3. The area sets this user has completed (each paid a bonus chest once)
        supabase
            .from('spirit_sets_done')
            .select('set_name, done_at, bonus_coins')
            .eq('user_id', req.user.id),
    ])
    const { data: spirits, error: spiritsError } = catalog
    const { data: found, error: foundError } = finds
    const { data: setsDone, error: setsError } = sets

    if (spiritsError) {
        console.error(spiritsError)
        return res.status(500).json({ message: 'Could not load spirits.' })
    }

    if (foundError) {
        console.error(foundError)
        return res.status(500).json({ message: 'Could not load your collection.' })
    }

    if (setsError) {
        console.error(setsError)
        return res.status(500).json({ message: 'Could not load your sets.' })
    }

    //flatten the place so the page can just use spirit.placeName etc.
    const rows = spirits.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        rarity: s.rarity,
        set: s.set_name,
        lore: s.lore,
        placeId: s.place_id,
        placeName: s.places?.name ?? null,
        lat: s.places?.lat ?? null,
        lng: s.places?.lng ?? null,
    }))

    res.json({ spirits: rows, found, setsDone })
})

// today's date in Singapore as 'YYYY-MM-DD' (same approach as streak.js)
function singaporeToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

// how many spirits this user has found today (since midnight Singapore time)
// used by /today (dashboard ✓)
// returns { count } or { error }
async function countFoundToday(userId) {
    const startOfToday = `${singaporeToday()}T00:00:00+08:00`   // midnight today in Singapore
    const { count, error } = await supabase
        .from('spirit_finds')
        .select('spirit_id', { count: 'exact', head: true })   // just count the rows, don't fetch them
        .eq('user_id', userId)
        .gte('found_at', startOfToday)                         // found at or after midnight today
    return { count, error }
}

// GET /api/spirits/today → { foundToday: true/false }
// used by the dashboard to show a check once the player has found a spirit today
router.get('/today', requireAuth, async (req, res) => {
    const { count, error } = await countFoundToday(req.user.id)

    if (error) {
        console.error(error)
        return res.status(500).json({ message: "Could not check today's spirit." })
    }

    res.json({ foundToday: count > 0 })   // at least 1 spirit today → true
})

// POST /api/spirits/collect → retired.
// It used to give a random spirit with a 50% chance (100% for the first of the day), and could be called
// again and again. Spirits are now found by playing at their place (see /api/visits/:id/finish).
router.post('/collect', requireAuth, (req, res) => {
    res.status(410).json({ message: 'Spirits are now found by playing a game at their place.' })
})


export default router
