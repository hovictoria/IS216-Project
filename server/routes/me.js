// GET /api/me  ->  who is signed in, according to the verified token.
// A small route that proves the whole chain works: browser -> token -> server -> Supabase.
// Copy this file's shape for new features (progress, collection, ...).
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
    const { id, email, user_metadata } = req.user
    res.json({
        id,
        email,
        displayName: user_metadata?.display_name ?? null,
    })
})

export default router
