// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/journey.spec.js
// purpose:    - end-to-end tests for the Journey tab (/journey), the app's daily home page
// covers:     1. the page loads and shows the day's numbers from GET /api/journey
//             2. Today's challenge shows real progress towards its goal
//             3. This week shows seven days, with the days played marked
//             4. Puzzle of the day links to one of the 6 games, carrying ?puzzle=1 so it pays the bonus
//             5. Play anytime offers all 6 games, and one of them opens
// signed in:  via e2e/auth.setup.js
// note:       nothing here changes the account. The puzzle link is CHECKED but not followed, because
//             following it would claim the day's bonus and change what the next run sees.
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

// the six games, as the Play anytime tiles link to them
const GAME_IDS = ['memory', 'sequence', 'missing', 'pattern', 'object', 'oddoneout']

// Open the page and wait for the server's answer, not just for the HTML.
// Every number on this page comes from GET /api/journey, so until that lands the page is still a shell.
async function openJourney(page) {
    // 45s, not the default: the dev server compiles each route the first time it is asked for, and with
    // several test workers hitting it at once that first load can take far longer than the page itself.
    // A timeout here would look like a broken page when nothing is broken.
    const loaded = page.waitForResponse(
        (r) => r.url().includes('/api/journey') && r.request().method() === 'GET',
        { timeout: 45000 },
    )
    await page.goto('/journey')
    const answer = await loaded
    expect(answer.ok(), 'GET /api/journey should succeed').toBe(true)
    return answer.json()
}

test.describe('Journey tab', () => {
    // The first visit to a page waits for the dev server to compile it, so these are slow by
    // nature rather than by fault. test.slow() triples the time limit instead of failing on a cold start.
    test.slow()
    test('shows the day from the server', async ({ page }) => {
        const data = await openJourney(page)

        await expect(page.getByRole('heading', { level: 1 })).toContainText('journey')

        // Today's challenge: the ring's own label carries the numbers, so the test reads the same
        // value a screen reader announces instead of scraping the drawing.
        const ring = page.getByRole('img', { name: /places played today/ })
        await expect(ring).toBeVisible()
        await expect(ring).toHaveAttribute(
            'aria-label',
            `${data.challenge.done} of ${data.challenge.goal} places played today`,
        )
    })

    test('This week shows seven days, matching the server', async ({ page }) => {
        const data = await openJourney(page)

        const days = page.getByRole('list', { name: 'Days played this week' }).getByRole('listitem')
        await expect(days).toHaveCount(7)

        // the days the server says were played are the ones marked on screen
        const played = await page.locator('.days li.played').count()
        expect(played).toBe(data.week.filter(Boolean).length)
        await expect(page.getByText(`${data.daysThisWeek}`, { exact: false }).first()).toBeVisible()
    })

    test('Spirits found links to the collection', async ({ page }) => {
        const data = await openJourney(page)

        const tile = page.getByRole('link', { name: /Spirits found/ })
        await expect(tile).toContainText(String(data.spiritsFound))

        await tile.click()
        await expect(page).toHaveURL(/\/spirits/)
    })

    test('Puzzle of the day points at a real game, and asks to be paid for', async ({ page }) => {
        const data = await openJourney(page)

        await expect(page.getByText('Puzzle of the day')).toBeVisible()
        expect(GAME_IDS, 'the puzzle should be one of the six games').toContain(data.puzzle.game)

        // The link is checked, not clicked: opening it with ?puzzle=1 would claim today's bonus.
        // ?puzzle=1 is what tells lib/gamereward.js to post to /journey/puzzle/finish instead of
        // the practice endpoint, so its presence is the whole point of this assertion.
        const play = page.getByRole('link', { name: data.puzzle.done ? 'Play again' : 'Play' })
        const href = await play.getAttribute('href')
        expect(href).toContain(`/games/${data.puzzle.game}`)
        if (!data.puzzle.done) expect(href).toContain('puzzle=1')
    })

    test('Play anytime offers all six games, and one opens', async ({ page }) => {
        await openJourney(page)

        // one practice tile per game, each linking to the plain route with no ?puzzle= and no ?visit=,
        // which is what makes it practice
        for (const id of GAME_IDS) {
            await expect(page.locator(`a.game[href="/games/${id}"]`)).toHaveCount(1)
        }

        await page.locator('a.game[href="/games/memory"]').click()
        await expect(page).toHaveURL(/\/games\/memory$/)
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Memory Match', { timeout: 15000 })
    })
})
