# MemoryGo: features and how they work

A walk-through of what the app does after the redesign, for the team. It covers what players see, the rules behind
coins / XP / Spirits, and which files do what.

**In one line:** search where you're going, MemoryGo shows the heritage spots and MRT stations on the way, you play a
short brain game when you arrive at one, and you collect coins, XP and Spirits.

---

## At a glance: each feature and how it's done

| Feature | How it's done (big picture) |
|---|---|
| **Places (MRT stations + heritage spots)** | **Seeded once from data.gov.sg** with our own script (`server/scripts/import-places.js`), using 3 government datasets: Monuments and Historic Sites (National Heritage Board) and MRT Station Exits (LTA, the exits grouped into one point per station). Saved in our `places` table in Supabase. The app reads from our table, never from data.gov.sg. The script can be re-run safely if the data changes |
| **MRT line codes** (EW13, NS25 …) | Looked up from **OneMap search** during the same one-time import |
| **Spirit places** | Most Spirits use places that already came from data.gov.sg. The few that weren't there (e.g. Toa Payoh Dragon Playground) were **added by hand with SQL** in Supabase |
| **The 24 Spirits** | Designed as 2D drawings (SVG). Their names, rarity, set, place and story were **added by hand with SQL** (`spirit_catalog` table). The **3D versions are built in code with three.js** from those drawings |
| **Sign up / sign in** | **Supabase Auth** (Supabase's ready-made login system: email + password) |
| **The map** | **MapLibre** (free open-source map library) with free map tiles from **OpenFreeMap**, recoloured by us to the warm paper look |
| **3D pins, chests, island** | Built in code with **three.js**, drawn inside the map |
| **Your location (blue dot)** | The **browser's location service** (GPS / Wi-Fi on the phone or laptop). Not saved anywhere |
| **Search for a place** | **OneMap search API** (Singapore government map service), called through our server |
| **Voice search (microphone)** | The **browser's built-in speech recognition** (Singapore English). No outside service |
| **Directions** | **OneMap routing API** (walking, or MRT + bus), called through our server |
| **"Games on the way"** | **Our own server** compares the OneMap route with our `places` table: stations where you get on / off, and play zones your walk passes |
| **Journey (arrived, off route)** | **Worked out in the browser** from your live location and the route: 20 s inside a zone = arrived, 40 m off the route for 15 s = off route. The screen is kept on with the browser's **Wake Lock** |
| **Tap in + which game** | **Our Express server** checks you're inside the zone, picks a random game, and saves the visit in Supabase |
| **Coins and XP** | **Our server** scores the game result with our formulas, and a **database function in Supabase** pays it in one step (so it can't pay twice) |
| **Finding a Spirit + set bonus** | The **same database function**: your first paid game at the Spirit's place finds it; finishing a set of 4 pays +50 |
| **Puzzle of the day / today's challenge** | **Our server** picks the day's game from the date, and a small `daily_rewards` table makes sure each bonus is paid once a day |
| **6 brain games** | Built in Vue by the team, inside the app (no outside service) |
| **Day / night look** | The **device clock** (7 pm – 6 am = night) and our own styles. No outside service |
| **Fonts** | **Google Fonts** |

The browser never talks to the database or to OneMap directly. It always goes through **our Express server**, which
holds the secret keys (Supabase service key, OneMap login) in `server/.env`.

---

## 1. Pages

| Page | Address | What's on it |
|---|---|---|
| Landing | `/` | 3D island, "Start exploring", "I already have an account" |
| Sign up / Sign in | `/signup`, `/login` | Name, email, password (no "confirm password") |
| Map (home) | `/map` | Live map, places near you, search, directions, journeys, tap in |
| Spirits | `/spirits` | Your collection of 24 Spirits, area sets, filter All / Found / Not yet |
| One Spirit | `/spirits/:id` | The Spirit in 3D, its story, where / when / which game you found it, its set |
| Journey | `/journey` | Trip in progress, today's challenge, Puzzle of the day, this week, Play anytime |
| Me | `/me` | Profile, level, XP, coins (teammate's page, on the new nav) |
| Games | `/games/memory`, `/object`, `/sequence`, `/pattern`, `/missing`, `/oddoneout` | The 6 brain games |

Navigation: a bottom bar on phones, a pill at the top-right on iPad / laptop (Map · Spirits · Journey · Me, plus
coins and your initial). The old sidebar and the old `/menu` dashboard were removed; `/menu` now goes to Journey.

---

## 2. The map

- **Places:** 345 places in Singapore (MRT stations, heritage sites and the Spirit places), imported once from
  data.gov.sg into our `places` table. Each place has a **play zone**: a circle you must be inside to play.
- **What shows:** "Near you" cards for places within 2 km (up to 20). Pins for places within 3 km of the middle of
  the map. Zoomed far out there are no pins; MRT stations appear first, heritage spots when you zoom in.
- **Pins (3D):** red = heritage spot, blue = MRT station, green = you've played there, **chest = a Spirit you haven't
  found is hiding there**.
- **Cards:** MRT cards take their line's colour (blended for interchanges), green-ish for places you've played,
  dark for Spirit places. The chip says what you can earn ("Up to 15 coins", "Played today · back tomorrow", …).
- **Map limits:** you can't scroll out of Singapore.
- **Your location:** the blue dot. If location is off or slow, a note says so ("Location is off · showing SMU area")
  instead of pretending you're somewhere.

### Search and directions
- **Search bar:** type a place (dropdown as you type) or press the **microphone** and say it. Uses OneMap (Singapore's
  government map service) through our server. The last 5 searches are remembered on the device.
- **Place preview:** name, a short fact, "Read more", and **Take me there**. Spirit places also say "A Spirit is
  hiding here".
- **Directions:** walking or public transport routes from OneMap, drawn on the map. Each route lists the
  **MemoryGo places on the way**: stations where you get on / off and spots your walk passes.

### Journey (live trip)
- **Start journey:** the map tilts and follows you; the top card shows the next stop and minutes left.
- **Arriving:** stay inside a stop's play zone for **20 seconds** → "You've arrived" → **Tap in** or **Not now**.
  (The 20 s stops a passing bus or train from counting.)
- **Off route:** more than 40 m from the route for 15 s → "Update route".
- The screen stays awake during a trip. Minimise to see the normal map with a **Resume** bar; the trip carries on
  after a game.

---

## 3. Playing at a place (tap in)

1. **Tap in** at a place. The server checks you're inside its play zone, and that it's the **nearest** place whose
   zone you're in (so you can't play several places from one spot).
2. A **game is picked at random** from our 6, never the same one you played last time at that place.
3. Play it. The game sends its result (moves / score / level) to the server, which scores it and pays out.

### Rules (all checked on the server, the browser never sends an amount)
| Rule | Detail |
|---|---|
| Coins | 5 to 15 per game, depending on how well you played |
| XP | 10 to 30 per game, the same way |
| Paid once per place per day | Play the same place again today = for fun, 0 coins ("Played today · back tomorrow") |
| 5-minute gap | Paid games need 5 minutes between them (stops hopping between places next to each other) |
| Finish within 30 minutes | A paid game left unfinished for 30 minutes is released |
| Crash / refresh | Tapping in again within 30 minutes carries on with the same game |
| Paying out | Done in one database step, so a double tap can't pay twice |
| Privacy | Your coordinates are only used for the distance check; only the distance is saved, never where you are |

### The 6 games
Memory match · Object hunt · Sequence · Pattern · What's missing · Odd one out.

---

## 4. Spirits

- **24 Spirits**, each a Singapore food character (Kopi, Kaya, Durian, Chilli Crab, …), drawn in 2D and built in 3D.
- **Each Spirit hides at one place.** Your **first paid game at that place finds it**, always (no luck involved).
- **6 area sets of 4:** Civic District, Kampong Glam & Bugis, Marina Bay, Chinatown, Little India, Heartlands.
  Finishing a set pays a **bonus chest: +50 coins**, once.
- **Rarity:** 12 Common, 8 Rare, 3 Epic, 1 Legendary (Durian).
- **"You found a Spirit!"** pops up after the game with the Spirit in 3D (and "Set complete! +50 coins" when it
  finishes a set). Then the chest on the map turns into a normal pin.
- **Spirits tab:** progress "N of 24 found", your newest Spirit, the set you're closest to finishing, and all 24
  (found ones show the Spirit; the rest show "?" and **where they hide**, so you know where to go).
- **Spirit page:** the Spirit in 3D on a paper map, its story, Found at / On / Game / Set, the other 3 in its set,
  and **Show on map**.

---

## 5. Journey tab (daily home)

| Box | How it works |
|---|---|
| Trip in progress | Shown while a journey is running, with Resume |
| **Today's challenge** | Finish paid games at **2 places today** → **+50 coins**, paid automatically once a day |
| **Puzzle of the day** | One of the 6 games, the same for everyone, a different one each day. The **first finish today** pays the game's coins + **20 bonus coins**. After that it's "Done today ✓" and Play again is practice |
| This week | Dots for the days you played (Mon–Sun) |
| Places this week | Different places you played a paid game at since Monday |
| Spirits found | Opens the Spirits tab |
| **Play anytime** | All 6 games as **practice: no coins, no XP**, and it doesn't count for "This week" |

**Where coins come from:** playing at places, the Puzzle of the day, today's challenge, and finishing a Spirit set.
Practice never pays.

---

## 6. Levels and XP
XP comes from games at places and the Puzzle of the day. Levels (`config/progression.js`): Level 1 at 0 XP, 2 at 100,
3 at 250, 4 at 450, 5 at 700. A "Level up!" card shows after a game that takes you to a new level. The Me page shows
your level and the bar to the next one.

---

## 7. Day and night
- **Night = 7 pm to 6 am** on the device clock. Dark night sky with stars and a moon on the landing / sign-in pages,
  a deep blue tint on the map, darker backgrounds on Journey and Spirits. Cards and forms stay light so they're easy
  to read. Greetings follow it: Good morning / afternoon / evening.
- The time is checked when the app opens and on every page change.
- **Preview either look any time:** add `?mood=night` or `?mood=day` to the address; `?mood=auto` goes back to the
  clock.

---

## 8. Made for older users
- Text is at least 16px; buttons are at least 44px tall.
- Buttons and links have labels for screen readers, and a clear focus ring for keyboard users.
- "Reduce motion" on the device turns off the bobbing, wiggling and animations.
- Voice search with the microphone.

---

## 9. How it's built (who talks to what)

```
Browser (Vue app)  ──►  Our Express server  ──►  Supabase (database + logins)
                                      └────►  OneMap (search + routes)
```

- The browser **never** reads or writes the database directly. Every table has Row Level Security on, and only the
  server (with its secret key, kept in `server/.env`) can use them.
- OneMap's login also stays on the server; the browser only asks our server.

### Database tables
| Table | Holds |
|---|---|
| `places` | The 345 places, their zones, MRT line codes, facts |
| `visits` | Each tap in: place, date, game, paid or not, score, coins / XP earned, distance (no coordinates) |
| `progress` | Each player's XP, coins, streak, this week's days |
| `spirit_catalog` | The 24 Spirits, their place, set, rarity, colour, story |
| `spirit_finds` | Which Spirits each player found, when, with which game |
| `spirit_sets_done` | Which area sets each player finished (bonus paid once) |
| `daily_rewards` | Puzzle / challenge bonuses already paid today (once a day each) |

The old `spirits` / `user_spirits` tables are still in Supabase but no longer used.

### Server routes (`server/routes/`)
| Route | Does |
|---|---|
| `GET /api/places` | All places + your flags (played, played today, Spirit hiding / found) |
| `POST /api/visits/start` | Tap in (zone checks, picks the game, paid or replay) |
| `POST /api/visits/:id/finish` | Score the game, pay out, find the Spirit, set bonus, challenge bonus |
| `GET /api/search?q=` | OneMap search |
| `GET /api/route` | OneMap directions + the MemoryGo places on the way |
| `GET /api/spirits` | All 24 Spirits + the ones you found + sets done |
| `GET /api/journey` | Everything on the Journey tab |
| `POST /api/journey/puzzle/finish` | Score and pay the Puzzle of the day |
| `GET /api/progress` | Your XP and coins |
| `POST /api/progress/xp` | Practice games (pays nothing now) |

### Main frontend files (`memorygo/src/`)
| File | Does |
|---|---|
| `views/map.vue` | The map page: places, pins, search, directions, journey, tap in |
| `views/journey.vue` | Journey tab |
| `components/charactercollection.vue` | Spirits tab (teammate's file, new design, her logic kept) |
| `views/spirit.vue` | One Spirit's page |
| `views/profile.vue` | Me page (teammate's page, on the new nav) |
| `lib/gamereward.js` | Every game calls `claim()` when it ends: sends the result to the right place (tap in, puzzle or practice) |
| `components/SpiritFound.vue` | "You found a Spirit!" popup (teammate's popup, new design) |
| `components/LevelUpNotice.vue` | Shown on every game page: Spirit popup first, then "Level up!" |
| `three/spiritModel.js` | Builds the 3D Spirits |
| `lib/mapPins3d.js` | 3D pins and chests on the map |
| `lib/useJourney.js`, `stores/journey.js` | The live journey (arrived, off route, progress) |
| `lib/useMood.js`, `styles/night.css` | Day / night look |
| `docs/design-refresh.md` | The full step-by-step log of the redesign |

---

## 10. How it's done: outside services and step-by-step flows

### Outside services we connect to
| Service | What we use it for | How we connect |
|---|---|---|
| **Supabase** | Logins (accounts, passwords) and the database | **Logins:** the browser uses Supabase's sign-up / sign-in with the public key (`memorygo/.env.local`). **Data:** only our server reads and writes tables, with the secret service key in `server/.env`. Row Level Security blocks the browser from every table |
| **OneMap** (Singapore Land Authority) | Place search and directions (walk / MRT + bus) | Our server logs in to OneMap with the team's OneMap account (`server/.env`), gets a token (lasts ~3 days), keeps it in memory only and renews it an hour before it runs out. The browser never sees the login or the token: it only calls our `/api/search` and `/api/route` (`server/lib/onemap.js`) |
| **data.gov.sg** | The list of MRT stations and historic sites | Used **once** by `server/scripts/import-places.js` to fill the `places` table. The app doesn't call it while running |
| **OpenFreeMap** | The map pictures (streets, buildings) | MapLibre loads the free "liberty" map style and tiles straight from OpenFreeMap; we recolour it to our warm paper look (`lib/paperMapStyle.js`). No key needed |
| **Google Fonts** | The fonts (Inter Tight; Fraunces / Nunito Sans on the Me and game pages) | Loaded by the browser |

### Tools inside the app (no outside service)
| Tool | Used for |
|---|---|
| **MapLibre GL** | Draws the map, play zones, route lines; follows you during a journey |
| **three.js** (+ TresJS on the landing page) | 3D island, 3D pins and chests on the map, 3D Spirits, 3D chest on cards |
| **Browser location** (Geolocation API) | Your blue dot, "Near you", tap-in distance, journeys |
| **Browser speech** (Web Speech API, `en-SG`) | The microphone in search: turns what you say into text, in the browser |
| **Screen Wake Lock** | Keeps the phone screen on during a journey |
| **Pinia / Vue Router** | Remembers the logged-in user and the trip in progress; moves between pages |

### How a request travels
Every call from the browser to our server goes through `memorygo/src/lib/api.js`, which adds the player's login
token (`Authorization: Bearer …`). On the server, `middleware/auth.js` asks Supabase "who is this token?" (`requireAuth`)
before any route runs, so each route knows the player and only touches **their** rows.

### Flow: searching for a place
1. You type "National Library" (or say it into the microphone; the browser turns speech into text).
2. Browser → `GET /api/search?q=national library` on our server.
3. Server → OneMap search (with its token), tidies the names ("NATIONAL LIBRARY" → "National Library"), removes
   duplicates, keeps 8. Answers are remembered for 10 minutes so the same search doesn't ask OneMap again.
4. The dropdown shows the results; picking one moves the map there and opens the place preview.

### Flow: directions and "places on the way"
1. **Take me there** → browser sends `GET /api/route?from=<you>&to=<place>&mode=transit` (or `walk`).
2. Server → OneMap routing ("leaving now", Singapore time). OneMap sends each route as legs (walk / train / bus)
   with the line drawn as a compressed "polyline", which the server decodes into map points.
3. Server works out the **MemoryGo places on the way** from our `places` table:
   - **walking parts:** places whose play zone the walking line passes through ("walk past");
   - **train parts:** the stations where you **get on** and **get off** (matched by station code, e.g. NS25).
4. Browser draws the route (train lines in their MRT colour, walking dashed) with numbered stops, and lists the
   options with their minutes and "N games on the way". Answers are remembered for 2 minutes.

### Flow: a journey
1. **Start journey** saves the trip in the browser (`stores/journey.js`) and the map starts following you.
2. Every time the browser reports a new location, `lib/useJourney.js` works out (in the browser, no server):
   how far along you are, minutes left, which stop is next, whether you've been **inside a stop's zone for 20 s**
   (→ "You've arrived"), and whether you've been **40 m off the route for 15 s** (→ "Update route" asks the server
   for a new route from where you are).

### Flow: tap in → game → coins + Spirit
1. **Tap in** → `POST /api/visits/start` with the place and your location.
2. Server checks: inside the zone? the nearest zone you're in? paid already today here? 5 minutes since your last
   paid game? It picks a random game (not the last one you played here) and saves the visit (distance only).
3. Browser opens that game, e.g. `/games/pattern?visit=123`.
4. When the game ends it calls `claim()` (`lib/gamereward.js`) → `POST /api/visits/123/finish` with the result.
5. Server scores it (`streak.js` formulas), then one database function (`finish_visit`) does everything at once:
   pays coins + XP (only if the visit is paid), marks the visit finished, finds this place's Spirit if you haven't got
   it, and pays the +50 set bonus if that completes a set. Then it ticks "This week" and checks today's challenge
   (2 places → +50, `daily_rewards`).
6. Browser shows "You earned …", then "You found a Spirit!" if there is one, then "Level up!" if you went up a level.

### Flow: Puzzle of the day
1. The server picks today's game from the date (the 6 games take turns), so everyone gets the same one.
2. The Journey tab opens it as `/games/<game>?puzzle=1`. When it ends, `claim()` sends the result to
   `POST /api/journey/puzzle/finish`.
3. Server checks it's today's game, scores it, and `claim_daily` pays (game coins + 20) **only if** there's no puzzle
   payment for you today yet. That check and the payment happen in one database step.

### Flow: the Spirits pages
`GET /api/spirits` returns all 24 Spirits (with their place), the ones you found and the sets you finished; the
server runs those 3 database queries at the same time. The Spirits tab keeps that answer in memory
(`lib/spiritsCache.js`) so tapping a Spirit opens its page instantly. Pictures in the grid are the 2D drawings
(`assets/spirits/*.svg`); the Spirit page and the popup build the 3D model in the browser (`three/spiritModel.js`).

### Flow: day / night
No outside service: `lib/useMood.js` reads the device clock (night 7 pm – 6 am) when the app opens and on every page
change, and adds `class="night"` to the page; `styles/night.css` holds all the night styles.

---

## 11. Still to do
- Full test at real places (chest → tap in → "You found a Spirit!" → green pin) and of the daily bonuses.
- Game pages still say "You earned 0 XP and 0 coins" for practice; could say "Practice · no coins".
- Personal bests on the Play anytime tiles.
- The Me page's "Stations completed" still reads the old map's saved data (always 0 / 6).
- Clean up unused files: `composables/useProgression.js`, `lib/spiritreward.js`, old images, `docs/collectibles.sql`.
