// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /lib/onemap.js
// purpose:    - talks to OneMap (Singapore Land Authority) for the server: place search now, routes later
//             - OneMap needs a token that only lasts ~3 days. We never store the token: we log in with
//               ONEMAP_EMAIL + ONEMAP_PASSWORD (server/.env) to get one, keep it in memory, and get a fresh
//               one shortly before it expires (or if OneMap says it's no longer valid)
//             - the browser never sees the login or the token; it only calls our /api/search
// exports:    searchOneMap(text) → [{ name, address, postal, lat, lng }]
//             routeOneMap(from, to, mode) → OneMap's raw route answer ('walk' or 'pt' = MRT + bus)
//             decodePolyline(text) → [[lng, lat], ...]   (OneMap sends route lines in this compressed form)
//             niceCase(text)
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
// Short names that should stay in capitals ("SMU Connexion", not "Smu Connexion")
const KEEP_CAPS = new Set(['SMU', 'NUS', 'NTU', 'SUTD', 'SIT', 'SUSS', 'ITE', 'MRT', 'LRT', 'HDB', 'SGH', 'TTSH',
    'NUH', 'KKH', 'CC', 'NEX', 'YMCA', 'YWCA', 'MOE', 'MOH', 'ICA', 'CPF', 'IRAS', 'URA', 'LTA', 'PCF', 'CHIJ'])
export const niceCase = (text) => text
    .toLowerCase()
    .replace(/(^|[\s(/-])\p{L}/gu, (m) => m.toUpperCase())
    .replace(/\b[\p{L}]+\b/gu, (word) => (KEEP_CAPS.has(word.toUpperCase()) ? word.toUpperCase() : word))

// GET a OneMap address with our token; if OneMap says the token is no longer valid, log in again once
async function oneMapGet(url, what) {
    let res = await fetch(url, { headers: { Authorization: await getToken() } })
    if (res.status === 401 || res.status === 403) {
        token = null
        res = await fetch(url, { headers: { Authorization: await getToken() } })
    }
    if (!res.ok) throw new Error(`OneMap ${what} failed (${res.status})`)
    return res.json()
}

export async function searchOneMap(text) {
    const url = `${BASE}/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&pageNum=1`
        + `&searchVal=${encodeURIComponent(text)}`
    const body = await oneMapGet(url, 'search')
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

// ---------- Routes ----------
// from / to: [lat, lng]. mode: 'walk' or 'pt' (public transport: MRT + bus, up to 3 options).
// Public transport needs a date + time: "leaving now", in Singapore time
export async function routeOneMap(from, to, mode) {
    let url = `${BASE}/api/public/routingsvc/route?start=${from.join(',')}&end=${to.join(',')}&routeType=${mode}`
    if (mode === 'pt') {
        const now = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }).formatToParts(new Date())
        const part = (type) => now.find((p) => p.type === type).value
        url += `&date=${part('month')}-${part('day')}-${part('year')}`
            + `&time=${part('hour')}:${part('minute')}:${part('second')}`
            + '&mode=TRANSIT&maxWalkDistance=1000&numItineraries=3'
    }
    return oneMapGet(url, 'route')
}

// OneMap (like Google) sends each route line as a short text, e.g. "}c|F{gzxRg@_@...". Every point is
// stored as the change from the one before, packed into characters. This unpacks it into [lng, lat]
// points (lng first, like MapLibre). It's the standard "encoded polyline" format, precision 5
export function decodePolyline(text) {
    const points = []
    let index = 0
    let lat = 0
    let lng = 0
    while (index < text.length) {
        for (const which of ['lat', 'lng']) {
            let result = 0
            let shift = 0
            let byte
            do {
                byte = text.charCodeAt(index++) - 63
                result |= (byte & 0x1f) << shift
                shift += 5
            } while (byte >= 0x20)
            const change = result & 1 ? ~(result >> 1) : result >> 1
            if (which === 'lat') lat += change
            else lng += change
        }
        points.push([lng / 1e5, lat / 1e5])
    }
    return points
}
