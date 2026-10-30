// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /routes/search.js
// purpose:    - the "Where to?" search: any Singapore address, building, school or postal code, from OneMap
//             - our own MemoryGo places are searched in the browser (it already has them); this route is
//               only for everything else
//             - answers are kept for 10 minutes, so typing the same thing again doesn't ask OneMap again
// route:      GET /api/search?q=tan tock → { results: [{ name, address, postal, lat, lng }] } (max 8)
// ----------------------------------------------------------------------------------------------------------

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { searchOneMap } from '../lib/onemap.js'

const router = Router()

const MAX_RESULTS = 8
const CACHE_MS = 10 * 60 * 1000
const cache = new Map()                          // "tan tock" → { at, results }

router.get('/', requireAuth, async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    if (q.length < 2 || q.length > 60) {
        return res.status(400).json({ message: 'Type 2 to 60 characters to search.' })
    }

    const hit = cache.get(q)
    if (hit && Date.now() - hit.at < CACHE_MS) return res.json({ results: hit.results })

    try {
        // OneMap often lists the same building several times (one per entrance / unit): keep the first
        const seen = new Set()
        const results = (await searchOneMap(q))
            .filter((r) => !seen.has(r.name) && seen.add(r.name))
            .slice(0, MAX_RESULTS)

        cache.set(q, { at: Date.now(), results })
        if (cache.size > 500) cache.delete(cache.keys().next().value)   // forget the oldest

        res.json({ results })
    } catch (error) {
        console.error(error.message)                 // the reason only (never the login)
        res.status(502).json({ message: 'Search isn’t working right now. Please try again.' })
    }
})

export default router
