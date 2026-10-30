// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   /scripts/import-places.js
// purpose:    - fills the `places` table from data.gov.sg instead of typing places by hand (step 7)
//             - run BY HAND, not by the app:   node scripts/import-places.js --dry-run   (only prints)
//                                              node scripts/import-places.js             (writes to Supabase)
//             - safe to re-run: rows are matched by (source, source_id), so nothing is added twice
// datasets:   - Monuments (National Heritage Board)        → kind 'spot', category 'Monument'
//             - Historic Sites (National Heritage Board)   → kind 'spot', category 'Historic site'
//             - LTA MRT Station Exit                       → kind 'mrt', exits grouped into ONE row per station
//               (LRT stations are skipped; MRT line codes like EW13 come from OneMap search)
// rules:      - facts from the data (lat, lng, category, fact, url, line codes) are updated on every run
//             - the name and our game settings (game_type, radius_m, is_active) are only set for NEW rows,
//               never overwritten, so a name you change in Supabase stays changed
//             - a manual row (docs/places-seed.sql) that matches an imported place is merged into it, keeping its
//               id and name (match = same MRT name, or a spot within 60 m, or within 150 m if the official
//               name contains ours)
//             - MRT play zones cover every exit, but stay between 150 m and 250 m
//             - a place that has disappeared from its dataset is hidden (is_active = false), not deleted
// needs:      SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in server/.env (already there). ONEMAP_TOKEN is optional
// ----------------------------------------------------------------------------------------------------------

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { supabase } from '../supabase.js'

const DRY_RUN = process.argv.includes('--dry-run')

const DATASETS = {
    monuments: { id: 'd_b29c230ec6b609e29ed42f71ca9a8767', source: 'nhb-monuments', category: 'Monument' },
    historic: { id: 'd_31e16b12809e66673e90d8b04fdee1b2', source: 'nhb-historic-sites', category: 'Historic site' },
    mrtExits: { id: 'd_b39d3a0871985372d7e1637193335da5', source: 'lta-mrt' },
}

const GAMES = ['memory', 'object', 'sequence', 'pattern', 'missing', 'oddoneout']
const SPOT_RADIUS_M = 100
const MRT_MIN_RADIUS_M = 150
const MRT_MAX_RADIUS_M = 250         // a few stations have exits 300+ m apart; keep zones from swallowing streets
const MERGE_DISTANCE_M = 60          // a manual spot this close to an imported one is the same place...
const MERGE_NAMED_M = 150            // ...or this close if the official name contains ours ("…(now CHIJMES)")

// Official names our title-casing would get wrong
const NAME_FIXES = { 'Gardens By The Bay': 'Gardens by the Bay', Harbourfront: 'HarbourFront' }
const ONEMAP_CACHE = new URL('./.cache/onemap-line-codes.json', import.meta.url)

// ============================================================================================
// Small helpers
// ============================================================================================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Straight-line distance in metres between two [lng, lat] points (same maths as memorygo/src/lib/geo.js)
function distanceM([lng1, lat1], [lng2, lat2]) {
    const rad = (d) => (d * Math.PI) / 180
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
    return 6371000 * 2 * Math.asin(Math.sqrt(a))
}

// Roughly Singapore (the same check the table does), so a bad point is reported instead of failing the insert
const inSingapore = (lat, lng) => lat >= 1.1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1

// "ONE-NORTH" -> "One-North", "CITY HALL" -> "City Hall"
const titleCase = (text) => text.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase())

// "https://www.roots.gov.sg/.../former-keng-teck-whay-building" -> "former-keng-teck-whay-building"
const lastPathPart = (url) => new URL(url).pathname.split('/').filter(Boolean).pop()

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ============================================================================================
// 1. Download a dataset from data.gov.sg
//    data.gov.sg hands out a temporary download link. If the file isn't ready yet we ask it to
//    prepare one, then keep checking. It allows only a few requests a minute without an API key,
//    so we wait when it says "too many requests".
// ============================================================================================
async function askDataGov(path) {
    for (let attempt = 1; attempt <= 6; attempt++) {
        const res = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${path}`)
        const body = await res.json().catch(() => ({}))
        if (res.status === 429 || body.code === 24) {
            console.log('   data.gov.sg says "too many requests", waiting 12 s…')
            await sleep(12000)
            continue
        }
        if (!res.ok) throw new Error(`data.gov.sg answered ${res.status} for ${path}`)
        return body.data ?? {}
    }
    throw new Error(`data.gov.sg kept refusing ${path}`)
}

async function downloadGeoJson(datasetId) {
    let link = (await askDataGov(`${datasetId}/poll-download`)).url
    if (!link) {
        await askDataGov(`${datasetId}/initiate-download`)
        for (let tries = 0; !link && tries < 10; tries++) {
            await sleep(3000)
            link = (await askDataGov(`${datasetId}/poll-download`)).url
        }
    }
    if (!link) throw new Error(`No download link for dataset ${datasetId}`)

    const res = await fetch(link)
    if (!res.ok) throw new Error(`Download failed (${res.status}) for dataset ${datasetId}`)
    return (await res.json()).features
}

// ============================================================================================
// 2. Monuments and historic sites → one place each
// ============================================================================================
function heritageToPlaces(features, { source, category }) {
    const places = []
    for (const feature of features) {
        const p = feature.properties
        const [lng, lat] = feature.geometry.coordinates
        if (!inSingapore(lat, lng)) {
            console.log(`   ! skipped "${p.NAME}": coordinates outside Singapore`)
            continue
        }
        places.push({
            source,
            source_id: p.HYPERLINK ? lastPathPart(p.HYPERLINK) : slug(p.NAME),
            name: p.NAME.trim(),
            kind: 'spot',
            category,
            line_codes: [],
            lat,
            lng,
            fact: p.DESCRIPTION?.trim() || null,
            url: p.HYPERLINK || null,
            radius_m: SPOT_RADIUS_M,
        })
    }
    return places
}

// ============================================================================================
// 3. MRT exits → one place per station
//    The pin goes in the middle of the station's exits, and the play zone is made big enough
//    to cover every exit (at least 150 m).
// ============================================================================================
function exitsToStations(features) {
    const exitsByStation = new Map()
    for (const feature of features) {
        const name = feature.properties.STATION_NA
        if (!name.endsWith(' MRT STATION')) continue          // skip LRT stations
        if (!exitsByStation.has(name)) exitsByStation.set(name, [])
        exitsByStation.get(name).push(feature.geometry.coordinates.slice(0, 2))
    }

    const stations = []
    for (const [fullName, exits] of exitsByStation) {
        const lng = exits.reduce((sum, e) => sum + e[0], 0) / exits.length
        const lat = exits.reduce((sum, e) => sum + e[1], 0) / exits.length
        const furthest = Math.max(...exits.map((e) => distanceM([lng, lat], e)))
        const shortName = fullName.replace(/ MRT STATION$/, '')

        stations.push({
            source: DATASETS.mrtExits.source,
            source_id: slug(shortName),
            name: NAME_FIXES[titleCase(shortName)] ?? titleCase(shortName),
            onemapName: fullName,                              // used to look up the line codes, not saved
            kind: 'mrt',
            category: null,
            line_codes: [],
            lat,
            lng,
            fact: null,
            url: null,
            radius_m: Math.min(MRT_MAX_RADIUS_M, Math.max(MRT_MIN_RADIUS_M, Math.ceil((furthest + 30) / 10) * 10)),
            exitCount: exits.length,                           // only for the report
        })
    }
    return stations
}

// OneMap search names stations like "CITY HALL MRT STATION (EW13 / NS25)" or, for big interchanges,
// one result per line: "DHOBY GHAUT MRT STATION (CC1)", "... (NE6)", "... (NS24)". Collect every code.
// Answers are cached in scripts/.cache so a second run doesn't ask OneMap again.
async function addLineCodes(stations) {
    let cache = {}
    try {
        cache = JSON.parse(await readFile(ONEMAP_CACHE, 'utf8'))
    } catch {
        // no cache yet
    }

    const headers = process.env.ONEMAP_TOKEN ? { Authorization: process.env.ONEMAP_TOKEN } : {}
    let asked = 0

    for (const station of stations) {
        if (!cache[station.onemapName]) {
            const url = 'https://www.onemap.gov.sg/api/common/elastic/search?returnGeom=N&getAddrDetails=N&pageNum=1'
                + `&searchVal=${encodeURIComponent(station.onemapName)}`
            let results = null
            for (let attempt = 1; attempt <= 3 && !results; attempt++) {
                try {
                    const res = await fetch(url, { headers })
                    results = (await res.json()).results ?? []
                } catch {
                    await sleep(4000)                          // OneMap sometimes refuses quick requests
                }
            }
            const codes = new Set()
            for (const r of results ?? []) {
                const match = r.SEARCHVAL.match(/^(.+ MRT STATION) \(([^)]+)\)$/)
                if (match && match[1] === station.onemapName) {
                    match[2].split('/').map((c) => c.trim()).filter(Boolean).forEach((c) => codes.add(c))
                }
            }
            cache[station.onemapName] = [...codes].sort()
            asked++
            if (asked % 20 === 0) console.log(`   …looked up ${asked} stations on OneMap`)
            await sleep(1500)
        }
        station.line_codes = cache[station.onemapName]
    }

    await mkdir(new URL('./.cache/', import.meta.url), { recursive: true })
    await writeFile(ONEMAP_CACHE, JSON.stringify(cache, null, 2))
}

// ============================================================================================
// 4 + 5. Decide what happens to each imported place: update, merge into a manual row, or add
// ============================================================================================
function plan(imported, existing) {
    const bySourceId = new Map(existing.filter((r) => r.source_id).map((r) => [`${r.source}|${r.source_id}`, r]))
    const manualLeft = existing.filter((r) => r.source === 'manual')
    const updates = []          // { id, changes, label }
    const inserts = []
    const merges = []           // for the report

    // "St. Andrew's Cathedral" → "st andrew s cathedral", so names can be compared
    const plain = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

    for (const place of imported) {
        // the name is NOT here: it's set once (new rows) and never overwritten, so our own names
        // ("National Gallery Singapore") aren't replaced by building names ("Former City Hall")
        const facts = {
            category: place.category,
            line_codes: place.line_codes,
            lat: place.lat,
            lng: place.lng,
            fact: place.fact,
            url: place.url,
        }

        // a) already imported before → refresh the facts only
        const known = bySourceId.get(`${place.source}|${place.source_id}`)
        if (known) {
            updates.push({ id: known.id, changes: facts, label: place.name })
            continue
        }

        // b) one of our manual places → link it (keeps its id and name, so visits still point at it).
        //    Its zone size was a guess, so it takes the one worked out from the data
        const twin = manualLeft.find((r) => {
            if (r.kind !== place.kind) return false
            if (place.kind === 'mrt') return plain(r.name) === plain(place.name)
            const metres = distanceM([r.lng, r.lat], [place.lng, place.lat])
            return metres <= MERGE_DISTANCE_M
                || (metres <= MERGE_NAMED_M && plain(place.name).includes(plain(r.name)))
        })
        if (twin) {
            manualLeft.splice(manualLeft.indexOf(twin), 1)
            updates.push({
                id: twin.id,
                changes: { ...facts, source: place.source, source_id: place.source_id, radius_m: place.radius_m },
                label: place.name,
            })
            merges.push(`${twin.name} (id ${twin.id}) ← ${place.name}`)
            continue
        }

        // c) brand new → the name and our game settings are set here, once
        inserts.push({
            ...facts,
            name: place.name,
            kind: place.kind,
            source: place.source,
            source_id: place.source_id,
            radius_m: place.radius_m,
            game_type: GAMES[inserts.length % GAMES.length],
            is_active: true,
        })
    }

    // d) imported before but gone from the data now → hide it
    const seen = new Set(imported.map((p) => `${p.source}|${p.source_id}`))
    const sources = new Set(imported.map((p) => p.source))
    const hides = existing.filter((r) => sources.has(r.source) && r.is_active && !seen.has(`${r.source}|${r.source_id}`))

    return { updates, inserts, merges, hides }
}

// ============================================================================================
// Run it
// ============================================================================================
async function main() {
    console.log(DRY_RUN ? '\nDRY RUN: nothing will be written to Supabase\n' : '\nImporting places into Supabase\n')

    console.log('1. Downloading Monuments…')
    const monuments = heritageToPlaces(await downloadGeoJson(DATASETS.monuments.id), DATASETS.monuments)
    await sleep(11000)
    console.log('2. Downloading Historic Sites…')
    const historic = heritageToPlaces(await downloadGeoJson(DATASETS.historic.id), DATASETS.historic)
    await sleep(11000)
    console.log('3. Downloading MRT Station Exits…')
    const stations = exitsToStations(await downloadGeoJson(DATASETS.mrtExits.id))

    console.log(`4. Looking up line codes for ${stations.length} MRT stations on OneMap (slow the first time)…`)
    await addLineCodes(stations)

    const { data: existing, error } = await supabase
        .from('places')
        .select('id, name, kind, lat, lng, source, source_id, is_active')
    if (error) throw new Error(`Could not read the places table: ${error.message}`)

    const imported = [...monuments, ...historic, ...stations]
    const { updates, inserts, merges, hides } = plan(imported, existing)

    // ---------- Report ----------
    console.log('\n---------- Report ----------')
    console.log(`Read: ${monuments.length} monuments, ${historic.length} historic sites, ${stations.length} MRT stations`)
    console.log(`Add: ${inserts.length}   Update: ${updates.length - merges.length}   Merge with manual: ${merges.length}   Hide: ${hides.length}`)
    if (merges.length) console.log('\nMerged (manual row keeps its id and name, gets the official location + description):\n  ' + merges.join('\n  '))
    const noCodes = stations.filter((s) => s.line_codes.length === 0).map((s) => s.name)
    if (noCodes.length) console.log(`\nMRT stations with no line codes from OneMap (fix by hand later): ${noCodes.join(', ')}`)
    const bigZones = stations.filter((s) => s.radius_m > MRT_MIN_RADIUS_M).map((s) => `${s.name} ${s.radius_m} m`)
    if (bigZones.length) console.log(`\nMRT zones bigger than 150 m (exits spread out): ${bigZones.join(', ')}`)
    if (hides.length) console.log(`\nHidden (no longer in the data): ${hides.map((r) => r.name).join(', ')}`)

    if (DRY_RUN) {
        console.log('\nDry run finished. Run again without --dry-run to write these changes.\n')
        return
    }

    // ---------- Write ----------
    for (let i = 0; i < inserts.length; i += 100) {
        const { error: insertError } = await supabase.from('places').insert(inserts.slice(i, i + 100))
        if (insertError) throw new Error(`Insert failed: ${insertError.message}`)
    }
    for (const { id, changes, label } of updates) {
        const { error: updateError } = await supabase.from('places').update(changes).eq('id', id)
        if (updateError) throw new Error(`Update failed for ${label}: ${updateError.message}`)
    }
    for (const row of hides) {
        const { error: hideError } = await supabase.from('places').update({ is_active: false }).eq('id', row.id)
        if (hideError) throw new Error(`Hiding failed for ${row.name}: ${hideError.message}`)
    }
    console.log('\nDone. Check Supabase → Table Editor → places.\n')
}

main().catch((err) => {
    console.error(`\nImport stopped: ${err.message}\n`)
    process.exitCode = 1
})
