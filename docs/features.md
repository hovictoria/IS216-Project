# MemoryGo: features and how they work

A walk-through of what the app does after the redesign, for the team. It covers what players see, the rules behind
coins / XP / Spirits, and which files do what.

**In one line:** search where you're going, MemoryGo shows the heritage spots and MRT stations on the way, you play a
short brain game when you arrive at one, and you collect coins, XP and Spirits.

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

## 10. Still to do
- Full test at real places (chest → tap in → "You found a Spirit!" → green pin) and of the daily bonuses.
- Game pages still say "You earned 0 XP and 0 coins" for practice; could say "Practice · no coins".
- Personal bests on the Play anytime tiles.
- The Me page's "Stations completed" still reads the old map's saved data (always 0 / 6).
- Clean up unused files: `composables/useProgression.js`, `lib/spiritreward.js`, old images, `docs/collectibles.sql`.
