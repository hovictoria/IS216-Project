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
import { singaporeToday } from './streak.js'

const router = Router()

// GET /api/places → [{ id, name, kind, category, lineCodes, lat, lng, radiusM, gameType, year, fact, visited, playedToday, inProgress,
//                     spiritHidden, spiritFound }]
// (no coin amount: rewards depend on how well you play, worked out when a visit finishes)
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('places')
        .select('id, name, kind, category, line_codes, lat, lng, radius_m, game_type, year, fact, url')
        .eq('is_active', true)          // hidden places stay in the table but don't show on the map
        .order('id')

    if (error) {
        console.error(error)
        return res.status(500).json({ message: 'Could not load places.' })
    }

    // What THIS user has played (the visits table, step 6):
    //   visited     = finished a game there at least once → green pin, for good
    //   playedToday = FINISHED a paid game there today (Singapore date) → "Played today · back tomorrow"
    //   inProgress  = tapped in for a paid game in the last 30 min but didn't finish → "Continue"
    //                 (tapping in again resumes it, see routes/visits.js)
    const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('place_id, visit_date, paid, started_at, finished_at')
        .eq('user_id', req.user.id)

    if (visitsError) {
        console.error(visitsError)
        return res.status(500).json({ message: 'Could not load places.' })
    }

    const today = singaporeToday()
    const visitedIds = new Set(visits.filter((v) => v.finished_at).map((v) => v.place_id))
    const paidToday = visits.filter((v) => v.paid && v.visit_date === today)
    const finishedTodayIds = new Set(paidToday.filter((v) => v.finished_at).map((v) => v.place_id))
    const inProgressIds = new Set(paidToday
        .filter((v) => !v.finished_at && Date.now() - new Date(v.started_at) < 30 * 60_000)
        .map((v) => v.place_id))

    // Spirits (docs/spirits.sql): which places have one, and which of those this user has found.
    //   spiritHidden = a Spirit is hiding here and you haven't found it → chest pin, "A Spirit is hiding here"
    //   spiritFound  = you've found this place's Spirit
    // The Spirit's name isn't sent: what's hiding stays a surprise until you find it
    const [{ data: catalog, error: catalogError }, { data: finds, error: findsError }] = await Promise.all([
        supabase.from('spirit_catalog').select('id, place_id').not('place_id', 'is', null),
        supabase.from('spirit_finds').select('spirit_id').eq('user_id', req.user.id),
    ])

    if (catalogError || findsError) {
        console.error(catalogError ?? findsError)
        return res.status(500).json({ message: 'Could not load places.' })
    }

    const foundSpiritIds = new Set(finds.map((f) => f.spirit_id))
    const spiritAtPlace = new Map(catalog.map((c) => [c.place_id, c.id]))

    // database names (snake_case) -> JavaScript names (camelCase)
    const places = data.map((row) => ({
        spiritHidden: spiritAtPlace.has(row.id) && !foundSpiritIds.has(spiritAtPlace.get(row.id)),
        spiritFound: spiritAtPlace.has(row.id) && foundSpiritIds.has(spiritAtPlace.get(row.id)),
        visited: visitedIds.has(row.id),
        playedToday: finishedTodayIds.has(row.id),
        inProgress: inProgressIds.has(row.id),
        id: row.id,
        name: row.name,
        kind: row.kind,
        category: row.category,
        lineCodes: row.line_codes,
        lat: row.lat,
        lng: row.lng,
        radiusM: row.radius_m,
        gameType: row.game_type,
        year: row.year,
        fact: row.fact,
        url: row.url,                   // "Read more" page (roots.gov.sg) for imported places
    }))

    res.json({ places })
})

export default router
