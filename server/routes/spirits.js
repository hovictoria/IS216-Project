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

// how likely a player is to find a spirit when they complete a station, set it ard 50%
const FIND_CHANCE = 0.5

// POST /api/spirits/collect → body: { stationId }
// Called when a player completes a station, they got a chance to find a new spirit.
// Returns { spirit } if they found one, or { spirit: null } if not this time.
router.post('/collect', requireAuth, async (req, res) => {

    // 1. Read which station they completed (sent by the page)
    //if req.body is missing, don't crash, just give undefined (?.)
    const stationId = Number(req.body?.stationId)
    if (!Number.isInteger(stationId) || stationId < 1) {
        return res.status(400).json({ message: 'A valid stationId is required.' })
    }

    // 2. Roll the chance. Unlucky = no spirit this time :(
    if (Math.random() >= FIND_CHANCE) {
        return res.json({ spirit: null })
    }

    // 3. Get the spirits this player already has, cannot get same sprits twice
    const { data: owned, error: ownedError } = await supabase
        .from('user_spirits')
        .select('spirit_id')
        .eq('user_id', req.user.id)

    if (ownedError) {
        console.error(ownedError)
        return res.status(500).json({ message: 'Could not check your collection.' })
    }

    //turns rows like { spirit_id: 1 } into plain numbers, ex: [{spirit_id: 1}, {spirit_id: 3}] becomes [1, 3].
    const ownedIds = owned.map((row) => row.spirit_id)

    // 4. Get all spirits, keep only the ones they don't have, and pick one at random
    const { data: allSpirits, error: spiritsError } = await supabase
        .from('spirits')
        .select('id, name, category, emoji')

    if (spiritsError) {
        console.error(spiritsError)
        return res.status(500).json({ message: 'Could not load spirits.' })
    }

    //only spirits whose id is not in the owned list
    const choices = allSpirits.filter((s) => !ownedIds.includes(s.id))

    //handle when use collected all spirits in the db
    if (choices.length === 0) {
        return res.json({ spirit: null, allFound: true })   
    }

    //pick a random item
    const spirit = choices[Math.floor(Math.random() * choices.length)]

    // 5. Save it to their collection (collected_at is filled in automatically by the database)
    const { error: insertError } = await supabase
        .from('user_spirits')

        //add a new row user_spirits
        .insert({ user_id: req.user.id, spirit_id: spirit.id, station_id: stationId })

    if (insertError) {
        console.error(insertError)
        return res.status(500).json({ message: 'Could not save your spirit.' })
    }

    res.json({ spirit })
})


export default router
