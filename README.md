# Memory Go 🧠🗺️

**Memory Go** is an interactive exploration and cognitive game designed for older adults. Players explore a map of real Singapore heritage places, travel to them, play a short memory game at each one, and collect the 24 Memory Spirits hiding across the island.

## 🔗 Live App

> | | |
> | ---- | ---- |
> | **Live URL** | `https://is-216-project-ten.vercel.app` |
> | **Demo email** | `demo@memorygo.test` |
> | **Demo password** | `demo123` |
> | **Admin email** | `admin@gmail.com` |
> | **Admin password** | `123456` |


Run it yourself? See [Getting Started](#-getting-started).

## 🎮 How the Game Works

The main gameplay loop is:

**Explore the Map → Travel to a Place → Tap in → Play its Mini-Game → Earn XP and Coins → Find its Memory Spirit → Complete a District Set**

Each place has its own cognitive challenge. There are six:

* 🧠 **Memory Match** – find the pairs
* 🔢 **Sequence Recall** – repeat a growing sequence
* 🧩 **Pattern Recognition** – what comes next
* 👀 **Object Identification** – name the object
* 🔍 **What's Missing?** – spot what was taken away
* 🎯 **Odd One Out** – find the one that doesn't belong

Finishing a game at a place earns **XP and coins**, and finds the **Memory Spirit** hiding there.

## ✨ Features

* 🗺️ **Live map of Singapore heritage places** – real MRT stations and heritage spots on a real map, centred on where you actually are, with walking directions.
* 📍 **Tap in at a place** – stand near somewhere on the map to start its game. The server checks the visit, so the reward has to be earned.
* 🎮 **Six cognitive mini-games** – each one five rounds, scored, and with **Read aloud** on every screen.
* 👻 **24 Memory Spirits** – one hiding at each place, drawn as **3D models** that perform an emote when you tap them. Grouped into six district sets; completing a set pays a bonus chest.
* 🏆 **XP, coins and 10 levels** – from 0 to 2,700 XP, with a level-up celebration.
* 🔥 **Daily habits** – a streak, a weekly tracker, a **Puzzle of the day** (+20 coins) and a **daily challenge** (+50 coins).
* 🏅 **Leaderboard** – see where you stand against other players, as extra motivation to keep playing.
* 🪪 **Player avatar** – pick a Spirit as your player avatar, and it shows up on the map as your location.
* ♿ **Built for older adults** – larger text and reduce-motion settings that follow the account to any device, big tap targets, and read-aloud questions.
* 🔐 **Accounts and an admin page** – sign up, sign in, reset a password; admins can manage users, and the server refuses everyone else.

## 🛠️ Technologies Used

**Front end**

* [Vue 3](https://vuejs.org/) (Composition API) with [Vue Router](https://router.vuejs.org/) and [Pinia](https://pinia.vuejs.org/)
* [Vite](https://vite.dev/) · [Bootstrap](https://getbootstrap.com/) · HTML · CSS · JavaScript
* [Three.js](https://threejs.org/) – the 3D Memory Spirits and their emotes, built in code from each Spirit's 2D drawing
* [MapLibre GL](https://maplibre.org/) – the map
* [axios](https://axios-http.com/) – API calls, with the login token attached automatically

**Back end**

* [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) – our own API, which is where every reward is decided
* [Supabase](https://supabase.com/) – authentication and a Postgres database, with Row Level Security

**External APIs**

* [OneMap](https://www.onemap.gov.sg/) – Singapore search and walking routes
* [data.gov.sg](https://data.gov.sg/) – the heritage and MRT data behind the places
* [OpenFreeMap](https://openfreemap.org/) – the map tiles
* [Supabase](https://supabase.com/) – auth and data, as above

**Testing**

* [Playwright](https://playwright.dev/) – end-to-end tests in a real browser
* [Vitest](https://vitest.dev/) – unit tests

**Tooling**

* pnpm · ESLint · Prettier

## 🚀 Getting Started

### Prerequisites

Before running the project, make sure you have the following installed:

* [Node.js](https://nodejs.org/)
* pnpm
* Google Chrome

### 1. Clone the Repository

Clone this repository to your local machine:

```bash
git clone <repository-url>
```

Navigate into the project folder:

```bash
cd <project-folder>
```

### 2. Install Dependencies

The app and the API server are separate, so each needs its own install:

```bash
pnpm install              # the test tools, at the project root
cd memorygo && pnpm install && cd ..   # the Vue app
cd server  && pnpm install && cd ..    # the Express API
```

### 3. Add the keys

Two files hold secrets, so neither is in the repo. Ask the team for them.

| File | What it holds |
| ---- | ------------- |
| `server/.env` | The API server's Supabase keys. **Without it the app loads but nothing works** — no places, no spirits, no progress. |
| `memorygo/.env` | The app's own Supabase URL and public key. |

`memorygo/.env.example` shows the shape of the second one.

### 4. Start BOTH servers

Two terminals, because the app and the API run separately:

```bash
# terminal 1 — the API
cd server
pnpm dev          # http://127.0.0.1:8000
```

```bash
# terminal 2 — the app
cd memorygo
pnpm dev          # http://localhost:5173
```

> **Starting only `memorygo` is the most common mistake.** The page will load, then sit empty or show "Couldn't load places", because nothing is answering the API calls.

### 5. Open the Website

Open **Google Chrome** and go to:

```text
http://localhost:5173/
```

You will land on the sign-in page — almost every page needs an account. Use the demo login below, or create your own.

## 🧪 Testing

We use two kinds of automated tests:

| Type | Tool | What it checks | Where |
| ---- | ---- | -------------- | ----- |
| **Unit tests** | [Vitest](https://vitest.dev/) | One function on its own, with many exact cases and edge cases (fast, no browser) | `memorygo/src/**/__tests__/*.spec.js` |
| **End-to-end (E2E) tests** | [Playwright](https://playwright.dev/) | A complete user journey in a real browser: the Vue app, our Express API and Supabase together | `e2e/*.spec.js`, at the project root |

The logic is checked in detail by unit tests, and the main user journeys are checked by E2E tests (the testing pyramid). Every test can be re-run after a change as a **regression test**, to make sure existing features still work.

### Setup (once)

```bash
# at the PROJECT ROOT, not inside memorygo
pnpm install
pnpm exec playwright install chromium   # the browser Playwright drives
```

The E2E tests also need two things:

1. **`server/.env`** — the API server's keys (ask the team; it is not in the repo). Playwright starts the server for you.
2. **`.env.e2e` at the project root** — the logins of two **test accounts**, never your own. The tests sign in once with each and reuse the sessions. This file is git-ignored, so no password is ever committed.

   ```text
   E2E_EMAIL=test-account@example.com
   E2E_PASSWORD=its-password

   E2E_ADMIN_EMAIL=admin-test-account@example.com
   E2E_ADMIN_PASSWORD=its-password
   ```

   The ordinary account should have found at least one Spirit, or some Spirits tests are skipped.

### Run the unit tests

```bash
cd memorygo
pnpm test:unit run    # run once
pnpm test:unit        # watch mode: re-runs when a file is saved (press q to quit)
```

### Run the E2E tests

All from the **project root**. They start the app and the API for you.

```bash
pnpm exec playwright test                           # everything
pnpm exec playwright test --headed                  # same, with the browser visible
pnpm exec playwright test --ui                      # the control panel: pick, re-run, step through
pnpm exec playwright test e2e/spirits.spec.js       # one file
pnpm exec playwright test --project=games           # one feature
pnpm exec playwright test -g "Practice mode"        # tests whose name matches
pnpm exec playwright show-report                    # reopen the last report
```

> Use **pnpm**, not npm. The project pins pnpm, so `npx playwright test` stops with an `EBADDEVENGINES` error before it even starts.

Tests are grouped into **projects named after the part of the app they cover**, so a run says what broke rather than which browser it used:

```text
✓ [spirits] › e2e/spirits.spec.js › the Found and Not yet filters change what is listed
✓ [games]   › e2e/games.spec.js   › a game played outside a place pays no coins or XP
```

The groups are `sign-in`, `sign-up`, `forgot-password`, `navigation`, `map`, `spirits`, `games`, `journey`, `leaderboard`, `progression`, `me-page`, `edit-profile`, `admin-refused` and `admin`, plus `player-setup` and `admin-setup`, which sign in once each and save the sessions every other test reuses.

> **Adding a new spec file?** Add it to `PLAYER_SUITES` at the top of `playwright.config.js`, or it is silently never run.

**In VS Code:** install the **Playwright Test for VS Code** extension, open the Testing panel (flask icon), tick the projects you want under *Playwright → Projects* — including **player-setup**, which signs in and must stay ticked — then press ▶ next to a file or test. Tick **Show browser** to watch it, or **Show trace viewer** to step through each action afterwards.

### What is covered

**Unit tests (Vitest): 35 tests**

| File | Covers |
| ---- | ------ |
| `src/config/__tests__/progression.spec.js` | The level table, `levelFromXp` (every level boundary, e.g. 99 vs 100 XP, max level, negative or invalid XP), `progressToNext` (XP into the level, XP needed, percentage, top level), and how a level-up is detected after a game |

**E2E tests (Playwright): 58 tests, plus 2 sign-ins**

| File | User journey | Tests |
| ---- | ------------ | ----- |
| `e2e/auth.setup.js` | Signs in as an ordinary player and saves the session for the other tests | 1 |
| `e2e/admin.setup.js` | The same for the admin account, saved separately | 1 |
| `e2e/auth.spec.js` | A guest is sent to the sign-in page; the wrong password is refused; the right one lands on the map; someone already signed in is not asked again | 5 |
| `e2e/signup.spec.js` | The sign-up page is reachable; an empty form, a malformed email and a password Supabase refuses are all rejected — and none of them lets you into the app | 4 |
| `e2e/forgot-password.spec.js` | *Forgot password?* opens the page; a valid email sends the link; an invalid one, or a failure to send, shows the right message | 4 |
| `e2e/navigation.spec.js` | All four tabs exist, each goes where it says, and the current one is marked — including on a sub-page such as one Spirit | 3 |
| `e2e/map.spec.js` | Places arrive from the server and list as cards; the All / MRT / Spots filters change what is listed; tapping a place opens its panel; the map controls are reachable by name | 4 |
| `e2e/spirits.spec.js` | All 24 Spirits list, with found ones named and the rest hidden; the *Found / Not yet* filters work; a found Spirit shows where and when; an unfound one stays hidden | 4 |
| `e2e/games.spec.js` | All six games open with their title and **Read aloud**; one is played through to a score; answering marks the right option; and a game played outside a place pays **no coins or XP** | 9 |
| `e2e/journey.spec.js` | The day's numbers match the server; *This week* shows seven days; *Puzzle of the day* points at a real game with `?puzzle=1`; *Play anytime* offers all six | 5 |
| `e2e/progression.spec.js` | XP that crosses a level shows the level-up pop-up and *Back to map* works; XP that does not stays quiet; the Me page shows the right level and a full bar at the top level | 4 |
| `e2e/leaderboard.spec.js` | The leaderboard loads player rankings from the server, verifies XP is sorted in descending order, displays the top three players on the podium, and highlights the signed-in player's rank and XP | 4 |
| `e2e/profile.spec.js` | The Me page shows the account's details from the server, and changing the text size takes effect straight away | 2 |
| `e2e/edit-profile.spec.js` | A new name saves and shows on the Me page; an empty name is refused; saving with no changes says so | 3 |
| `e2e/notadmin.spec.js` | An ordinary player sees no *Manage users* row, no user data on `/admin`, and gets **403** from the admin endpoints | 3 |
| `e2e/admin-access.spec.js` | The same feature from the other side: an admin sees the row, sees the user list, and is accepted by the endpoints | 4 |

> The last two are a pair on purpose. One account must be let in and the other kept out — a permission tested only by the person who has it is not really tested.

### How we keep the tests reliable

* **Repeatable:** where a real request would change data or hit a limit, the test fakes the server's reply with Playwright's `page.route`. Examples: the XP reward (the Puzzle of the day only pays once a day), saving a name, and sending a reset email. Every run gets the same result, and the test account's data is never changed. Each test also starts in a fresh browser, so tests don't depend on each other.
* **Signed in once, not fifty-six times:** `auth.setup.js` logs in through the real form and saves the session to a file; every test starts from that saved session. Two real logins per run instead of one per test, which is faster and avoids Supabase's rate limit.
* **Stable selectors:** tests find elements the way a user does — by role and accessible name (`getByRole('button', { name: 'Sign in' })`), by label, or by visible text. A restyle does not break them, and a test that cannot find an element by its accessible name has usually found a real accessibility problem.
* **No fixed waits:** tests wait for something real — a server reply, or *"Question 2 of 5"* appearing — never for a set number of milliseconds. They also wait for what should **appear**, not for a loading message to disappear, because a message that has not rendered yet looks exactly like one that has finished.
* **Left as found:** a test that changes a setting changes it back, so the next test starts from a known state.
* **Clear structure:** every file opens with a comment listing what it covers and why. Tests are grouped with `test.describe`, and each one follows *arrange → act → assert*.

### Not covered by E2E (on purpose)

Each of these has a comment in the relevant file explaining the reason.

* **Signing out:** `stores/auth.js` calls `signOut()` with no scope, which defaults to `global` and ends *every* session for that account — including the saved one the rest of the suite depends on. One such test would break the whole suite.
* **Delete account:** it would permanently delete the shared test account.
* **A successful sign-up:** it would create a real Supabase user on every run. The refusals are tested instead.
* **Search and directions:** they call OneMap, and the test environment has no credentials for it, so a test would fail for a reason that is not a bug.
* **Earning coins at a real place:** it needs a visit row, which needs GPS at an actual location. The rule that protects it — that playing anywhere else pays nothing — *is* tested, in `games.spec.js`.
* **Reduce motion / Solid backgrounds:** these failed about one run in three, and chasing it found a real race in the app rather than a test bug: the profile loads twice and each load re-applies the account's settings, so a change can be overwritten. Worth fixing in `lib/useSettings.js` before testing.


## 📁 Project Structure

The repository holds three things side by side: the Vue app, the Express API, and the end-to-end tests.

```text
IS216-Project/
├── memorygo/                 # the Vue app
│   └── src/
│       ├── assets/spirits/   # the 24 Spirit drawings (SVG), read by the 3D builder
│       ├── components/       # reusable pieces: games, map, ui, spirits, profile
│       ├── views/            # one file per page: map, spirits, journey, me, leaderboard, admin, games/
│       ├── three/            # spiritModel.js builds a Spirit, spiritEmotes.js animates it
│       ├── lib/              # api.js, useSettings.js, gamereward.js, geo.js …
│       ├── stores/           # Pinia: auth, journey, profile
│       ├── config/           # progression.js (the level table) + its unit tests
│       └── router/           # the routes, and the guard that protects 13 of them
├── server/                   # the Express API
│   ├── routes/               # spirits, visits, journey, places, me, admin, leaderboard, search …
│   ├── middleware/auth.js    # requireAuth: checks the token on every protected route
│   └── supabase.js           # the server's Supabase client
├── e2e/                      # the Playwright tests
├── docs/                     # guides: how the server, database, spirits and tests work
├── playwright.config.js      # test settings and the per-feature projects
└── README.md
```

## 👥 Project Team

| Member   | Main Feature                              |
| -------- | ----------------------------------------- |
| Yule | 🗺️ Map API integration            |
| Victoria | 🎮 The six cognitive mini-games, admin          |
| Jessica | 👤 Profile page, leaderboard    |
| Janice Cheng Chieh | 👻 Memory Spirits and the 3D emotes       |
| Nelissa | ⭐ levelling, edit profile, forget password    |
| Ariq | 📍 station, user authentication, 3D spirits|

## 📌 Development Notes

The project runs locally on the Vite development server, with the Express API beside it. **Both are needed** — see [Getting Started](#-getting-started) for the full steps.

```bash
cd server   && pnpm dev    # the API,  http://127.0.0.1:8000
cd memorygo && pnpm dev    # the app,  http://localhost:5173
```

## 🤖 Use of AI / LLM Tools

We used AI tools (ChatGPT and Claude) throughout this project. These are the parts where the **first version was generated by AI**, and what we changed afterwards:

* **The initial file structure** — the folder and file layout of the Vue app and the Express server.
* **Debugging** — tracking down errors during development, such as broken imports, database permission problems and test setup issues.
* **The 3D Spirit system** — `src/three/spiritModel.js` and `src/three/spiritEmotes.js`: building each Spirit's 3D model from its 2D drawing, and the gestures they perform. We wrote the design spec, chose which Spirit does which emote, and rejected and redid several versions before we were happy with how they looked.
* **The end-to-end test suite** — the Playwright tests in `e2e/` and their configuration. We decided what was worth testing, named the test groups after our own features, and dropped tests that turned out to be unreliable.
* **This README** — AI helped organise and word the sections. We checked every claim against our own code and corrected the ones that were out of date or wrong.

Nothing here went in untouched. Everything was reviewed, run and adjusted by the team, and some AI suggestions were rejected outright — the Spirit emotes were first written as CSS animations, which can never work, because CSS cannot reach inside a WebGL canvas. We also found and fixed real bugs the AI introduced, such as a test that passed while the page was still empty.

## 🎯 Project Goal

Memory Go aims to combine **exploration, physical activity, cognitive challenges, and gamification** into an engaging experience for older adults. By providing different stations and rewarding users for completing challenges, the application encourages users to explore and stay mentally active.
