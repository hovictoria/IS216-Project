import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

const TABLE = 'progress'
const TIME_ZONE = 'Asia/Singapore'
const emptyWeek = () => [false, false, false, false, false, false, false]

// ---------- Date helpers (all dates are 'YYYY-MM-DD' strings) ----------

// Today's date in Singapore
function singaporeToday() {
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

const GAMES = ['memory', 'whats-missing', 'object-id', 'odd-one-out', 'pattern', 'sequence']
const XP_PER_WIN = 20
const COINS_PER_WIN = 10

// POST /api/progress/xp → body: { game }
router.post('/xp', requireAuth, async (req, res) => {
    const { game } = req.body

    if (!GAMES.includes(game)) {
        return res.status(400).json({ message: 'Unknown game.' })
    }

    try {
        // 1. Update the streak first. This also creates the user's row if they don't have one.
        const status = await recordPlay(req.user.id)

        // 2. Add the rewards
        const { data: row, error } = await supabase
            .from(TABLE)
            .select('xp, coins')
            .eq('user_id', req.user.id)
            .single()

        if (error) throw error

        const xp = (row.xp || 0) + XP_PER_WIN
        const coins = (row.coins || 0) + COINS_PER_WIN

        const { error: updateError } = await supabase
            .from(TABLE)
            .update({ xp, coins })
            .eq('user_id', req.user.id)

        if (updateError) throw updateError

        // 3. Send the new totals back. The server decides them, not the browser.
        res.json({ xp, coins, streak: status.streak })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your progress.' })
    }
})

export default router