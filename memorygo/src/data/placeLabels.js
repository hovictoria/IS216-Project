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
