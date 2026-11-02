# Memory Go 🧠🗺️

**Memory Go** is an interactive exploration and cognitive game designed for older adults. Users can explore a map, travel to different stations, complete cognitive mini-games, collect characters and items, and progress through different areas.

## 🎮 How the Game Works

The main gameplay loop is:

**Explore the Map → Reach a Station → Complete a Mini-Game → Earn Rewards → Collect Items → Unlock New Areas**

Each station contains a different cognitive challenge, such as:

* 🧠 Memory matching
* 🔢 Sequence recall
* 🧩 Pattern recognition
* 👀 Object identification

Successfully completing a challenge allows users to earn **XP, coins, and collectible items**.

## ✨ Features

* 🗺️ **Interactive Map** – Explore different areas and move your character around the map.
* 📍 **Station System** – Visit different stations to access unique challenges.
* 🎮 **Cognitive Mini-Games** – Complete memory and puzzle-based challenges.
* 👤 **User Profile** – View your level, XP, coins, and overall progress.
* 👻 **Character Collection** – Collect Memory Spirits, animals, flowers, landmarks, and other items.
* 🏆 **Rewards System** – Earn XP, coins, and collectibles by completing challenges.
* 🔓 **Progression System** – Level up and unlock new stations and areas.

## 🛠️ Technologies Used

* Vue.js
* JavaScript
* HTML
* CSS
* Bootstrap
* Vite
* pnpm

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

Install the required dependencies using pnpm:

```bash
pnpm install
```

### 3. Start the Development Server

Run the following command:

```bash
pnpm dev
```

The development server should start and display a local URL similar to:

```text
http://localhost:5173/
```

### 4. Open the Website

Open **Google Chrome** and go to:

```text
http://localhost:5173/
```

The Memory Go website should now be running locally.

## 🧪 Testing

We use two kinds of automated tests:

| Type | Tool | What it checks | Where |
| ---- | ---- | -------------- | ----- |
| **Unit tests** | [Vitest](https://vitest.dev/) | One function on its own, with many exact cases and edge cases (fast, no browser) | `memorygo/src/**/__tests__/*.spec.js` |
| **End-to-end (E2E) tests** | [Playwright](https://playwright.dev/) | A complete user journey in a real browser: the Vue app, our Express API and Supabase together | `memorygo/e2e/*.spec.js` |

The logic is checked in detail by unit tests, and the main user journeys are checked by a smaller number of E2E tests (the testing pyramid). Every test can be re-run after a change as a **regression test**, to make sure existing features still work.

### Setup (once)

All commands are run inside the `memorygo` folder.

```bash
cd memorygo
pnpm install
npx playwright install chromium   # the browser Playwright drives
```

The E2E tests also need:

1. **`server/.env`**: the API server's keys (ask the team; it is not in the repo). Playwright starts the server for you.
2. **`memorygo/.env.e2e`**: the login of a **test account** (not your own account). The tests sign in with it once and reuse the session. This file is git-ignored, so the password is never committed.

   ```text
   E2E_EMAIL=test-account@example.com
   E2E_PASSWORD=its-password
   ```

   The account should have found at least one Spirit, or some Spirits tests are skipped.

### Run the unit tests

```bash
pnpm test:unit run    # run once
pnpm test:unit        # watch mode: re-runs when a file is saved (press q to quit)
```

### Run the E2E tests

```bash
pnpm test:e2e                                  # all E2E tests (starts the app and API automatically)
pnpm test:e2e e2e/progression.spec.js          # one file
pnpm test:e2e -g "level-up"                    # only tests whose name matches
pnpm exec playwright show-report               # open the HTML report of the last run
```

**In VS Code:** install the **Playwright Test for VS Code** extension, open the Testing panel (flask icon), tick the **chromium** project under *Playwright → Projects*, then press ▶ next to a file or test. Tick **Show browser** to watch it, or **Show trace viewer** to step through each action afterwards.

### What is covered

**Unit tests (Vitest): 35 tests**

| File | Covers |
| ---- | ------ |
| `src/config/__tests__/progression.spec.js` | The level table, `levelFromXp` (every level boundary, e.g. 99 vs 100 XP, max level, negative or invalid XP), `progressToNext` (XP into the level, XP needed, percentage, top level), and how a level-up is detected after a game |

**E2E tests (Playwright): 18 tests**

| File | User journey | Tests |
| ---- | ------------ | ----- |
| `e2e/auth.setup.js` | Signs in through the real login form and saves the session for the other tests | 1 |
| `e2e/progression.spec.js` | Finishing a game that crosses a level shows the **level-up pop-up** with the right level, and *Back to map* goes to the map. No pop-up without a level-up. The Me page shows the right level, "XP to next level" text and XP bar, including the top level | 4 |
| `e2e/edit-profile.spec.js` | Changing your name shows **"Updated!"** and the new name on the Me page. An empty name, or saving with no changes, shows a message and saves nothing | 3 |
| `e2e/forgot-password.spec.js` | *Forgot password?* opens the page. A valid email shows the "we've sent it a link" message. An invalid email, or Supabase failing to send, shows the right error | 4 |
| `e2e/spirits.spec.js` | The Spirits collection lists found and hidden Spirits, the *Found / Not yet* filters work, a found Spirit shows where and when it was found, and an unfound one stays hidden | 4 |
| `e2e/profile.spec.js` | The Me page shows the account's details from the server, and changing the text size takes effect straight away | 2 |

### How we keep the tests reliable

* **Repeatable:** where a real request would change data or hit a limit, the test fakes the server's reply with Playwright's `page.route`. Examples: the XP reward (the Puzzle of the day only pays once a day), saving a name, and sending a reset email. Every run gets the same result, and the test account's data is never changed. Each test also starts in a fresh browser, so tests don't depend on each other.
* **Stable selectors:** tests find elements the way a user does: by role and accessible name (`getByRole('button', { name: 'Back to map' })`), by label (`getByLabel('Your name')`) or by visible text. They don't use CSS layout or the HTML structure, so a restyle doesn't break them.
* **No fixed waits:** tests wait for something the user can see, such as *"Question 2 of 5"* or the server's reply, instead of sleeping for a set time. Playwright's automatic waiting handles the rest.
* **Clear structure:** each file starts with a comment listing what it covers. Tests are grouped with `test.describe`, and each test follows *setup → actions → assertions*.

### Not covered by E2E (on purpose)

* **Delete account:** it would permanently delete the shared test account.
* **Admin page:** it needs an admin account.

## 📁 Project Structure

```text
Memory-Go/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── views/
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── README.md
```

> The exact project structure may vary depending on the components and features implemented by the team.

## 👥 Project Team

| Member   | Main Feature                     |
| -------- | -------------------------------- |
| Member 1 | 🗺️ Interactive Map              |
| Member 2 | 🎮 Cognitive Mini-Games          |
| Member 3 | 👤 User Profile & Progress       |
| Member 4 | 👻 Character & Collection System |
| Member 5 | 📍 Stations & Rewards            |
| Member 6 | 🔓 Level & Area Unlocking        |

## 📌 Development Notes

This project is currently intended to be run locally using the Vite development server.

To start the project:

```bash
pnpm dev
```

Then access the application through:

```text
http://localhost:5173/
```

## 🤖 Use of AI / LLM Tools

We used AI tools (such as ChatGPT and Claude) to help with parts of this project. The parts where we relied solely on AI are:

* **Setting up the file structure:** the initial folder and file layout of the Vue app and Express server.
* **Fixing code bugs:** finding and fixing errors we ran into during development (e.g. broken imports, database errors, and test setup issues).

All AI-generated code was reviewed, tested and adjusted by the team before it was added to the project.

## 🎯 Project Goal

Memory Go aims to combine **exploration, physical activity, cognitive challenges, and gamification** into an engaging experience for older adults. By providing different stations and rewarding users for completing challenges, the application encourages users to explore and stay mentally active.
