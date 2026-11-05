// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/leaderboard.spec.js
// purpose:    - end-to-end tests for the Leaderboard tab (/leaderboard), every explorer ranked by total XP
// covers:     1. the page loads and shows the ranking from GET /api/leaderboard
//             2. the ranking is sorted from highest to lowest XP, with ranks 1, 2, 3...
//             3. the podium shows the top 3, with 2nd on the left, 1st in the middle and 3rd on the right
//             4. "Your current rank" shows the signed-in account's rank and XP
// signed in:  via e2e/auth.setup.js
// note:       these read the server's own answer and check the page against it, because the test
//             account's rank and the other players' XP change as people play. Nothing here changes the account.
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

// Open the page and wait for the server's answer, not just for the HTML.
// Everything on this page comes from GET /api/leaderboard, so until that lands the page is only "Loading explorers...".
async function openLeaderboard(page) {
    // 45s, not the default: the dev server compiles each route the first time it is asked for, and with
    // several test workers hitting it at once that first load can be slow when nothing is broken.
    const loaded = page.waitForResponse(
        (r) => r.url().includes('/api/leaderboard') && r.request().method() === 'GET',
        { timeout: 45000 },
    )
    await page.goto('/leaderboard')
    const answer = await loaded
    expect(answer.ok(), 'GET /api/leaderboard should succeed').toBe(true)
    return (await answer.json()).leaderboard
}

test.describe('Leaderboard tab', () => {
    // The first visit to a page waits for the dev server to compile it, so these are slow by
    // nature rather than by fault. test.slow() triples the time limit instead of failing on a cold start.
    test.slow()
    test('shows the heading and the ranking from the server', async ({ page }) => {
        const players = await openLeaderboard(page)

        await expect(page.getByRole('heading', { level: 1 })).toContainText('leaderboard')

        // the test account exists, so there is at least one explorer and the empty state must not show
        expect(players.length, 'the test account should be on the leaderboard').toBeGreaterThan(0)
        await expect(page.getByText('No explorers yet!')).toHaveCount(0)
        await expect(page.getByText(`${players.length} explorers`)).toBeVisible()
    })

    test('is ranked from highest to lowest XP', async ({ page }) => {
        const players = await openLeaderboard(page)

        // this checks the server's list rather than scraping the screen: the page only displays the
        // order it is given, so the order has to be right before it gets there
        for (let i = 0; i < players.length; i++) {
            expect(players[i].rank, `player ${i + 1} should have rank ${i + 1}`).toBe(i + 1)
            if (i > 0) {
                expect(players[i - 1].xp, `rank ${i} should have at least as much XP as rank ${i + 1}`)
                    .toBeGreaterThanOrEqual(players[i].xp)
            }
        }
    })

    test('the podium shows the top three, 2nd on the left and 1st in the middle', async ({ page }) => {
        const players = await openLeaderboard(page)

        const shown = Math.min(players.length, 3)
        const podium = page.locator('.podium-player')
        await expect(podium).toHaveCount(shown)

        // with a full podium the order on screen is 2nd, 1st, 3rd
        if (players.length >= 3) {
            await expect(podium.nth(0)).toHaveClass(/place-2/)
            await expect(podium.nth(1)).toHaveClass(/place-1/)
            await expect(podium.nth(2)).toHaveClass(/place-3/)
        }

        // each place shows the name the server gave it. Looked up by place, so two players who share
        // a name (everyone with no display name is "MemoryGo Explorer") do not confuse the check.
        for (const player of players.slice(0, shown)) {
            await expect(page.locator(`.place-${player.rank} .podium-name`)).toHaveText(player.name)
        }
    })

    test('"Your current rank" matches the signed-in account', async ({ page }) => {
        const players = await openLeaderboard(page)

        // exactly one entry is the signed-in user
        const me = players.filter((p) => p.isCurrentUser)
        expect(me, 'exactly one entry should be marked isCurrentUser').toHaveLength(1)

        const card = page.locator('.my-rank')
        await expect(card).toContainText('Your current rank')
        await expect(card.locator('.my-rank-number')).toHaveText(`# ${me[0].rank}`)
        await expect(card.locator('.my-rank-xp')).toContainText(me[0].xp.toLocaleString('en-US'))
    })
})