// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   data/placeLabels.js
// purpose:    - display settings for places: how a game is named on a card, and each MRT line's colour
//             - the places themselves live in the Supabase `places` table (GET /api/places), not here
// ----------------------------------------------------------------------------------------------------------

// Display names for our 6 games (the keys match places.game_type and the routes in router/index.js)
export const GAME_LABELS = {
    memory: 'Memory match',
    object: 'Object hunt',
    sequence: 'Sequence',
    pattern: 'Pattern',
    missing: 'What’s missing',
    oddoneout: 'Odd one out',
}

// MRT line colours, picked by the first two letters of a code ('EW13' -> 'EW')
export const MRT_COLOURS = {
    NS: '#D42E12',
    EW: '#009645',
    CC: '#FA9E0D',
    NE: '#9900AA',
    DT: '#005EC4',
    TE: '#9D5B25',
}

// Full line names for directions ("Downtown Line" instead of "DT"). CG (Changi Airport branch) and
// CE (Circle Line extension) are shown as their main lines
export const MRT_LINE_NAMES = {
    NS: 'North-South Line',
    EW: 'East-West Line',
    CG: 'East-West Line',
    CC: 'Circle Line',
    CE: 'Circle Line',
    NE: 'North East Line',
    DT: 'Downtown Line',
    TE: 'Thomson-East Coast Line',
}

// the colour for any line code, including the branches above ('CG' → East-West green)
export const lineColour = (code) => MRT_COLOURS[{ CG: 'EW', CE: 'CC' }[code] ?? code] ?? '#161412'
