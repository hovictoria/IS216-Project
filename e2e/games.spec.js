// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/games.spec.js
// purpose:    - end-to-end tests for the 6 cognitive games, which are the core loop of the app
// covers:     1. all 6 games open, each with its own title, progress and Read aloud button
//             2. a whole game can be played start to finish, and ends with a score
//             3. answering shows which option was right
//             4. a game played outside a place pays nothing ("Practice round"), which is the rule
//                that stops a player farming coins by replaying
// signed in:  via e2e/auth.setup.js
// note:       these open the games directly at /games/<name>, with no ?visit= and no ?puzzle=, which is
//             the app's "Play anytime" practice mode. That needs no GPS and no tap-in at a real place,
//             so the tests do not depend on where the machine running them happens to be.
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

// every game, its route, and the heading it shows
const GAMES = [
    { route: '/games/object', title: 'Object Identification' },
    { route: '/games/pattern', title: 'Pattern Recognition' },
    { route: '/games/oddoneout', title: 'Odd One Out' },
    { route: '/games/missing', title: "What's Missing?" },
    { route: '/games/memory', title: 'Memory Match' },
    { route: '/games/sequence', title: 'Sequence Recall' },
]

test.describe('The six games', () => {
    // One test each rather than one loop inside a single test, so a failure names the game that broke
    // instead of stopping at the first one and leaving the other five untested.
    for (const { route, title } of GAMES) {
        test(`${title} opens and is ready to play`, async ({ page }) => {
            await page.goto(route)

            // the game's own heading, from GameLayout's title
            await expect(page.getByRole('heading', { level: 1 })).toContainText(title, { timeout: 15000 })

            // Read aloud is on every game, and is the accessibility feature older players rely on.
            // GameLayout only renders it where the browser supports speech, which Chromium does.
            await expect(page.getByRole('button', { name: /Read aloud/ })).toBeVisible()

            // and a way back out
            await expect(page.getByRole('button', { name: /Back/ })).toBeVisible()
        })
    }
})

test.describe('Playing a game through to the end', () => {
    test('Object Identification can be finished, and shows a score out of 5', async ({ page }) => {
        await page.goto('/games/object')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Object Identification', { timeout: 15000 })

        // It starts on question 1 of 5, with nothing right yet.
        await expect(page.getByText('Question 1 of 5. 0 correct.')).toBeVisible()

        // Answer all 5. Which option is correct depends on the picture, which is shuffled every run,
        // so this answers at random: the test is that the game PLAYS to the end, not that it is won.
        for (let round = 1; round <= 5; round++) {
            await expect(page.getByText(`Question ${round} of 5.`)).toBeVisible()

            // the 4 answer buttons, picked out by their shared class so the Back / Read aloud
            // buttons in the header are not counted
            const options = page.locator('button.g-option')
            await expect(options).toHaveCount(4)
            await options.first().click()

            // choose() waits 900ms before moving on, so the player can see the tick
            await expect(options.first()).toBeDisabled()
        }

        // The intro line becomes the score. GameLayout renders that line TWICE — one copy for phones
        // (.d-md-none) and one for desktop (.d-none.d-md-block) — so matching on the text alone finds a
        // hidden copy as well. Match only the one the layout is actually showing.
        await expect(page.locator('p.game-lead:visible')).toContainText(/You scored [0-5] out of 5\./, { timeout: 15000 })
        await expect(page.getByRole('button', { name: /Play again/ })).toBeVisible()
    })

    test('answering marks which option was right', async ({ page }) => {
        await page.goto('/games/object')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Object Identification', { timeout: 15000 })

        const options = page.locator('button.g-option')
        await options.first().click()

        // optionClass() puts .correct on the right answer once anything has been chosen, so a player
        // who picked wrongly still learns the answer. Exactly one option is the right one.
        await expect(page.locator('button.g-option.correct')).toHaveCount(1)

        // and the rest are locked, so a second guess cannot be sneaked in
        await expect(options.nth(1)).toBeDisabled()
    })
})

test.describe('Practice mode', () => {
    test('a game played outside a place pays no coins or XP', async ({ page }) => {
        // Opened with no ?visit= and no ?puzzle=, so lib/gamereward.js sends the result to
        // POST /api/progress/xp, which answers { practice: true, earned: { xp: 0, coins: 0 } }.
        // This is what stops a player replaying one game over and over for coins.
        await page.goto('/games/object')
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Object Identification', { timeout: 15000 })

        // the reward is claimed when the last question is answered, so wait for the server's answer
        const claimed = page.waitForResponse(
            (r) => r.url().includes('/progress/xp') && r.request().method() === 'POST',
            { timeout: 20000 },
        )

        for (let round = 1; round <= 5; round++) {
            const options = page.locator('button.g-option')
            await expect(options).toHaveCount(4)
            await options.first().click()
            await expect(options.first()).toBeDisabled()
        }

        const answer = await claimed
        expect(answer.ok(), 'the practice endpoint should accept this game').toBe(true)
        expect((await answer.json()).earned).toEqual({ xp: 0, coins: 0 })

        // and the player is told, rather than left wondering where their coins went
        await expect(page.getByText('Practice round · no coins or XP this time')).toBeVisible({ timeout: 15000 })
    })
})

// NOT TESTED HERE: finishing a game that was opened by tapping in at a real place
// (/games/pattern?visit=123), which is the path that pays coins and finds a Spirit.
// That needs a visit row to exist first, which needs the map and a location. To cover it, a test would
// have to create a visit through the API before opening the game. Worth doing, but it belongs in a
// map/visit spec rather than here.
