// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/onemap.js
// purpose:    - talks to OneMap (Singapore Land Authority) for the server: place search now, routes later
//             - OneMap needs a token that only lasts ~3 days. We never store the token: we log in with
//               ONEMAP_EMAIL + ONEMAP_PASSWORD (server/.env) to get one, keep it in memory, and get a fresh
//               one shortly before it expires (or if OneMap says it's no longer valid)
//             - the browser never sees the login or the token; it only calls our /api/search
// exports:    searchOneMap(text) → [{ name, address, postal, lat, lng }]
// ----------------------------------------------------------------------------------------------------------

import 'dotenv/config'

const BASE = 'https://www.onemap.gov.sg'
const RENEW_EARLY_MS = 60 * 60 * 1000          // get a new token an hour before the old one expires

let token = null                                // kept in memory only
let tokenExpiresAt = 0                          // ms since 1970
let tokenRequest = null                         // a login in progress, so 5 searches at once share it

async function login() {
    const email = process.env.ONEMAP_EMAIL
    const password = process.env.ONEMAP_PASSWORD
    if (!email || !password) throw new Error('ONEMAP_EMAIL / ONEMAP_PASSWORD are missing from server/.env')

    const res = await fetch(`${BASE}/api/auth/post/getToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.access_token) {
        // never log the login itself, only OneMap's reason
        throw new Error(`OneMap login failed (${res.status}): ${body.error ?? 'no token'}`)
    }

    token = body.access_token
    tokenExpiresAt = Number(body.expiry_timestamp) * 1000 || Date.now() + 2 * 24 * 60 * 60 * 1000
    return token
}

async function getToken() {
    if (token && Date.now() < tokenExpiresAt - RENEW_EARLY_MS) return token
    tokenRequest ??= login().finally(() => { tokenRequest = null })
    return tokenRequest
}

// "TAN TOCK SENG HOSPITAL" → "Tan Tock Seng Hospital" (OneMap answers in capitals)
const niceCase = (text) => text.toLowerCase().replace(/(^|[\s(/-])\p{L}/gu, (m) => m.toUpperCase())

export async function searchOneMap(text) {
    const url = `${BASE}/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&pageNum=1`
        + `&searchVal=${encodeURIComponent(text)}`

    let res = await fetch(url, { headers: { Authorization: await getToken() } })
    if (res.status === 401 || res.status === 403) {
        token = null                                // OneMap says the token is no longer valid: log in again
        res = await fetch(url, { headers: { Authorization: await getToken() } })
    }
    if (!res.ok) throw new Error(`OneMap search failed (${res.status})`)

    const body = await res.json()
    return (body.results ?? [])
        .map((r) => ({
            name: niceCase(r.SEARCHVAL),
            address: r.ADDRESS && r.ADDRESS !== 'NIL' ? niceCase(r.ADDRESS) : null,
            postal: r.POSTAL && r.POSTAL !== 'NIL' ? r.POSTAL : null,
            lat: Number(r.LATITUDE),
            lng: Number(r.LONGITUDE),
        }))
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
}
