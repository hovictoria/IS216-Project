// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/me.js
// purpose:    - a mini app via to be exported via const router. Router() basically creates a self-contained Express app
//             - handles CRUD for user me
// routes:     GET    /api/me            → id, email, name
//             GET    /api/me/profile    → everything the Me page shows (stats, picture, newest Spirits, settings)
//             PUT    /api/me/avatar     { spiritId | null }  → pick one of YOUR Spirits as your picture
//             PUT    /api/me/settings   { textSize?, reduceMotion?, solidBackgrounds?, mood? } → save settings
//             DELETE /api/me            → delete the account and its data
// tables:     profiles + user_settings (docs/me.sql), progress, spirit_finds, spirit_catalog, visits
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../supabase.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
    const { id, email, user_metadata } = req.user
    res.json({ id, email, displayName: user_metadata?.display_name ?? null })
})

// What a setting is called in the app → its column, and the values it may have
const SETTINGS = {
    textSize: { column: 'text_size', ok: (v) => ['normal', 'large', 'larger'].includes(v) },
    reduceMotion: { column: 'reduce_motion', ok: (v) => v === null || typeof v === 'boolean' },   // null = follow the device
    solidBackgrounds: { column: 'solid_backgrounds', ok: (v) => typeof v === 'boolean' },
    mood: { column: 'mood', ok: (v) => ['auto', 'day', 'night'].includes(v) },
}

// A user_settings row (or no row yet) → the app's names, with the defaults filled in
function settingsFrom(row) {
    return {
        textSize: row?.text_size ?? 'normal',
        reduceMotion: row?.reduce_motion ?? null,
        solidBackgrounds: row?.solid_backgrounds ?? false,
        mood: row?.mood ?? 'auto',
    }
}

// GET /api/me/profile → the Me page in one call (all 6 reads at the same time)
router.get('/profile', requireAuth, async (req, res) => {
    const userId = req.user.id
    try {
        const [progress, finds, total, visits, profile, settings] = await Promise.all([
            supabase.from('progress').select('xp, coins').eq('user_id', userId).maybeSingle(),
            // newest first, with the Spirit's name so the page can show the newest few
            supabase.from('spirit_finds').select('spirit_id, found_at, spirit_catalog(name)')
                .eq('user_id', userId).order('found_at', { ascending: false }),
            supabase.from('spirit_catalog').select('id', { count: 'exact', head: true }),
            // places they've finished a game at (counted once each below)
            supabase.from('visits').select('place_id').eq('user_id', userId).not('finished_at', 'is', null),
            supabase.from('profiles').select('avatar_spirit_id').eq('user_id', userId).maybeSingle(),
            supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        ])
        for (const answer of [progress, finds, total, visits, profile, settings]) {
            if (answer.error) throw answer.error
        }

        res.json({
            name: req.user.user_metadata?.display_name ?? null,
            joinedAt: req.user.created_at,
            xp: progress.data?.xp ?? 0,
            coins: progress.data?.coins ?? 0,
            spiritsFound: finds.data.length,
            spiritsTotal: total.count ?? 0,
            placesPlayed: new Set(visits.data.map((v) => v.place_id)).size,
            avatarSpiritId: profile.data?.avatar_spirit_id ?? null,
            newestSpirits: finds.data.slice(0, 3).map((f) => ({ id: f.spirit_id, name: f.spirit_catalog?.name ?? f.spirit_id })),
            foundSpiritIds: finds.data.map((f) => f.spirit_id),
            settings: settingsFrom(settings.data),
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not load your profile.' })
    }
})

// PUT /api/me/avatar → { spiritId } picks one of your Spirits as your picture, { spiritId: null } goes back to your initial
router.put('/avatar', requireAuth, async (req, res) => {
    const userId = req.user.id
    const spiritId = req.body?.spiritId ?? null

    if (spiritId !== null && typeof spiritId !== 'string') {
        return res.status(400).json({ message: 'That is not a Spirit.' })
    }

    try {
        // only a Spirit you've actually found (so it can't be picked from DevTools)
        if (spiritId) {
            const { data: found, error } = await supabase.from('spirit_finds').select('spirit_id')
                .eq('user_id', userId).eq('spirit_id', spiritId).maybeSingle()
            if (error) throw error
            if (!found) return res.status(403).json({ message: 'Find this Spirit first to use it as your picture.' })
        }

        const { error } = await supabase.from('profiles')
            .upsert({ user_id: userId, avatar_spirit_id: spiritId, updated_at: new Date().toISOString() })
        if (error) throw error

        res.json({ avatarSpiritId: spiritId })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your picture.' })
    }
})

// PUT /api/me/settings → saves only the settings that were sent (each one checked first)
router.put('/settings', requireAuth, async (req, res) => {
    const row = { user_id: req.user.id, updated_at: new Date().toISOString() }

    for (const [name, value] of Object.entries(req.body ?? {})) {
        const setting = SETTINGS[name]
        if (!setting || !setting.ok(value)) {
            return res.status(400).json({ message: `"${name}" can't be set to that.` })
        }
        row[setting.column] = value
    }

    try {
        // upsert: makes their row the first time, changes only these columns after that
        const { data, error } = await supabase.from('user_settings').upsert(row).select('*').single()
        if (error) throw error
        res.json({ settings: settingsFrom(data) })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not save your settings.' })
    }
})

// Every table that keeps rows for one player (user_id column)
const USER_TABLES = ['visits', 'daily_rewards', 'spirit_finds', 'spirit_sets_done', 'progress']

// DELETE /api/me → delete the signed-in player's account and everything saved for them
// The app checks their password before calling this (stores/auth.js deleteAccount)
router.delete('/', requireAuth, async (req, res) => {
    try {
        // Their game data first, so nothing is left behind
        for (const table of USER_TABLES) {
            const { error } = await supabase.from(table).delete().eq('user_id', req.user.id)
            if (error) throw error
        }

        // Then the account itself (needs the service role key, which only the server has)
        const { error } = await supabase.auth.admin.deleteUser(req.user.id)
        if (error) throw error

        res.json({ ok: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Could not delete your account.' })
    }
})

export default router