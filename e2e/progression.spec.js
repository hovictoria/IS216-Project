import { test, expect } from '@playwright/test'
// the setup is in separate functions
// so both tests can reuse them and stay easy to read

// number of questions one Object Identification game has
const QUESTIONS = 5

// mocks the server's reply so the test gives the same result every run 
// without changing real data or hitting the once-a-day limit
async function fakeReward(page, { totalXp, earnedXp }) {
    await page.route('**/api/journey/puzzle/finish', (route) =>
        route.fulfill({
            json: {
                paid: true,
                earned: { xp: earnedXp, coins: 10 },
                totals: { xp: totalXp, coins: 100 },
                bonus: 0,
            },
        }),
    )
}

// plays the game like a real user so we test the whole journey
async function finishGame(page) {
    await page.goto('/games/object?puzzle=1')

    for (let n = 1; n <= QUESTIONS; n++) {
        await expect(page.getByText(new RegExp(`^Question ${n} of ${QUESTIONS}\\.`))).toBeVisible()
        // .g-option is the shared answer-button class every game uses (components/games/GameLayout.vue)
        await page.locator('.g-option').first().click()
    }
}


const levelUpPopup = (page) => page.getByRole('dialog', { name: /You reached Level/ })

// Let the real profile reply through, but swap in our own XP, so the rest of the Me page loads as usual.
//
// The app asks for the profile TWICE on this page — once from main.js and once from me.vue — so this
// handler runs twice, and whichever request the page gives up on has its response thrown away while we
// are still reading it ("Response has been disposed"). That made these tests fail about one run in two,
// alternating between them. So: read the body defensively, and let a dead request go.
async function fakeProfileXp(page, xp) {
    let cached = null        // the real profile, kept so the second request needs no second fetch

    await page.route('**/api/me/profile', async (route) => {
        if (cached) return route.fulfill({ json: { ...cached, xp } })

        // Two attempts: a request the page drops mid-flight disposes its own response, which is not a
        // reason to give up — the next one usually survives. Letting the REAL profile through instead
        // would quietly undo the mock and fail the assertion below with the account's true XP.
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                cached = await (await route.fetch()).json()
                return await route.fulfill({ json: { ...cached, xp } })
            } catch { /* dropped; try again */ }
        }
        try { await route.fallback() } catch { /* the request is long gone */ }
    })
}

// the XP bar on the Me page
const xpBar = (page) => page.getByRole('progressbar').first()

//no confetti or bouncing badge, so nothing is still moving when we check or tap
test.use({ reducedMotion: 'reduce' })

test.describe('Levelling up', () => {
    test('XP that crosses a level shows the level-up pop-up, and "Back to map" goes to the map', async ({ page }) => {
        await fakeReward(page, { totalXp: 105, earnedXp: 10 })   // 95 XP (Level 1) → 105 XP (Level 2)

        await finishGame(page)

        //the pop-up shows the new level
        const popup = levelUpPopup(page)
        await expect(popup).toBeVisible()
        await expect(popup.getByRole('heading')).toHaveText('You reached Level 2')

        //"Back to map" closes it and goes to the map
        await popup.getByRole('button', { name: 'Back to map' }).click()
        await expect(page).toHaveURL(/\/map$/)
        await expect(levelUpPopup(page)).toHaveCount(0)
    })

    test('XP that stays inside the same level shows no pop-up', async ({ page }) => {
        await fakeReward(page, { totalXp: 60, earnedXp: 10 })     // 50 XP → 60 XP, both Level 1

        await finishGame(page)

        //the reward chip proves the server's answer has arrived, so the pop-up has had its chance to show
        await expect(page.getByText('+10 XP')).toBeVisible()
        await expect(levelUpPopup(page)).toHaveCount(0)
    })
})

test.describe('Level on the Me page', () => {
    test('shows the level and how far it is to the next one', async ({ page }) => {
        await fakeProfileXp(page, 2695)   //level 9 starts at 2200, Level 10 at 2700 → 495 of 500

        await page.goto('/me')

        await expect(page.getByText('Level 9', { exact: true })).toBeVisible()
        await expect(page.getByText('495 / 500 XP to Level 10')).toBeVisible()
        await expect(xpBar(page)).toHaveAttribute('aria-valuenow', '99')
    })

    test('at the top level the bar is full', async ({ page }) => {
        await fakeProfileXp(page, 3000)   //past Level 10 (2700), the last level

        await page.goto('/me')

        await expect(page.getByText('Level 10', { exact: true })).toBeVisible()
        await expect(page.getByText('Top level reached')).toBeVisible()
        await expect(xpBar(page)).toHaveAttribute('aria-valuenow', '100')
    })
})
