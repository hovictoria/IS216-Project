// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/me.js
// purpose:    - a mini app via to be exported via const router. Router() basically creates a self-contained Express app
//             - handles CRUD for user me
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
    const { id, email, user_metadata } = req.user
    res.json({ id, email, displayName: user_metadata?.display_name ?? null })
})

export default router