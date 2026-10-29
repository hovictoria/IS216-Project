// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   lib/spiritsCache.js
// purpose:    - remembers the last GET /api/spirits answer, so tapping a tile on the Spirits tab opens its
//               page straight away instead of waiting for the server again
//             - the Spirits tab always asks the server (fresh), then saves the answer here
//             - the Spirit page uses it if it's there, and only asks the server when opened from a link
// ----------------------------------------------------------------------------------------------------------

let saved = null

export const rememberSpirits = (data) => { saved = data }
export const savedSpirits = () => saved
