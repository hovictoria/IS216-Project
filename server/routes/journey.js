// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/journey.js
// purpose:    - the Journey tab (memorygo/src/views/journey.vue)
//             - GET  /api/journey                 → everything the tab shows (see the answer below)
//             - POST /api/journey/puzzle/finish   { game, moves | score | level } → { paid, earned, totals, bonus }
// rules:      - Puzzle of the day: one of our 6 games, the same for everyone on a Singapore date. The FIRST finish
//               that day pays the game's normal coins/XP (5-15 coins, 10-30 XP, from how well you played)
//               + PUZZLE_BONUS coins, and ticks "This week". Later finishes that day are practice (0)
//             - Today's challenge: finish paid games at CHALLENGE_GOAL places today → CHALLENGE_BONUS coins,
//               once a day. It's paid in /api/visits/:id/finish (payChallengeIfDone below), not here
//             - paying out uses claim_daily (docs/journey.sql): saves "paid today" and adds the coins in one
//               step, so a double tap or a refresh can't pay twice
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'
import { GAMES, XP, COINS, rewardFor, singaporeToday, mondayOf, buildStatus, recordPlay } from './streak.js'
import { ALL_GAMES, SCORING_NAME } from './visits.js'

const router = Router()

export const PUZZLE_BONUS = 20          // extra coins for the Puzzle of the day, on top of the game's own
export const CHALLENGE_GOAL = 2         // places to play at today
export const CHALLENGE_BONUS = 50       // coins for finishing today's challenge

// Today's puzzle game: our 6 games take turns, one per day (same for everyone, changes at midnight SGT)
export function puzzleGameFor(date) {
    const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
    return ALL_GAMES[day % ALL_GAMES.length]
}

// How many places they've finished a PAID game at today (a paid visit is once per place per day)
async function placesPlayedToday(userId, today) {
    const { count, error } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('visit_date', today)
        .gt('coins_earned', 0)
    if (error) throw error
    return count ?? 0
}

// Called by /api/visits/:id/finish after a paid game: if that was the 2nd place today, pay the challenge
// bonus (once). Returns { coins, totals } when it paid now, otherwise null
export async function payChallengeIfDone(userId) {
    const today = singaporeToday()
    if ((await placesPlayedToday(userId, today)) < CHALLENGE_GOAL) return null

    const { data, error } = await supabase.rpc('claim_daily', {
        p_user_id: userId,
        p_date: today,
        p_kind: 'challenge',
        p_game: null,
        p_coins: CHALLENGE_BONUS,
        p_xp: 0,
    })
    if (error) throw error

    const paid = data?.[0]
    return paid ? { coins: paid.coins_earned, totals: { coins: paid.total_coins, xp: paid.total_xp } } : null
}

// ============================================================================================
// GET /api/journey → {
//   coins,
//   week: [Mon..Sun true/false], daysThisWeek,
//   placesThisWeek,                          // different places with a paid game since Monday
//   spiritsFound,
//   puzzle:    { game, bonus, done },
//   challenge: { goal, done, bonus, claimed }
// }
// ============================================================================================
router.get('/', requireAuth, async (req, res) => {
    const userId = req.user.id
    const today = singaporeToday()

    try {
        // all at the same time (one after another is slow)
        const [progress, weekVisits, spirits, todaysBonuses, playedToday] = await Promise.all([
            supabase.from('progress')
                .select('coins, streak, last_played, week_start, week_played')
                .eq('user_id', userId).maybeSingle(),
            supabase.from('visits')
                .select('place_id')
                .eq('user_id', userId).gte('visit_date', mondayOf(today))
                .gt('coins_earned', 0),
            supabase.from('spirit_finds')
                .select('spirit_id', { count: 'exact', head: true })
                .eq('user_id', userId),
            supabase.from('daily_rewards')
                .select('kind')
                .eq('user_id', userId).eq('reward_date', today),
            placesPlayedToday(userId, today),
        ])
        for (const answer of [progress, weekVisits, spirits, todaysBonuses]) {
            if (answer.error) throw answer.error
        }

        const status = buildStatus(progress.data)
        const claimed = (kind) => todaysBonuses.data.some((row) => row.kind === kind)

        res.json({
            coins: progress.data?.coins ?? 0,
            week: status.week,
            daysThisWeek: status.week.filter(Boolean).length,
            placesThisWeek: new Set(weekVisits.data.map((v) => v.place_id)).size,
            spiritsFound: spirits.count ?? 0,
            puzzle: { game: puzzleGameFor(today), bonus: PUZZLE_BONUS, done: claimed('puzzle') },
            challenge: {
                goal: CHALLENGE_GOAL,
                done: Math.min(playedToday, CHALLENGE_GOAL),
                bonus: CHALLENGE_BONUS,
                claimed: claimed('challenge'),
            },
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not load your journey.' })
    }
})

// ============================================================================================
// POST /api/journey/puzzle/finish → the Puzzle of the day is over: score it and pay out (first time today)
// ============================================================================================
router.post('/puzzle/finish', requireAuth, async (req, res) => {
    const userId = req.user.id
    const today = singaporeToday()
    const game = puzzleGameFor(today)

    // 1. Only today's puzzle game counts (the browser says which game it played)
    if (req.body?.game !== game) {
        return res.status(409).json({ message: 'That isn’t today’s puzzle. A new one starts at midnight.' })
    }

    // 2. Score it with the same formula as the place games
    const fraction = Math.min(1, Math.max(0, GAMES[SCORING_NAME[game]](req.body ?? {})))
    const coins = rewardFor(COINS, fraction) + PUZZLE_BONUS
    const xp = rewardFor(XP, fraction)

    try {
        // 3. Pay once today (no row back = already paid today, so this one was practice)
        const { data, error } = await supabase.rpc('claim_daily', {
            p_user_id: userId,
            p_date: today,
            p_kind: 'puzzle',
            p_game: game,
            p_coins: coins,
            p_xp: xp,
        })
        if (error) throw error

        const paid = data?.[0]
        if (!paid) {
            const { data: row, error: rowError } = await supabase
                .from('progress').select('coins, xp').eq('user_id', userId).maybeSingle()
            if (rowError) throw rowError
            return res.json({
                paid: false,
                earned: { coins: 0, xp: 0 },
                totals: { coins: row?.coins ?? 0, xp: row?.xp ?? 0 },
                bonus: 0,
            })
        }

        // 4. The puzzle counts towards the streak and "This week"
        await recordPlay(userId)

        res.json({
            paid: true,
            earned: { coins: paid.coins_earned, xp: paid.xp_earned },
            totals: { coins: paid.total_coins, xp: paid.total_xp },
            bonus: PUZZLE_BONUS,
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your puzzle. Please try again.' })
    }
})

export default router
