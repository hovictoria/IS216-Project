// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/admin.js
// purpose:    - admin page: see every user, change their details, delete them
// routes:     GET    /api/admin/me           200 if the caller is an admin (the app uses it to guard the /admin page)
//             GET    /api/admin/users        all users (name, email from Supabase auth + role/xp/coins/streak from progress)
//             PATCH  /api/admin/users/:id    change name, email, role, xp, coins, streak
//             DELETE /api/admin/users/:id    delete the user and their data
// needs:      the server's supabase client must use the SERVICE ROLE key (auth.admin.* only works with it)
//             a  role  column on progress ('player' or 'admin')
// imports:    requireAuth + requireAdmin (every route here is admins only), supabase, and the date/streak
//             helpers exported from routes/streak.js
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { supabase } from '../supabase.js'
import { buildStatus, singaporeToday, addDays } from './streak.js'

const router = Router()

// Everything in this file is for admins only
router.use(requireAuth, requireAdmin)

// GET /api/admin/me → only gets here if requireAdmin passed. The app calls it to decide whether to show /admin
router.get('/me', (req, res) => res.json({ admin: true }))

// Tables that hold a user's data. Deleted (in this order) before the account itself.
// CHECK: each of these needs a user_id column. Better still, give their user_id a foreign key to
// auth.users with "on delete cascade" and this list isn't needed at all.
const USER_TABLES = ['visits', 'user_spirits', 'spirit_sets_done', 'spirit_finds', 'daily_rewards', 'progress']

const MAX_COUNT = 2_000_000_000 // int4 limit is about 2.147 billion
const isCount = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_COUNT
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

// Supabase hands users out in pages, so keep asking until there are no more
async function listAllAuthUsers() {
    const perPage = 1000
    const users = []

    for (let page = 1; ; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
        if (error) throw error
        users.push(...data.users)
        if (data.users.length < perPage) break
    }

    return users
}

// One user + their progress row -> what the admin page needs
function shape(user, progress) {
    return {
        id: user.id,
        name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Unnamed',
        email: user.email || '',
        role: progress?.role === 'admin' ? 'admin' : 'player',
        xp: progress?.xp ?? 0,
        coins: progress?.coins ?? 0,
        streak: buildStatus(progress).streak,   // the streak the player actually sees today
        lastPlayed: progress?.last_played ?? null,
        joined: user.created_at?.slice(0, 10) ?? null
    }
}

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const [users, progress] = await Promise.all([
            listAllAuthUsers(),
            supabase
                .from('progress')
                .select('user_id, role, xp, coins, streak, last_played')
                .range(0, 9999)
        ])

        if (progress.error) throw progress.error

        const byUser = new Map(progress.data.map((row) => [row.user_id, row]))
        res.json(users.map((user) => shape(user, byUser.get(user.id))))
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not load the users.' })
    }
})

// PATCH /api/admin/users/:id  → body: { name, email, role, xp, coins, streak }
router.patch('/users/:id', async (req, res) => {
    const { id } = req.params
    if (!isUuid(id)) return res.status(400).json({ message: 'Bad user id.' })

    const { name, email, role } = req.body || {}
    const xp = Number(req.body?.xp)
    const coins = Number(req.body?.coins)
    const streak = Number(req.body?.streak)

    // ----- check what we were sent -----
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) {
        return res.status(400).json({ message: 'Please enter a name (up to 60 characters).' })
    }
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return res.status(400).json({ message: 'Please enter a valid email address.' })
    }
    if (role !== 'player' && role !== 'admin') {
        return res.status(400).json({ message: 'Role must be player or admin.' })
    }
    if (![xp, coins, streak].every(isCount)) {
        return res.status(400).json({ message: 'XP, coins and streak must be whole numbers, 0 or more.' })
    }
    if (id === req.user.id && role !== 'admin') {
        return res.status(400).json({ message: "You can't remove your own admin role." })
    }

    try {
        // ----- account details (name, email) -----
        const { data: found, error: findError } = await supabase.auth.admin.getUserById(id)
        if (findError || !found?.user) return res.status(404).json({ message: 'User not found.' })

        const current = found.user
        const newEmail = email.trim()

        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
            // only touch the email if it changed (no confirmation email: the admin vouches for it)
            ...(newEmail !== current.email && { email: newEmail, email_confirm: true }),
            user_metadata: { ...current.user_metadata, display_name: name.trim() }
        })

        if (authError) return res.status(400).json({ message: authError.message })

        // ----- progress (role, xp, coins, streak) -----
        const { data: row, error: rowError } = await supabase
            .from('progress')
            .select('last_played')
            .eq('user_id', id)
            .maybeSingle()

        if (rowError) throw rowError

        const update = { user_id: id, role, xp, coins, streak }

        // A streak only counts if they played today or yesterday (see buildStatus).
        // If the admin gives someone a streak but they haven't played recently, count it as
        // "played yesterday" so the number they set is the number the player sees.
        const today = singaporeToday()
        const yesterday = addDays(today, -1)
        if (streak > 0 && row?.last_played !== today && row?.last_played !== yesterday) {
            update.last_played = yesterday
        }

        const { error: saveError } = await supabase
            .from('progress')
            .upsert(update, { onConflict: 'user_id' })

        if (saveError) throw saveError

        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save the changes.' })
    }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params
    if (!isUuid(id)) return res.status(400).json({ message: 'Bad user id.' })

    if (id === req.user.id) {
        return res.status(400).json({ message: "You can't delete your own account here." })
    }

    try {
        // their data first, then the account. A failure on one table is logged, not fatal:
        // if it really blocks the delete, deleteUser below will say so.
        for (const table of USER_TABLES) {
            const { error } = await supabase.from(table).delete().eq('user_id', id)
            if (error) console.warn(`Could not clear ${table} for ${id}:`, error.message)
        }

        const { error } = await supabase.auth.admin.deleteUser(id)
        if (error) return res.status(400).json({ message: error.message })

        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not delete the user.' })
    }
})

export default router