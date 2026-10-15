// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /server.js
// purpose:    - API Server
//             - after browser signs in with Supabase directly, it calls this server for any data
//             - by sending its session token in thee auth header. 
//             - Each route first verify that token in (middleware/auth.js) then talk to the database as user
// imports:    dotenv/config (reads .env), express (the app), cors (lets the Vue app call us), routes/me.js (first feature router)
// ----------------------------------------------------------------------------------------------------------

import 'dotenv/config'
import express from 'express'
import cors from 'cors'

// Routes for user info
import meRoutes from './routes/me.js'




const PORT = Number(process.env.PORT) || 8000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Create an express app
const app = express()

app.use(cors({ origin: CLIENT_ORIGIN }))   // only our Vue app may call this API from a browser
app.use(express.json())                    // parse JSON request bodies into req.body




// ---------- Routes ----------
// One line per feature file in routes/
app.use('/api/me', meRoutes)







// Quick check the server is up. No login needed.
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