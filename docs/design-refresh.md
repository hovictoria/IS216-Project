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
  - [x] Location status (`views/map.vue`, `locationStatus`): the SMU fallback is no longer silent. A note says
        "Finding your location…", "Still finding you", "Location is off", "Location needs https" (e.g. iPad over
        http://192.168…) or "Outside Singapore". The blue dot only appears once a real location arrives.
        Step 6: tap-in only allowed when `locationStatus` is 'ok'. Typical first fix: phone 1-5 s outdoors,
        laptop 1-3 s (Wi-Fi), indoors / underground can take much longer
  - [x] Map limited to Singapore (`views/map.vue`): `maxBounds` = a box from past Tuas / below Sentosa to past
        Changi / above Woodlands (`SINGAPORE_BOUNDS`), `minZoom: 10` (about the whole island). Users can't pan or
        zoom out of Singapore. The box is a rectangle, so a strip of Johor Bahru shows along the top edge.
        If the browser says the user is outside that box (e.g. KL), the map stays on the city centre with
        "You're outside Singapore. Showing the city centre"
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

  The SQL files used to build the database (places.sql, places-seed.sql, places-import.sql, visits.sql,
  visits-random-game.sql, spirit-places.sql) were run in the team's shared Supabase project and then removed
  from the repo. The shared database is the record of how it's set up; the descriptions above still explain
  what each one did. Don't clear the places table before re-importing: the script merges into our rows.
- [ ] Step 6: `visits` + tap-in rewards. Decided: MRT pays the same as spots (5-15 coins, 10-30 XP, score-based)
  - [x] 6c prep: `/api/places` and `PlaceCard.vue` no longer use `reward_coins`; cards say "Up to 15 coins" /
        "Check in · up to 15" / "Replay · up to 15"
  - [x] 6c: `docs/visits.sql` (run in Supabase): drops `places.reward_coins`, creates `visits` (one paid visit per
        user + place + Singapore day via a partial unique index; stores distance only, not coordinates), and the
        `finish_visit()` payout function (finish + pay + add to progress in one step; execute revoked from
        browsers, only the server's service role can call it)
  - [x] 6d: `server/routes/visits.js`, mounted at `/api/visits` in `server.js`
        - POST /start { placeId, lat, lng }: inside the zone? nearest zone you're in? → paid or replay
          (replay if already paid here today, or last paid visit < 5 min ago); resumes an unfinished paid visit
          from the last 30 min; saves distance only. Replies { visitId, game, paid, reason, waitMinutes }
        - POST /:id/finish { moves | score | level }: scores it with the existing formula (`GAMES`, `rewardFor`
          now exported from `streak.js`), pays through `finish_visit()`, updates the streak if paid.
          Replies { paid, earned: { coins, xp }, totals }
        - checked: both answer "Not signed in." without a login. Full test comes with the map + Memory match
  - [x] 6e: `/api/places` adds `visited` (finished a game there ever → green pin, for good) and `playedToday`
        (paid there today → "Played today · back tomorrow") for the signed-in user
  - [x] 6f: map (`views/map.vue`): "Tap in at <place> · Earn up to 15" button at the top of the sheet when your
        REAL location is inside a zone (nearest zone wins); calls POST /api/visits/start, then opens
        `/games/<game>?visit=<id>`. If the server says no, its message shows under the button.
        Cards: green "Been here" tag (was "Spirit collected": Spirits don't drop from visits yet)
  - [x] 6g + 6h: all 6 games at once: `lib/gamereward.js` sends the result to POST /api/visits/<id>/finish when
        the address has ?visit=, otherwise the old /api/progress/xp (games menu; retire later)
        Tested with a fake location next to Tan Tock Seng Hospital: button shows, tap in opens Memory match
  - [x] Games are RANDOM per visit (decided: a place you pass every day shouldn't always give the same game).
        The server picks one of the 6 at tap-in, never the same as your last visit to that place, and saves it
        on the visit (`visits.game`, added by `docs/visits-random-game.sql`) so the result is scored for the game
        actually played. Cards say "Surprise game". `places.game_type` is no longer used
  - [x] Fix: "Play for fun" showed after tapping in WITHOUT finishing. Now `playedToday` = FINISHED a paid game
        today; a new `inProgress` (tapped in < 30 min ago, not finished) shows "Continue · up to 15" and tapping
        in resumes the same paid game. An abandoned paid visit older than 30 min is released (paid → false) at
        the next tap-in, so it doesn't cost the day's reward
  - [ ] Later: retire /api/progress/xp (games-menu practice still pays through it), "back to map" after a
        tap-in game

Spirits (design: `~/Downloads/MemoryGo-spirits-handoff 2`, 24 Spirits in 6 area sets of 4, SVG designs are the look)

- Decided: a Spirit is ALWAYS found on your first paid game at its place (no luck); rarity = how special / far the
  place is; finishing a set's 4 gives a bonus chest (+50 coins, once); chest pins on the map = a Spirit is hiding
  there. Grid / cards use the SVG drawings, the detail page + "You found a Spirit!" reveal use three.js (one at a time)
- New tables `spirit_catalog`, `spirit_finds`, `spirit_sets_done`. The old `spirits` / `user_spirits` stay in
  Supabase unused until the project is done. The new Spirits page follows the old `charactercollection.vue` logic
  and style; that file is left untouched
- [x] S1: Spirit places. 7 reused (#7 St Andrew's, #8 CHIJMES, #14 City Hall, #9 National Gallery, #3 Bras Basah,
      #59 Thian Hock Keng, #120 MacRitchie). 16 added by spirit-places.sql (OneMap coordinates; run, then removed).
      Toa Payoh Dragon Playground added by `docs/spirit-dragon-playground.sql` (Google Maps: 1.331996, 103.854332,
      because OneMap doesn't list it)
- [x] S2: `docs/spirits.sql` (run; 24 Spirits, all placed): `spirit_catalog` (colour, rarity, set, place, lore,
      order; one Spirit per place), `spirit_finds` (one row per player per Spirit), `spirit_sets_done` (bonus once),
      all server-only. `finish_visit()` replaced: same payout + a paid game finds the place's Spirit + last of a set
      → +50 coins; also returns spirit_id, set_done, set_bonus. Lore: Kopi's from the design, 23 are drafts to edit
- [x] S3 server:
      - `routes/spirits.js` (the old file, same style, new tables): GET / → { spirits (with placeName, lat, lng,
        set, rarity, lore, colour), found (spirit_id, found_at, game, visit_id), setsDone }; GET /today reads
        spirit_finds; POST /collect retired (410 "Spirits are now found by playing a game at their place")
      - `routes/visits.js` finish: also returns `spirit` (the Spirit just found, or null) and `setDone` ({ name, bonus })
      - `routes/places.js`: each place has `spiritHidden` (a Spirit you haven't found is here → chest pin) and
        `spiritFound`. The Spirit's name isn't sent, so it stays a surprise
- [x] S4: 3D Spirits (three.js, matching the 24 SVGs) + SVGs copied into the app
      - [x] the 24 drawings + `_locked.svg` copied to `memorygo/src/assets/spirits/` (checked: no scripts / links)
      - [x] `src/three/spiritModel.js`: `buildSpirit({ id, color })` = squashed sphere body + face (eyes, cheeks, smile)
            placed on the body's surface where the drawing has them, plus the Spirit's own parts (DECOR[id]).
            Drawing → 3D: x → (x − 50) / 30, y → (58 − y) / 30 (every drawing's body is a circle at 50, 58, r 30);
            flat parts (claws, crown) are traced from the SVG paths and given thickness. Lights: key light top-left
            like the drawings' highlight; `addSpiritShadow()` = the soft oval under it
      - [x] `src/components/spirits/SpiritCanvas.vue`: one live 3D Spirit (bob, sway, blink; still with reduce motion)
      - [x] all 24 built and compared side by side with their drawings (front + turned)
            - PAINTED parts (the part of each drawing clipped to the body circle: Kaya's layer, Kueh Lapis's
              stripes, Boba's pearls, Rojak's sauce, Ondeh's flakes, ...) are read straight from the SVG and painted
              onto the 3D body as a texture (`bodyPaintOf`, `projectFromFront`, `paintedMaterial`). They load a moment
              later: `await model.ready` before taking a picture
            - eye height read from each drawing (`eyeHeightOf`): faces sit higher when holding / wearing something
            - parts that stick out are built per Spirit in DECOR (cups, bowls, cone, ring, bread, leaves, mooncake, ...)
            - fixes after comparing: Boba's straw (same pink as the cheeks, first missed), Murtabak's lines, Prata
              tipped towards the viewer, Kacang's cone made big enough to hold the body, Otah's leaf lowered off the smile
      - S4 done
- [x] S5: Spirits tab, in the friend's own file `components/charactercollection.vue` (her logic kept so she can follow it)
      - kept: `spirits`, `found`, `loading`, `errorMsg`, `filter`, `categories`, `countTotal`, `countFound`, `isFound`,
        `getFoundRow`, `formatDate`, `visibleSpirits`, `onMounted` try/catch/finally, her comments
      - changed: `categories` = the 6 sets; `formatDate` reads `found_at`; `visibleSpirits` puts found ones first
        (newest first) and has a "Not yet" filter; `onMounted` also reads `setsDone`
      - added: `setsDone`, `coins`, `newest`, `currentSet`, `pictureOf(id)` (SVGs via `import.meta.glob`), `lockedPicture`
      - removed: `AppMenu` (→ `AppNav`), `readAloud`, `stations` / `getStation`, the flip cards
      - layout: header + progress "N of 24 found", newest card (or "Find your first"), set card ("Civic District set ·
        3 of 4", +50 coins), All / Found / Not yet, grid of tiles (3 across on phone, 4 from 768px; `minmax(0, 1fr)`
        so long place names wrap instead of widening a column). Locked tiles show `_locked.svg`, "???" and the place
      - checked on phone and laptop with pretend data (5 found): 24 tiles, 0 broken pictures, "Not yet" shows 19
- [x] S6: Spirit detail, `views/spirit.vue` at `/spirits/:id` (same GET /api/spirits, no server change)
      - found: peach hero with the live 3D Spirit (`SpiritCanvas`), dashed ring + sparkles, back button, rarity chip
        (Common white outlined, Rare `#A9CDE8`, Epic `#C9B8F5`, Legendary `#F3D57C`); name with the hand underline,
        lore, 4 tiles (Found at, On, Game, Set "Civic District · 3 of 4"); "Show on map" + share ("Share with a kaki",
        only on devices with a share sheet)
      - not yet: grey hero with the "?" drawing, "???", "A Spirit is hiding at …", Hiding at + Set tiles, "Show on map"
      - laptop / iPad: Spirit on the left, details on the right
      - Spirits tab: every tile and the newest card now link here (`RouterLink`, in her file)
      - "Show on map" → `/map?place=<id>`: `views/map.vue` opens that place's card once places load, and doesn't
        jump away to the user when their location arrives
      - checked with pretend data: phone + laptop, a locked one, and Show on map opening City Hall
      - speed + prototype fixes (after "slow, doesn't follow the prototype"):
            - slow part was the server, not 3D (3D build < 10 ms, 60 fps): GET /api/spirits ran its 3 queries one
              after another (~0.5 s) and the Spirit page asked again. Now `Promise.all` in routes/spirits.js, and
              `lib/spiritsCache.js` keeps the tab's answer so a tile opens its page at once (one fetch, not two)
            - tab matched to screens/01-02: progress bar + "N of 24 found" on one row, arrow on the newest card,
              glass = blur 24 + saturate 180% + inset highlight (tiles pick up the backdrop's colours), 300px glows
              placed like the prototype, set card / filter / tile spacing and borders from the prototype
            - detail: rarity chip ink with white text (like screens/03)
            - kept on purpose: 16px minimum text (the prototype has 12-15px labels), 44px filter buttons
      - set card chest is now 3D: `components/ui/ChestCanvas.vue` uses the SAME chest as the map's chest pins
        (`buildChest` exported from `lib/mapPins3d.js`, same lights); bobs and peeks its lid open every 4 s, still
        with reduce motion. `assets/spirits-chest.webp` is no longer used (not deleted yet)
      - laptop design from `~/Downloads/MemoryGo-laptop-handoff` (LAPTOP_SPEC.md, screens 06 + 07):
            - Spirits tab, 1200px+: wordmark top-left; left column 380px (title 76px, progress, newest card with a
              120px Spirit, "Area sets" card listing all 6 sets with bars, ink bar when complete); right column
              "All Spirits" + filter, all 24 in a 6-across grid (found = name + rarity chip in rarity colours,
              not yet = "?" + place). Phone / iPad (< 1200px) unchanged. Tiles and newest card lift 4px on hover
            - Spirit page, 1024px+: full-height sticky peach panel on the left (right corners 48px), "< All Spirits"
              back pill, nav top-right, name 104px (72px under 1200), lore 21px, 4 info tiles, "<set> set" row of 4
              mini tiles (this one ink-outlined, found white, missing dashed with its place), Show on map at the bottom
            - Spirit page, iPad (768-1023px): stacked like the phone (720px wide) + the set row, no top nav (it
              covered the rarity chip)
            - AppNav: a page under a tab (/spirits/kopi) keeps that tab highlighted
            - ChestCanvas skips drawing while hidden (the phone set card is hidden on laptop)
            - not built: "Memory match · 9 moves" (scores aren't saved per find), "1 game away" chips
- [x] S7: "You found a Spirit!" reveal
      - the friend's unused `components/SpiritFound.vue` popup, redone in the new design; her logic kept (props
        `spirit`, emit `close`, focus on Close, Esc / click outside closes, Teleport + pop transition)
      - peach top with the live 3D Spirit (`SpiritCanvas`), "You found a Spirit!", rarity · set, name, lore;
        `setDone` adds a butter "Civic District set complete! +50 coins" row with the 3D chest;
        "See my Spirit" (→ /spirits/:id) and "Close"
      - shown from `LevelUpNotice.vue` (already on all 6 game pages), so no game page changed. The Spirit comes
        first; the level-up card waits until it's closed
      - `lib/gamereward.js`: a found Spirit clears `lib/spiritsCache.js` so the Spirit page asks the server again
      - checked: game opened with ?visit=1 + pretend finish answer → popup on phone and laptop, See my Spirit opens
        Kopi as found, Esc closes
- [x] S8: chest pins
      - `views/map.vue` `placeState()`: `spiritHidden` → 'undiscovered' (chest pin, white zone, dark card); after
        the first paid game there the Spirit is found and it's a green "Been here" pin next time the map loads
      - PlaceCard tag "Spirit hiding here" (phone cards; the sidebar card shows it by its dark colour)
      - place preview (RoutePanel): peach "A Spirit is hiding here. Play a game here to find it." with the 3D chest
      - arrived card (JourneyHud, prop `spiritHere`): "A Spirit is hiding here. Your game will find it."
      - checked on the map with pretend places: 1 chest + 2 pins, preview hint, dark card
- [ ] S9: full test (real account, real tap-in at a Spirit place)
- [x] Day / night look + demo walk removed (2026-10-30)
      - `lib/useMood.js`: night = 7 pm to 6 am on the device clock → class="night" on <html>. The clock is checked
        when the app opens and on every page change (`checkMood()` in router/index.js beforeEach): no timer running
        in the background. Tested with a fake clock: 6:59 → 7:01 pm switches on the next page change.
        `?mood=night` / `?mood=day` previews either look (remembered in this browser), `?mood=auto` = clock again.
        Also exports `greeting` (Good morning / afternoon / evening; evening whenever it's night), used by the
        map search bar, the search panel placeholder and the Journey greeting
      - `styles/night.css` (all night rules in one file, every rule starts with html.night): landing / sign in /
        sign up = night sky #232A4E + stars (SkyBackdrop .stars) + pale moon + island dimmed (brightness .76,
        saturate .88), light text on the sky, paper sheet stays dark text; map = deep blue tint
        rgba(22,30,76,.56) multiply right above the map picture (`.night-tint` added in views/map.vue, under the blue
        dot); Journey + Spirits tabs = darker blurred map, indigo #5B4BB5 + blue #2F6FB0 glows, light headings,
        glass cards ~80% solid. Spirit page, Me page and game pages keep the light paper look. Haze still dropped
      - demo walk removed: `useDemoWalk` + `pointAt` (lib/useJourney.js), `demoPos` (stores/journey.js), the
        "Demo: walk the route" button + props (JourneyHud.vue), and demo wiring in views/map.vue (the journey now
        uses the real location only)
- [x] Old pages removed, Me page on the new nav (2026-10-30)
      - `views/profile.vue` is the FRIEND'S page and keeps her design + code (the user asked: nav only).
        Changed 5 lines: `AppMenu` → `AppNav`; margin-left 250px → 0 and top padding 100px (no sidebar now,
        room for the nav pill); Sign out shows on every screen (was phone-only because the old sidebar had it)
      - `styles/legacy.css` (loaded in main.js): the bits her page used from the deleted dashboard, limited to
        `.profile-page`: Fraunces / Nunito Sans fonts, serif h1/h2, the orange `.btn-cta` Sign out button
      - note: her "Stations completed" still reads the old map's browser storage, so it shows 0 / 6
      - deleted: `views/main.vue` (old /menu dashboard), `components/menu.vue` (old sidebar navbar),
        `components/games/games.vue` (unused old games navbar). `/menu` now redirects to `/journey`
      - main.vue also set global fonts/colours (Fraunces h1/h2 etc.): the game pages set their own colours + serif
        headings, the new pages their own font, and the Me page's bits moved to styles/legacy.css. Old
        "views/main.vue sets every h1 to Fraunces" comments updated
- [x] Spirit backgrounds (2026-10-30): the dashed ring + sparkles behind the Spirit looked AI-made, so they're gone.
      Options were mocked on the real page (paper map / real map of the place / plain peach); the user picked the
      paper map. `components/spirits/PaperMap.vue` = the landing page's paper map style (river, roads, blocks,
      parks, dotted route to a pin) recoloured for peach, faded at the edges; colours are CSS variables, so the
      "not found yet" page uses greys. Used on the Spirit page hero and the "You found a Spirit!" popup
- [x] Browser tab icon (2026-10-30): `public/logo.svg` = a round badge made from the head of the app logo's pin
      (orange ring, cream face, the two cards + tick) with a soft 3D look (light from the top-left, shine). It fills
      the whole square so it reads at 16px; the full pin was too thin in a tab. `public/apple-touch-icon.png`
      (180px, on paper colour) keeps the full soft 3D pin for a phone's home screen. Linked in index.html.
      The logo inside the app (`src/assets/app-logo.png`) is unchanged; `public/favicon.ico` is no longer used
- [ ] Journey tab (built, waiting on `docs/journey.sql` + a real test)
      - decisions (2026-10-30): today's challenge = finish paid games at 2 places today → +50 coins once a day;
        Puzzle of the day = one of our 6 games (same for everyone, turns each day) paying the game's coins + 20
        bonus on the first finish that day; "km walked" → "places played this week" (no location saved, PDPA);
        practice ("Play anytime" / old games menu) = 0 coins, 0 XP, doesn't tick "This week"
      - `docs/journey.sql` (TO RUN): `daily_rewards` (user, Singapore date, kind puzzle|challenge; one per day per
        kind) + `claim_daily()` that saves it and adds coins/XP in one step; server-only like the other tables
      - server: `routes/journey.js` GET /api/journey (coins, week, daysThisWeek, placesThisWeek, spiritsFound,
        puzzle { game, bonus, done }, challenge { goal, done, bonus, claimed }) and POST /api/journey/puzzle/finish;
        `visits.js` finish pays the challenge after a paid game (`payChallengeIfDone`, answer has `challenge`);
        `streak.js` /xp = practice: earned 0, no streak tick (same answer shape, + `practice: true`)
      - `lib/gamereward.js`: `?puzzle=1` → /journey/puzzle/finish
      - `views/journey.vue` at /journey (AppNav's Journey now points here; the old /menu dashboard is untouched):
        greeting, "Your journey", 3D island top-right, trip in progress + Resume, challenge (ring, 3D chest,
        hours left, Find spots near me), Puzzle of the day (Play / Done today + Play again), This week dots,
        places this week, Spirits found (→ Spirits tab), Play anytime: our 6 games, tinted tiles
      - layouts: phone 2 columns; iPad 2 columns wider; laptop (1024+) 4-column bento with grid areas
        (trip | puzzle | week / challenge | places | spirits; challenge moves up when there's no trip), games 6 across
      - not built: personal bests on game tiles; the game pages still say "You earned 0 XP and 0 coins" for practice
- [x] Step 7: OneMap account + search with a dropdown + microphone
  - `server/lib/onemap.js`: logs in with ONEMAP_EMAIL / ONEMAP_PASSWORD, keeps the token in memory, renews it
    an hour before it expires (or when OneMap rejects it). `searchOneMap(text)` → { name, address, postal, lat, lng }
  - `server/routes/search.js`: GET /api/search?q= (signed-in, 2-60 characters, max 8, duplicates removed,
    answers cached 10 min)
  - `memorygo/src/components/map/PlaceSearch.vue`: results as you type. MemoryGo places first (instant, in the
    browser), then OneMap places (0.3 s after you stop typing). Each shows distance (only with a real location)
    and "N games nearby" (MemoryGo places within 300 m). Recent (last 5 picks, this browser only). Arrow keys /
    Enter / Escape. variant="dropdown" in the iPad/laptop sidebar; variant="screen" = full-screen search on phones
    with a big "Say where you're going" button
  - `memorygo/src/lib/useSpeech.js`: microphone with the browser's Web Speech API (en-SG). Chrome / Edge / Safari;
    hidden on Firefox. The browser turns speech into text; MemoryGo stores nothing
  - `SearchBar.vue` (phone top bar) is now a button: opens the full-screen search; its mic opens it listening
  - Picking: a MemoryGo place is selected like its card; any other address gets a black pin + label and the map flies there
  - Gotcha: don't name a class `row` (Bootstrap's grid). Results use `.result`
  - Fix: with many results the rows overlapped (the flex column squashed them to fit its max height).
    `.panel > * { flex-shrink: 0 }` keeps every row full height, so the panel scrolls instead
- [x] Step 8: routes ("Take me there"), like Google Maps
  - `server/lib/onemap.js`: `routeOneMap(from, to, 'walk' | 'pt')` ("leaving now", Singapore time; up to 3
    MRT + bus options) and `decodePolyline()` (OneMap packs each line into text like "}c|F{gzxR…")
  - `server/routes/route.js`: GET /api/route?from=lat,lng&to=lat,lng&mode=transit|walk&name=… →
    { options: [{ minutes, walkMeters, transfers, legs, onTheWay }] }. Each leg: walk / train / bus, line
    (DT, 155), from / to (with station codes), stations passed, the line shape. Cached 2 min.
    `planTrip()` is exported so it can be tried without a browser
  - On the way: walking parts → places whose zone the path goes through; MRT parts → the stations you get on,
    change and get off at (matched by code, DT21 = Bencoolen). Stations only ridden through are "passes", not games
  - `memorygo/src/components/map/RoutePanel.vue`: place preview (name, what it is, distance, the data.gov.sg
    description, "Read more on Roots.sg", Take me there) → MRT & bus | Walk, options with line chips in line
    colours, step by step ("Downtown Line · 4 stops to Mattar MRT Station · passes Jalan Besar…"), numbered
    "On your way" list. Start journey = placeholder (next step)
  - `views/map.vue`: cards, pins and search picks open the panel (`openPlace`, `onSearchPick`); `showRoute()`
    draws the legs (white outline; MRT in line colour, bus dark, walking dashed) + numbered stop circles and
    fits the trip on screen; tapping a step or stop centres on it
  - Gotcha: `map.cameraForBounds()` already includes the map's padding (sheet / sidebar). Adding it again made
    it give up on phones, so only small margins are passed
  - Tested with a real OneMap answer, SMU → Joo Seng: 3 options (32 / 32 / 34 min), up to 6 games on the way
- [x] Step 9: live journey (prototype 10-Journey / 11-JourneyArrived), based on `reference-code/useJourney.js`
  - `stores/journey.js` (Pinia): the trip in progress (destination, mode, chosen option, stops, doneIds,
    minimised, demoPos). Survives going into a game and back; a page refresh ends it (memory only)
  - `lib/useJourney.js`: progress along the route, minutes left, next stop + distance, ARRIVED = inside a stop's
    zone for 20 s (a bus passing by doesn't count; any stop on the trip, not only the next one), reached the
    destination (60 m), OFF ROUTE = 40 m from the line for 15 s, heading for the camera, Wake Lock (screen on).
    Our own maths, no Turf. `useDemoWalk()` = demo mode: walks a pretend you along the route (~1 min) and waits at
    each stop (stepping up to 35 m into zones the route only grazes) until Tap in / Not now
  - `components/map/JourneyHud.vue`: stop dots (✓ done), one top card (next stop / dark "You've arrived" with Tap in
    + Not now / off route + Update route / reached destination + Finish trip), bottom bar (To …, minutes left,
    progress, End journey → "End this trip?" Keep going / End trip, minimise), demo button
  - `views/map.vue`: Start journey (RoutePanel) → sheet, nav, search hide; map tilts (pitch 60, zoom 17) and turns
    with the route; Tap in on the card uses POST /api/visits/start for that stop, then opens the game; back on the
    map the trip carries on (route redrawn, demo resumes). Minimise → normal map with a blue "On your way to … ·
    Resume" bar. Update route asks /api/route again from where you are (same mode), keeping done stops
  - Start journey needs a real location, except in `pnpm run dev`. Demo mode is dev-only because tap-in trusts the
    location the page sends
  - `server/routes/route.js`: each stop on the way now includes `radiusM`
  - Tested (phone, demo mode, real SMU → Joo Seng route): start → arrive (Bras Basah: the SMU start is already
    inside its zone) → Tap in opens the game → back to the map continues with ✓ → minimise / Resume → End asks
    first. Fix during testing: Tap in was black on the black card; now white

Pin colours (decided for step 6): green = "you've been here", and it STAYS green (the map fills up with green
as you explore). Whether a place pays today is shown on the card instead: "Up to 15 coins" (never played),
"Replay · up to 15 coins" (played before, not today), "Played today · back tomorrow".

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
│   ├── places-import.sql          adds source / source_id / url for the data.gov.sg import
│   ├── visits.sql                 visits table + finish_visit() payout function, drops reward_coins
│   └── visits-random-game.sql     adds visits.game (the random game picked at tap-in)
└── server/
    ├── server.js                  + app.use('/api/places', placesRoutes)
    ├── routes/places.js           GET /api/places → { places: [...] } (signed-in only)
    ├── routes/visits.js           POST /api/visits/start (tap in), POST /api/visits/:id/finish (pay out)
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
| OneMap login (`ONEMAP_EMAIL`, `ONEMAP_PASSWORD`) | `server/.env` (placeholders in `.env.example`) | Set up and checked: OneMap gives a token (lasts ~3 days). Express will swap the login for a token and renew it itself; the token is never saved or sent to the browser. A password with `#` must be in "quotes" (unquoted `#` starts a comment in .env) |

### Tidy-up files in `memorygo/` (keep them)

- `.editorconfig`: editor settings (spaces, line endings). It says 2-space indent but our code uses 4; can be changed to 4
- `.oxlintrc.json`: settings for `pnpm lint` (catches likely bugs)
- `.prettierrc.json`: settings for `pnpm format` (no semicolons, single quotes, 100-character lines)

None of them change how the app runs. Deleting `.prettierrc.json` would make `pnpm format` add semicolons and double quotes everywhere.

