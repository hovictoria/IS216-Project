import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

const TABLE = 'progress'
const TIME_ZONE = 'Asia/Singapore'
const emptyWeek = () => [false, false, false, false, false, false, false]
const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

// Reward range. Finishing always earns the minimum, a perfect result earns the maximum.
// Exported (with GAMES, rewardFor, singaporeToday) so routes/visits.js pays out the same way
export const XP = { min: 10, max: 30 }
export const COINS = { min: 5, max: 15 }
export const rewardFor = (range, fraction) =>
    Math.round(range.min + fraction * (range.max - range.min))

// How well they did, from 0 to 1, for each game
export const GAMES = {
    // 6 pairs: 6 moves is perfect, more moves earns less
    'memory': ({ moves }) => 6 / clamp(Number(moves) || 30, 6, 30),

    // 5 rounds: the fraction answered correctly
    'whats-missing': ({ score }) => clamp(Number(score) || 0, 0, 5) / 5,
    'object-id': ({ score }) => clamp(Number(score) || 0, 0, 5) / 5,
    'odd-one-out': ({ score }) => clamp(Number(score) || 0, 0, 5) / 5,
    'pattern': ({ score }) => clamp(Number(score) || 0, 0, 5) / 5,

    // Level reached, with level 10 counting as perfect
    'sequence': ({ level }) => clamp(Number(level) || 0, 0, 10) / 10
}

// ---------- Date helpers (all dates are 'YYYY-MM-DD' strings) ----------

// Today's date in Singapore
export function singaporeToday() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

// Add (or subtract) days
function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}

// Position in the week: Mon = 0 ... Sun = 6
function weekdayIndex(dateStr) {
    return (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7
}

// The Monday of the week that contains dateStr
function mondayOf(dateStr) {
    return addDays(dateStr, -weekdayIndex(dateStr))
}

// ---------- Streak logic ----------

// Turns a stored row into what the page needs.
// Stored values can be out of date, so check them against today.
function buildStatus(progress) {
    const today = singaporeToday()
    const yesterday = addDays(today, -1)
    const monday = mondayOf(today)

    if (!progress || !progress.last_played) {
        return { streak: 0, week: emptyWeek(), playedToday: false }
    }

    // The streak only counts if they played today or yesterday
    const streakIsLive =
        progress.last_played === today || progress.last_played === yesterday

    // The ticks only count if they belong to this week
    const weekIsCurrent = progress.week_start === monday

    return {
        streak: streakIsLive ? progress.streak || 0 : 0,
        week: weekIsCurrent && progress.week_played ? progress.week_played : emptyWeek(),
        playedToday: progress.last_played === today
    }
}

// Call this once when a player wins a game.
// Safe to call more than once a day: only the first call changes anything.
export async function recordPlay(userId) {
    const { data: progress, error } = await supabase
        .from(TABLE)
        .select('streak, last_played, week_start, week_played')
        .eq('user_id', userId)
        .maybeSingle()

    if (error) throw error

    const today = singaporeToday()
    const yesterday = addDays(today, -1)
    const monday = mondayOf(today)

    // Already counted today
    if (progress?.last_played === today) return buildStatus(progress)

    // Played yesterday: extend the streak. Otherwise start again at 1.
    const streak = progress?.last_played === yesterday ? (progress.streak || 0) + 1 : 1

    // New week: clear last week's ticks. Then tick today.
    const week =
        progress?.week_start === monday && progress.week_played
            ? [...progress.week_played]
            : emptyWeek()
    week[weekdayIndex(today)] = true

    const update = {
        user_id: userId,
        streak,
        last_played: today,
        week_start: monday,
        week_played: week
    }

    // Updates the user's row, or creates it if they don't have one yet.
    // Needs a unique constraint on user_id. xp and coins are left alone.
    const { error: saveError } = await supabase
        .from(TABLE)
        .upsert(update, { onConflict: 'user_id' })

    if (saveError) throw saveError

    return buildStatus(update)
}
export async function ensureProgress(userId) {
    const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
 
    if (error) throw error
}
// ---------- Routes ----------

// GET /api/progress/streak → current streak, this week's ticks, and whether they played today
router.get('/streak', requireAuth, async (req, res) => {
    const { data: progress, error } = await supabase
        .from(TABLE)
        .select('streak, last_played, week_start, week_played')
        .eq('user_id', req.user.id)
        .maybeSingle()

    if (error) {
        console.error(error)
        return res.status(500).json({ message: 'Could not load your streak.' })
    }

    res.json(buildStatus(progress))
})
router.post('/init', requireAuth, async (req, res) => {
    try {
        await ensureProgress(req.user.id)
        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not set up your progress.' })
    }
})


// POST /api/progress/xp → body: { game, score? | moves? | level? }
router.post('/xp', requireAuth, async (req, res) => {
    const getFraction = GAMES[req.body?.game]

    if (!getFraction) {
        return res.status(400).json({ message: 'Unknown game.' })
    }

    const fraction = getFraction(req.body)
    const xpEarned = rewardFor(XP, fraction)
    const coinsEarned = rewardFor(COINS, fraction)

    try {
        // Update the streak first. This also creates the user's row if they have none.
        const status = await recordPlay(req.user.id)

        const { data: row, error } = await supabase
            .from(TABLE)
            .select('xp, coins')
            .eq('user_id', req.user.id)
            .single()

        if (error) throw error

        const xp = (row.xp || 0) + xpEarned
        const coins = (row.coins || 0) + coinsEarned

        const { error: updateError } = await supabase
            .from('progress')
            .update({ xp, coins })
            .eq('user_id', req.user.id)

        if (updateError) throw updateError

        res.json({
            xp,
            coins,
            streak: status.streak,
            earned: { xp: xpEarned, coins: coinsEarned }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your progress.' })
    }
})

// GET /api/progress → the user's current XP and coins
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabase
        .from(TABLE)
        .select('xp, coins')
        .eq('user_id', req.user.id)
        .maybeSingle()

    if (error) {
        console.error(error)
        return res.status(500).json({ message: 'Could not load your progress.' })
    }

    res.json({ xp: data?.xp ?? 0, coins: data?.coins ?? 0 })
})




export default router