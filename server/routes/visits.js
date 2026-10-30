// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/visits.js
// purpose:    - tapping in at a place and getting paid for the game played there (step 6)
//             - POST /api/visits/start       { placeId, lat, lng }  → { visitId, game, paid, reason }
//             - POST /api/visits/:id/finish  { moves | score | level } → { earned, totals }
// rules:      - you must be inside the place's zone, and it must be the NEAREST place whose zone you're in
//             - the game is picked at random at tap-in (never the same as your last visit there) and saved
//               on the visit, so the result is scored for the game that was actually played
//             - a visit is PAID if you haven't been paid at this place today (Singapore date) and your last
//               paid visit anywhere was at least 5 minutes ago; otherwise it's a REPLAY (play for fun, 0 coins)
//             - the server works out every amount from the game result (coins 5-15, XP 10-30, see streak.js);
//               the browser never sends an amount
//             - paying out happens in ONE database step (finish_visit in docs/visits.sql), so a double tap
//               can't pay twice; a paid visit must be finished within 30 minutes
// privacy:    the user's coordinates are only used for the distance check here, never saved (only distance_m)
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'
import { GAMES, XP, COINS, rewardFor, singaporeToday, recordPlay } from './streak.js'
import { payChallengeIfDone } from './journey.js'

const router = Router()

const GAP_MINUTES = 5            // minutes between two paid visits (stops shuffling between close places)
const FINISH_MINUTES = 30        // a paid visit must be finished within this long

// Our 6 games. Which one you play is picked at random each time you tap in (never the same game as your
// last visit to that place), so a place you pass every day doesn't always give the same game
export const ALL_GAMES = ['memory', 'object', 'sequence', 'pattern', 'missing', 'oddoneout']

// visits.game → the game names the reward formula in streak.js uses
export const SCORING_NAME = {
    memory: 'memory',
    object: 'object-id',
    sequence: 'sequence',
    pattern: 'pattern',
    missing: 'whats-missing',
    oddoneout: 'odd-one-out',
}

// Straight-line distance in metres between two [lng, lat] points
function distanceM([lng1, lat1], [lng2, lat2]) {
    const rad = (d) => (d * Math.PI) / 180
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
    return 6371000 * 2 * Math.asin(Math.sqrt(a))
}

const isNumber = (n) => typeof n === 'number' && Number.isFinite(n)

// ============================================================================================
// POST /api/visits/start → tap in
// ============================================================================================
router.post('/start', requireAuth, async (req, res) => {
    const userId = req.user.id
    const placeId = Number(req.body?.placeId)
    const { lat, lng } = req.body ?? {}

    // 1. Check what the browser sent
    if (!Number.isInteger(placeId) || placeId < 1 || !isNumber(lat) || !isNumber(lng)) {
        return res.status(400).json({ message: 'A place and your location are needed to tap in.' })
    }

    try {
        // 2. The place, and every other place nearby (about 1 km around you), to check the zone rules
        const { data: nearby, error: nearbyError } = await supabase
            .from('places')
            .select('id, name, lat, lng, radius_m')
            .eq('is_active', true)
            .gte('lat', lat - 0.01).lte('lat', lat + 0.01)
            .gte('lng', lng - 0.01).lte('lng', lng + 0.01)
        if (nearbyError) throw nearbyError

        const here = [lng, lat]
        const withDistance = nearby.map((p) => ({ ...p, distance: distanceM(here, [p.lng, p.lat]) }))
        const place = withDistance.find((p) => p.id === placeId)

        if (!place) {
            return res.status(403).json({ message: 'You’re not close enough to that place yet.' })
        }

        // 3. Inside its play zone?
        if (place.distance > place.radius_m) {
            return res.status(403).json({
                message: `You’re ${Math.round(place.distance)} m from ${place.name}. Walk a little closer to tap in.`,
            })
        }

        // 4. Is it the nearest place whose zone you're in? (stops playing many places from one spot)
        const nearest = withDistance
            .filter((p) => p.distance <= p.radius_m)
            .sort((a, b) => a.distance - b.distance)[0]
        if (nearest.id !== place.id) {
            return res.status(409).json({ message: `${nearest.name} is closer. Tap in there instead.`, nearestId: nearest.id })
        }

        const today = singaporeToday()

        // 5. Already tapped in here today and didn't finish (e.g. the app crashed)? Carry on with that
        //    visit, and the same game
        const { data: unfinished, error: unfinishedError } = await supabase
            .from('visits')
            .select('id, started_at, game')
            .eq('user_id', userId).eq('place_id', placeId).eq('visit_date', today)
            .eq('paid', true).is('finished_at', null)
            .maybeSingle()
        if (unfinishedError) throw unfinishedError
        if (unfinished && Date.now() - new Date(unfinished.started_at) < FINISH_MINUTES * 60_000) {
            return res.json({ visitId: unfinished.id, game: unfinished.game, paid: true, resumed: true })
        }

        // An abandoned paid visit (over 30 min, never finished) would otherwise hold today's paid slot,
        // so they'd lose the day's reward without ever finishing a game. Release it (it becomes a replay)
        if (unfinished) {
            const { error: releaseError } = await supabase
                .from('visits').update({ paid: false }).eq('id', unfinished.id).is('finished_at', null)
            if (releaseError) throw releaseError
        }

        // 6. Pick a random game, but not the one they played last time at this place
        const { data: lastHere, error: lastHereError } = await supabase
            .from('visits')
            .select('game')
            .eq('user_id', userId).eq('place_id', placeId)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (lastHereError) throw lastHereError

        const choices = ALL_GAMES.filter((g) => g !== lastHere?.game)
        const game = choices[Math.floor(Math.random() * choices.length)]

        // 7. Paid or replay?
        const { count: paidHereToday, error: countError } = await supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('place_id', placeId).eq('visit_date', today).eq('paid', true)
        if (countError) throw countError

        const { data: lastPaid, error: lastError } = await supabase
            .from('visits')
            .select('started_at')
            .eq('user_id', userId).eq('paid', true)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        if (lastError) throw lastError

        const minutesSinceLastPaid = lastPaid ? (Date.now() - new Date(lastPaid.started_at)) / 60_000 : Infinity

        let paid = true
        let reason = null
        if (paidHereToday > 0) {
            paid = false
            reason = 'played-today'                       // card: "Played today · back tomorrow"
        } else if (minutesSinceLastPaid < GAP_MINUTES) {
            paid = false
            reason = 'too-soon'
        }

        // 8. Save the visit with its game (distance only, never the coordinates)
        const row = { user_id: userId, place_id: placeId, visit_date: today, distance_m: Math.round(place.distance), paid, game }
        let { data: visit, error: insertError } = await supabase.from('visits').insert(row).select('id').single()

        // Two taps at the same moment: the database refuses the second PAID visit (unique rule), so it
        // becomes a replay instead
        if (insertError?.code === '23505') {
            paid = false
            reason = 'played-today'
            ;({ data: visit, error: insertError } = await supabase
                .from('visits').insert({ ...row, paid: false }).select('id').single())
        }
        if (insertError) throw insertError

        const waitMinutes = reason === 'too-soon' ? Math.ceil(GAP_MINUTES - minutesSinceLastPaid) : null
        res.json({ visitId: visit.id, game, paid, reason, waitMinutes })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not tap in. Please try again.' })
    }
})

// ============================================================================================
// POST /api/visits/:id/finish → the game is over: score it and pay out
// ============================================================================================
router.post('/:id/finish', requireAuth, async (req, res) => {
    const userId = req.user.id
    const visitId = Number(req.params.id)
    if (!Number.isInteger(visitId) || visitId < 1) {
        return res.status(400).json({ message: 'Unknown visit.' })
    }

    try {
        // 1. Their unfinished visit, and which game it was for
        const { data: visit, error: visitError } = await supabase
            .from('visits')
            .select('id, paid, game')
            .eq('id', visitId).eq('user_id', userId).is('finished_at', null)
            .maybeSingle()
        if (visitError) throw visitError
        if (!visit) {
            return res.status(409).json({ message: 'This game has already been saved.' })
        }

        // 2. Turn the game's result into a score from 0 to 1, with the same formula as before
        const scoreGame = GAMES[SCORING_NAME[visit.game]]
        if (!scoreGame) {
            return res.status(400).json({ message: 'Unknown game.' })
        }
        const fraction = Math.min(1, Math.max(0, scoreGame(req.body ?? {})))
        const coins = rewardFor(COINS, fraction)
        const xp = rewardFor(XP, fraction)

        // 3. Finish + pay in one database step (pays 0 for replays or if it took over 30 minutes)
        const { data: result, error: payError } = await supabase.rpc('finish_visit', {
            p_visit_id: visitId,
            p_user_id: userId,
            p_score: fraction,
            p_coins: coins,
            p_xp: xp,
        })
        if (payError) throw payError

        const paidOut = result?.[0]
        if (!paidOut) {
            return res.status(409).json({ message: 'This game has already been saved.' })
        }

        // 4. A paid game also counts towards the streak and "this week", and maybe finishes today's challenge
        //    (2 places today → +50 coins once, routes/journey.js)
        let challenge = null
        if (paidOut.coins_earned > 0) {
            await recordPlay(userId)
            challenge = await payChallengeIfDone(userId)
        }

        // 5. finish_visit also found this place's Spirit (first paid game here) and maybe finished a set:
        //    send its details so the game can show "You found a Spirit!"
        let spirit = null
        if (paidOut.spirit_id) {
            const { data } = await supabase
                .from('spirit_catalog')
                .select('id, name, color, rarity, set_name, lore')
                .eq('id', paidOut.spirit_id)
                .maybeSingle()
            if (data) spirit = { id: data.id, name: data.name, color: data.color, rarity: data.rarity, set: data.set_name, lore: data.lore }
        }

        res.json({
            paid: paidOut.coins_earned > 0,
            earned: { coins: paidOut.coins_earned, xp: paidOut.xp_earned },
            totals: challenge?.totals ?? { coins: paidOut.total_coins, xp: paidOut.total_xp },
            challenge: challenge ? { bonus: challenge.coins } : null,      // today's challenge just finished
            spirit,                                                    // null, or the Spirit just found
            setDone: paidOut.set_done ? { name: paidOut.set_done, bonus: paidOut.set_bonus } : null,
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your game. Please try again.' })
    }
})

export default router
