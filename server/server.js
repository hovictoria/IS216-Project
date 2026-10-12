// Memory Go API server.
// The browser signs in with Supabase directly, then calls this server for data,
// sending its session token in the Authorization header. Each route verifies
// that token (see middleware/auth.js) and talks to the database on the user's behalf.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import meRoutes from './routes/me.js'

const PORT = Number(process.env.PORT) || 8000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

// ---------- Routes ----------
// Add one line per feature file in routes/:
//   app.use('/api/progress', progressRoutes)
app.use('/api/me', meRoutes)

// Quick check the server is up, no login needed.
app.get('/api/health', (req, res) => {
    res.json({ ok: true })
})

// ---------- Fallbacks ----------
app.use('/api', (req, res) => {
    res.status(404).json({ message: 'No such API route.' })
})

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ message: 'Something went wrong.' })
})

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Memory Go API running at http://127.0.0.1:${PORT}/api`)
})
