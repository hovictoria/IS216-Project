# MemoryGo design refresh

A plain-language guide to the redesign: what is changing, where each file lives, and how the pieces connect.
Updated after each step, so read it alongside the code.

- **Design source:** `~/Downloads/MemoryGo-design-handoff` (added to the VS Code workspace, not copied into the repo)
  - `DESIGN_SPEC.md`: colours, fonts, components, behaviour
  - `screens/mobile-morning/`, `screens/laptop/`, `screens/ipad/`: the screens to copy
  - Each screen's real markup is inside `<x-dc> … </x-dc>`. Styles are inline, so exact sizes and colours can be read straight off them.

---

## 1. Decisions so far

| Topic | Decision |
|---|---|
| Server | Keep Express. The browser never talks to the database directly; it calls our API with its login token. |
| Games | Keep our 6 games (memory, object, sequence, pattern, missing, oddoneout). Don't touch the game pages yet. |
| 3D island | Use our TresJS scene (`components/auth/scene/`). No flat image fallback. |
| Order | Layout and design first. Database changes come later. |
| XP and levels | XP is just a number on the Me page. No levels for now (can expand later). |
| Remember me | Off for now. `lib/supabase.js` uses `persistSession: false`, so closing the tab or refreshing signs you out. Delete that option to turn it back on. |
| Base map | Keep MapLibre + OpenFreeMap (free, no API key, can be recoloured, has 3D buildings). Mapbox was considered but it can't plan MRT trips. |
| Search + routes | OneMap (Singapore Land Authority): place search and walk / public-transport routing. Always called through Express so the token stays secret. We don't write a search algorithm. |
| Map pins | Real three.js models (`lib/mapPins3d.js`), not the .webp pictures. |
| Day / night | **Morning only for now.** No time-based changes anywhere in the new screens (the search bar always says "Good morning"). Night mode (19:00-06:00 Singapore time, from `screens/mobile-night/`) comes later. **Haze is dropped.** |
| Place data | Import from data.gov.sg with a script, run **by hand once** (re-run only to refresh). The app never calls data.gov.sg; it reads our own `places` table. Imported rows get `source` + `source_id` so re-runs update instead of duplicating. |

---

## 2. Progress

Phase 1: the auth screens (landing, sign in, sign up)

- [x] 1. `styles/tokens.css` + `styles/base.css`, imported in `main.js`
- [x] 2. `components/ui/PrimaryButton.vue` + `HandUnderline.vue`
- [x] 3. `components/auth/AuthLayout.vue` (phone first, then laptop)
- [x] 4. `components/auth/landing.vue`
- [x] 5. `components/ui/TextField.vue` + `components/auth/login.vue`
- [x] 6. `components/auth/signup.vue` (Confirm password added, later removed again)
- [x] 7. `router/index.js`: after login, go to `/map` instead of `/menu`

All 7 done on 2026-10-28. Also: `index.html` now loads Inter Tight and the tab title is "MemoryGo".

Landing / auth polish (after phase 1):
- [x] Laptop (1200px+): bigger island on the landing page
- [x] "Start exploring" + "I already have an account" never wrap: the text column is at least 6vw + 520px
      (`--text-column` in `AuthLayout.vue`), and the island box starts where it ends, so on narrow screens
      the island shrinks instead. Known weak spot: iPad portrait (768 px) leaves the island small
- [x] Sky background (`components/auth/SkyBackdrop.vue`): warm gradient + sunlight glow behind the island,
      a faint paper map (streets, river, dashed routes, pins) in a patch around the island that fades out
      before the title, and light paper grain. Chosen from 5 try-outs (plain, glow, map, skyline, blobs)
- [x] Phone landing: bigger island (box top 21%, height 66%, spills 12% past each side)
- [x] Sign up: "Confirm password" removed (the Show button lets people check what they typed). On an
      iPhone 15 (393 x 852) the whole form, including "Create account", now fits without scrolling
- [x] Laptop sign in / sign up: form panel 620px → 560px, form 440px → 480px, so ~40px margin each side
      (was ~120px, which made the form look lost). The island gets the extra 60px

Not built yet: the "Forgot password?" link (needs its own page), and the "How it works" / "For families" header links
from the laptop prototype (no pages for them).

Phase 2: the Map screen (design only), done 2026-10-28

- [x] `views/map.vue` rewritten to match prototype 04/05/06 (phone) and 03-WebMap (laptop)
- [x] Places came from `data/places.js` at first; since Phase 3 step 5 they come from the server
- [ ] Place preview, Search, Route, Journey: later screens
- [ ] Old map features not carried over yet: tapping a station to play a game, Spirit popups, dev fake-location
      tools (still in git history: `git show HEAD:IS216-Project/memorygo/src/views/map.vue`)

Phase 3: back end (places, search, routes)

- [x] Step 1: `places` table designed → `docs/places.sql` (run it in the Supabase SQL Editor)
- [x] Step 2: run it in Supabase (done, table is empty)
- [x] Step 3: seed 17 places around SMU → `docs/places-seed.sql` (run in Supabase; coordinates from OneMap; first 6 = old `data/stations.js` ids)
- [x] Step 4: `GET /api/places` in Express → `server/routes/places.js` (signed-in only, hides `is_active = false`, camelCase fields).
      Checked: answers "Not signed in." without a login. Not yet tried with a real login (step 5 will show it)
- [x] Extra: 3D pins and chest with three.js → `lib/mapPins3d.js` (done before step 5, works with the 5 placeholder places)
- [x] Step 5: map loads places from the API (`loadPlaces()` in `views/map.vue`), `data/places.js` deleted,
      game names + MRT colours moved to `data/placeLabels.js`. Shows "Finding places near you…" while loading and
      "Couldn't load places" + Try again if the server fails. Every place is playable until step 6
- [ ] Step 7 (doing before 6): import places from data.gov.sg
  - [x] 7a: `docs/places-import.sql` adds `source`, `source_id`, `url` + unique (source, source_id) (run in Supabase)
  - [x] 7b: datasets found: Monuments `d_b29c230ec6b609e29ed42f71ca9a8767` (77), Historic Sites
        `d_31e16b12809e66673e90d8b04fdee1b2` (100), LTA MRT Station Exit `d_b39d3a0871985372d7e1637193335da5`
        (613 exits → 188 stations, 41 LRT). Museums are no longer published on data.gov.sg
  - [x] 7c: `server/scripts/import-places.js` written (exits grouped to one pin per station; line codes from OneMap,
        cached in `server/scripts/.cache/`). Decided: skip LRT, skip museums, include historic sites,
        drop `reward_coins` in step 6
  - [x] 7d: dry run. First one showed 3 problems, all fixed in the script:
        - our names were being replaced by building names ("National Gallery Singapore" → "Former City Hall")
          → names are now set once and never overwritten
        - CHIJMES and Raffles Hotel would have been added twice (official points 89-99 m from ours)
          → spots also merge within 150 m if the official name contains ours
        - MRT zones up to 360 m (Marine Parade) → zones now stay between 150 m and 250 m
        Second dry run: 324 read (77 monuments, 100 historic sites, 147 MRT), add 311, merge 13, hide 0,
        every station got its line codes
  - [x] 7e: real run done (`node scripts/import-places.js` in `server/`) → 328 rows expected (17 ours + 311)
  - [x] 7f: map copes with ~330 places (`views/map.vue`, `lib/mapPins3d.js`):
        - "Near you" cards: places within 2 km of YOU, nearest first, max 20 (`visiblePlaces`)
        - pins + zones: places within 3 km of the MIDDLE OF THE MAP, follow you as you pan (`pinPlaces`)
        - zoomed out past level 13: no pins, "Zoom in to see places" note
        - map starts on you (`showNearby()`), and jumps once to your real location when the browser gives it
        - nothing within 2 km: "No places within 2 km of you…"
        - HTML markers and 3D models are only created for places in range, and removed when they leave
        Tested with 324 places: near SMU 20 cards / 159 pins, zoomed out 0 pins + note, far west 0 cards + message
  - [x] MRT cards take their line's colour (`PlaceCard.vue`, `lineBackground`): a soft tint (40% line colour mixed
        into the paper colour) so black text stays readable; interchanges blend their lines diagonally
        (City Hall green → red). Phone cards are see-through (70%), sidebar cards solid. Collected / undiscovered
        stations keep their state colour. Unknown line → the old butter yellow
  - [x] Decluttering (overlapping zones made it look like you could play many places from one spot):
        - dashed zone drawn only for the SELECTED place; all nearby zones only from zoom 16.5 (`ALL_ZONES_ZOOM`)
        - pins shrink when zoomed out: 100% at zoom 16+, 60% at 14 and below (`pinScale()` in `lib/mapPins3d.js`,
          the tap areas use the same rule through the `--pin-scale` CSS variable)
        - below zoom 15 only MRT stations show (+ the selected place); spots appear from 15 (`SPOTS_ZOOM`)
        - below zoom 15 the MRT line-code pills hide, except on the selected station (`.far-zoom` class)
        Zone SIZES are unchanged (GPS in the city is often 20-50 m off). The real fix for "play many places
        from one spot" is a server rule in step 6: only the NEAREST place is playable + 5 min between paid visits
        Follow-up: some official names are long ("Former Saint Joseph's Institution (now Singapore Art Museum)");
        rename them in Supabase if wanted, the import never overwrites names

  Rebuilding the places from scratch (e.g. a teammate's Supabase), in this order:
  1. `docs/places.sql`  2. `docs/places-seed.sql`  3. `docs/places-import.sql`  4. `node scripts/import-places.js`
  Keep `places-seed.sql`: SMU Connexion, Spice Garden, Fort Canning Park and Capitol Theatre exist only there,
  and it gives ids 1-17 (ids 1-6 = the old stations that `user_spirits.station_id` points at).
  Don't clear the table before importing: the script merges into our rows by matching them.
- [ ] Step 6: `visits` table (playable / collected / undiscovered per user)
- [ ] Step 7: OneMap account + `/api/search`
- [ ] Step 8: `/api/route` + "on the way" filter (Turf `pointToLineDistance`)
- [ ] Step 9: live journey + tap in

Rewards (decided): no daily re-roll. Coins and XP keep today's score-based formula (better score = more),
paid only at a real place, once per place per day. Chests are left for later; until then places are red / blue / green only.

Open question (later, not blocking): what makes a place a **chest** ("undiscovered")? The spec doesn't say.
Suggested: option A, a few **bonus places** marked with an `is_bonus` column (e.g. National Gallery, Fort Canning at +30).
Rejected: "never visited" (a new user's map would be all chests) and "far away" (chests would flicker as you walk).

Decisions: one row per MRT station (interchanges list all codes), MRT zones 150 m / spots 100 m,
each place always plays the same game, RLS on with no policies (browser can't read the table, Express can).

Anti-cheat rules for rewards (decided before step 6, `visits` table):

- Coins once per place per Singapore day. Replaying the same day is allowed but earns 0 coins
- The server takes the coin amount from `places.reward_coins`, never from the browser
- The server checks the player is inside the play zone (can be faked with DevTools, accepted for this project)
- A unique rule in the database allows one paid visit per (user, place, day), so double-taps and two tabs can't double-pay
- Spirits only drop from a paid visit; the old `/api/progress/xp` and `/api/spirits/collect` get retired
  (today both can be called again and again with no limit)
- No daily coin cap for now (only 17 places)

Later: forgot / reset password, night mode (haze dropped), then the Place preview, Search, Route, Journey, Spirits and Me screens.

---

## 3. File map (inside `memorygo/src/`)

```
src/
├── styles/                      NEW
│   ├── tokens.css               colours, font, radii, glass recipes as CSS variables
│   └── base.css                 page defaults: font, background, focus ring, reduced motion
├── components/
│   ├── ui/                      NEW: small pieces every screen reuses
│   │   ├── PrimaryButton.vue    black pill + green dot + hand-drawn arrow
│   │   ├── HandUnderline.vue    orange scribble under one word
│   │   └── TextField.vue        label + input + optional Show/Hide
│   └── auth/
│       ├── AuthLayout.vue       REWRITE: sky + island + paper sheet
│       ├── SkyBackdrop.vue      the sky: warm glow + faint paper map + grain
│       ├── landing.vue          REWRITE
│       ├── login.vue            RESTYLE (same script)
│       ├── signup.vue           RESTYLE + confirm password
│       └── scene/               KEEP as-is
├── stores/auth.js               unchanged for now
├── router/index.js              small change (redirect to /map)
└── main.js                      import the CSS, remove the old useGameReward copy
```

### Map screen files (phase 2)

```
src/
├── views/map.vue                  the page: MapLibre map, markers, play zones, top bar, sheet, nav
├── components/map/
│   ├── BottomSheet.vue            phone: draggable sheet (down / middle / up). iPad/laptop: left sidebar
│   ├── PlaceCard.vue              coloured card for one place (rail / stacked / compact layouts)
│   └── SearchBar.vue              "Good morning! Where to?" (look only for now)
├── components/ui/
│   ├── AppNav.vue                 Map / Spirits / Journey / Me (bottom on phone, top-right on big screens)
│   ├── CoinPill.vue               coin count pill (asks the Express server: GET /api/progress)
│   └── CoinIcon.vue               the gold coin drawing
├── data/placeLabels.js            game names + MRT line colours (places themselves come from GET /api/places)
├── lib/geo.js                     distance, "300 m · 4 min walk", play-zone circle maths
├── lib/paperMapStyle.js           the warm map colours (moved out of the old map.vue)
├── lib/mapPins3d.js               3D pins + chest drawn by three.js INSIDE the map (one custom layer)
└── assets/markers/                the old .webp pins (no longer used, safe to delete)
```

### Back-end files (phase 3)

```
IS216-Project/
├── docs/
│   ├── places.sql                 creates the `places` table (run once in the Supabase SQL Editor)
│   ├── places-seed.sql            the 17 starting places (run once, after places.sql)
│   └── places-import.sql          adds source / source_id / url for the data.gov.sg import
└── server/
    ├── server.js                  + app.use('/api/places', placesRoutes)
    ├── routes/places.js           GET /api/places → { places: [...] } (signed-in only)
    └── scripts/import-places.js   run by hand: data.gov.sg → places table (--dry-run only prints)
```

How the map page works:

1. `loadPlaces()` asks Express (`GET /api/places`) → `places` → `visiblePlaces` (cards, near you) + `pinPlaces` (pins, near the map centre) (filtered by All/MRT/Spots, sorted nearest first, with distance)
2. The same list feeds both the **cards** (in the sheet) and the **markers + dashed zones** (on the map)
3. Tapping a card or marker sets `selectedId` → the map glides there and shows the "Name · 300 m" label
4. The sheet's `detent` (v-model) decides the card layout and how much map padding to leave at the bottom
5. Location: if the browser allows it, the blue dot follows you; otherwise it stays at SMU
6. On first load `showNearby()` centres the map on you (zoom 16 on big screens, 15.2 on phone); `onMapMoved()` tracks pans

Map gotchas found while building:

- Markers are plain DOM elements made in JS, so scoped styles need `:deep()` to reach them
- Never set `position` on a marker: MapLibre needs `position: absolute` to place it
- 3D pins: three.js draws them inside MapLibre's own canvas (a "custom layer"), NOT with TresJS, because TresJS
  needs its own canvas and browsers allow only ~16. The HTML marker is kept as an invisible tap area + label.
  Pins only redraw while animating (hop on select, chest lid opening), and stay still with reduced motion
- Don't name a class `placeholder` (Bootstrap draws it as a grey loading bar) or `brand` (views/main.vue makes it Fraunces)
- `fitBounds` silently did nothing on phone, so the page uses `jumpTo` to the centre of all places with a fixed zoom instead
- The headless test browser sometimes showed a blank map; that was the test, not the code
- Markers are built inside `loadPlaces()`, AFTER the server answers, not straight away in `onMounted`
- `views/main.vue` (old menu) imports `assets/morning.jpg`, `afternoon.jpg`, `night.png`. The router loads it at
  start-up, so deleting those images makes EVERY page blank. Keep them until the menu becomes the Journey tab

### Why the `ui/` folder?

The black "Start exploring" button shows up on almost every screen (Sign in, Take me there, Start journey, Tap in).
Building it once means every screen looks the same and a change is made in one place.

### Why tokens?

A token is a named colour or size, e.g. `--ink: #161412`. Screens use `var(--ink)` instead of the hex code.
When night mode arrives, we only change the token values, not every screen.

---

## 4. How the auth screens fit together

```
main.js
  └─ loads tokens.css + base.css, restores the saved login (auth.init), then mounts the app
       └─ router/index.js picks the page
            ├─ "/"       → landing.vue ─┐
            ├─ "/login"  → login.vue   ─┼─ each wraps its content in <AuthLayout>
            └─ "/signup" → signup.vue  ─┘
                                          AuthLayout = sky + 3D island (scene/) + paper sheet
                                            ├─ slot "hero"  → what sits on the sky (title on landing)
                                            └─ default slot → what goes in the sheet (buttons or form)
```

- **Phone:** island on the sky, sheet rising from the bottom.
  - Landing: short sheet (two buttons), title above the island.
  - Sign in / Sign up: tall sheet (the form), island pushed up.
- **Laptop (1200px and wider):** split screen, with text or the form on the left and the island on the right.
- **iPad:** in between.

### What happens when you press "Sign in"

1. `login.vue` calls `auth.signIn(email, password)` in `stores/auth.js`.
2. The store asks Supabase. It returns `null` on success, or a friendly error message.
3. On success the router goes to `/map`. On error, the message shows under the form.

This logic stays the same. Only the look changes.

### Reading order (to understand the code)

1. `styles/tokens.css`: the names (`--ink`, `--paper`, `--sky`...) everything else uses
2. `components/ui/PrimaryButton.vue`: how one component can be a link *or* a button (`<component :is>`)
3. `components/ui/TextField.vue`: how `v-model` passes through a component (`defineModel`)
4. `components/auth/AuthLayout.vue`: the three layers (island, header, content) and the `variant` prop
5. `components/auth/landing.vue`: filling the `#hero` slot and the default slot
6. `components/auth/login.vue` / `signup.vue`: same script as before, new template

### How AuthLayout stacks things

```
<section class="auth">              sky colour, fills the screen
  ├─ SkyBackdrop (z-index 0)        warm glow + faint map + grain, behind everything
  ├─ .island   (z-index 0)          the 3D scene, absolutely positioned behind everything
  ├─ .header   (z-index 2)          back button (form) or logo + Sign in (landing, iPad/laptop only)
  └─ .content  (z-index 1)          flex column the height of the screen
       ├─ .hero                     slot "hero" (only if the page gives one)
       └─ .sheet                    margin-top: auto pushes it to the bottom
            └─ .sheet-inner         default slot
```

- `.content` has `pointer-events: none` so empty space doesn't block anything; `.hero` and `.sheet` turn it back on.
- At 768px+ the CSS moves the boxes: the landing content becomes the left half; the form sheet becomes the right half
  (560px wide at 1200px+, with a 480px form), with the island on the other side.

---

## 5. Things to watch out for

- **Bootstrap is still loaded** because other pages use it. Its global CSS can change fonts and link colours.
  The new auth pages use no Bootstrap classes, and `base.css` is imported after Bootstrap so ours wins.
- **`views/main.vue` has an unscoped `<style>`** (no `scoped`), so its rules apply to every page:
  - It sets every `h1` / `h2` to Fraunces. That's why the new headings set `font-family: var(--font)` themselves.
  - It also defines `--ink` and `--terracotta` on `:root`, the same names as `tokens.css`. Ours load later and win,
    so the old menu page now picks up the new colours. This goes away when the menu becomes the Journey tab.
- **Readable sizes:** nothing the user must read below 16px; body text 17–18px; buttons at least 44px tall
  (main buttons 56–64px). Some prototype labels are 13–15px; we bump them up.

---

## 6. Background: how XP and levels work today

**Server** (`server/routes/streak.js`, `POST /api/progress/xp`):

- Each game turns its result into a score from 0 to 1.
- Reward = `min + score × (max − min)`, with XP 10–30 and coins 5–15.
- Adds the reward to `xp` and `coins` in the `progress` table, and updates the streak and the week's ticks.

**Frontend** (`src/config/progression.js`):

| Level | XP needed | Unlocks |
|---|---|---|
| 1 | 0 | memory, object-id, Area 1 |
| 2 | 100 | odd-one-out |
| 3 | 250 | pattern |
| 4 | 450 | what's-missing, Area 2 |
| 5 | 700 | sequence |

- The level is never saved. It is worked out from XP each time with `levelFromXp()`.
- Only the map's **area lock** actually blocks anything. Game unlocks only appear in the level-up popup.
- The new design has no levels. Suggestion: show XP as a stat on the Me page and drop the area lock.

---

## 7. Database: today vs the new design (for later)

| New design | Today | Plan |
|---|---|---|
| `places` | hardcoded in `src/data/stations.js` | **done**: table + 17 places + `GET /api/places` |
| `visits` | completed stations saved only in the browser (`localStorage`) | new table (step 6, anti-cheat rules in Phase 3) |
| `profiles` | `progress` already has coins; name is in the login's metadata | keep `progress` |
| `spirits` / `user_spirits` | same idea; `station_id` column | rename to `place_id` |
| `practice_sessions` | none | new table (Play anytime, "This week") |
| `daily_challenges` | none | optional |

Rule change to plan for: coins only from playing **on location**. Practice from home gives no coins.

---

## 8. Back end: how the pieces connect

### The map, the pins and where data comes from

| What you see | Where it comes from |
|---|---|
| Streets, buildings, water | OpenFreeMap tiles, downloaded straight by the browser. No key. Set in `lib/paperMapStyle.js` (`MAP_STYLE_URL`) |
| The paper colours | `applyPaperStyle()` recolours every map layer after it loads |
| Pins + chests | `lib/mapPins3d.js` (three.js, inside the map). The HTML marker on top is an invisible tap area + label |
| Dashed play zones | GeoJSON layer drawn by MapLibre (`zonesGeoJson()` + `circleRing()` in `lib/geo.js`) |
| Blue "you" dot | The browser's location (`watchPosition`), or SMU if location is off |
| Places | Supabase `places` → Express `GET /api/places` → `loadPlaces()` in `views/map.vue` |
| Coins | Express `GET /api/progress` |

What each pin means (decided by `markerKind()` in `views/map.vue`):

| Pin | Means |
|---|---|
| Red | Heritage spot you can play at |
| Blue | MRT station you can check in at (line-code pill underneath) |
| Green | You've played it (Spirit collected), replay allowed |
| Chest | Undiscovered (definition still open, see Phase 3) |

How a pin gets on the map: `createMarkerEl()` builds the HTML tap area → `new maplibregl.Marker(...).setLngLat([lng, lat]).addTo(map)`
pins it to the place → MapLibre moves it as you pan/zoom → `refreshMarkers()` updates labels, filter and selection, and calls
`pins3d.sync()` so the 3D models match.

### Search and routes (steps 7-8, planned)

```
You type "SMU"   → GET /api/search?q=smu        → Express → OneMap search  → names + coordinates
You pick one     → GET /api/route?to=…&mode=…   → Express → OneMap routing → legs: walk → MRT → walk, each with a line
                                                  Express → checks which of our places are near the line
                 ← blue line + "On your way" list (e.g. Bencoolen MRT +5, CHIJMES +20) → Start journey
```

- **We don't write a search algorithm.** OneMap does search and routing. Our only logic is the "on the way" check:
  a place counts if `turf.pointToLineDistance(place, route) <= place.radiusM`.
- On MRT legs only the stations where you get on and off count (you can't play while riding).
- OneMap search answered without a token in testing, but warned that one is required. Routing needs one.
  Create a free account at onemap.gov.sg; the login goes in `server/.env` only, and Express renews the token.
- OneMap is strong on buildings, MRT, addresses and postal codes; weaker on small shops (Google is better there,
  but its terms want Google results shown on a Google map, which would lose our paper style).

### Keys: where they live

| Key | Where | Note |
|---|---|---|
| Map tiles | none | OpenFreeMap needs no key |
| Supabase server key | `server/.env` | Bypasses RLS. Never sent to the browser |
| Supabase publishable key | `memorygo/.env.local` | Safe in the browser; RLS protects the tables |
| OneMap login / token (later) | `server/.env` | Never sent to the browser |

### Tidy-up files in `memorygo/` (keep them)

- `.editorconfig`: editor settings (spaces, line endings). It says 2-space indent but our code uses 4; can be changed to 4
- `.oxlintrc.json`: settings for `pnpm lint` (catches likely bugs)
- `.prettierrc.json`: settings for `pnpm format` (no semicolons, single quotes, 100-character lines)

None of them change how the app runs. Deleting `.prettierrc.json` would make `pnpm format` add semicolons and double quotes everywhere.

