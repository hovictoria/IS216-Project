// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   lib/geo.js
// purpose:    - small map maths helpers (distance, walking time, play-zone circles)
//             - all positions are [lng, lat], the same order MapLibre uses
//             - later, Turf.js can replace these when we need route maths
// ----------------------------------------------------------------------------------------------------------

const EARTH_RADIUS_M = 6371000
const WALK_M_PER_MIN = 80          // a gentle walking pace

const toRad = (deg) => (deg * Math.PI) / 180

// Straight-line distance in metres between two [lng, lat] points (haversine formula)
export function distanceM([lng1, lat1], [lng2, lat2]) {
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

// "300 m · 4 min walk" (rounded to the nearest 50 m so it doesn't flicker as you move)
export function distanceLabel(metres) {
    const rounded = Math.max(50, Math.round(metres / 50) * 50)
    const distance = rounded >= 1000 ? `${(rounded / 1000).toFixed(1)} km` : `${rounded} m`
    const minutes = Math.max(1, Math.round(metres / WALK_M_PER_MIN))
    return `${distance} · ${minutes} min walk`
}

// A circle on the map is really a many-sided polygon. Returns its ring of [lng, lat] points
export function circleRing([lng, lat], radiusM, sides = 64) {
    const ring = []
    const dLat = radiusM / 111320                          // metres per degree of latitude
    const dLng = radiusM / (111320 * Math.cos(toRad(lat))) // longitude degrees shrink away from the equator
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * 2 * Math.PI
        ring.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)])
    }
    return ring
}
