// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/map.spec.js
// purpose:    - end-to-end tests for the Map (/map), the screen players land on after signing in
// covers:     1. the places arrive from GET /api/places and appear as "Near you" cards
//             2. tapping a card opens that place's panel, with its name
//             3. the panel closes again and the cards come back
//             4. the map's own controls are reachable by their labels (zoom, centre on me)
// signed in:  via e2e/auth.setup.js
// location:   the browser is given a FIXED location (SMU), because "Near you" only lists places within
//             2 km of the player. Without this the result would depend on where the machine running the
//             tests happens to be, and the suite would pass in Singapore and fail anywhere else.
// not here:   search and directions. Those call OneMap, which needs credentials the team does not have
//             in the test environment, so a test for them would fail for a reason that is not a bug.
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

// Singapore Management University, the same default views/map.vue falls back to (const SMU)
test.use({
    geolocation: { latitude: 1.2963, longitude: 103.8502 },
    permissions: ['geolocation'],
})

// Open the map and wait for the places themselves, not just the page.
// The map is a WebGL canvas that renders before its data arrives, so "the page loaded" means nothing here.
async function openMap(page) {
    const loaded = page.waitForResponse(
        (r) => r.url().includes('/api/places') && r.request().method() === 'GET',
        { timeout: 20000 },
    )
    await page.goto('/map')
    const answer = await loaded
    expect(answer.ok(), 'GET /api/places should succeed').toBe(true)
    return answer.json()
}

test.describe('Map', () => {
    // The first visit to a page waits for the dev server to compile it, so these are slow by
    // nature rather than by fault. test.slow() triples the time limit instead of failing on a cold start.
    test.slow()
    test('lists the places near the player', async ({ page }) => {
        const places = await openMap(page)
        expect(Array.isArray(places) ? places.length : places.places?.length).toBeGreaterThan(0)

        await expect(page.getByRole('heading', { level: 1 })).toContainText('Near')

        // Cards appear for places within 2 km. From SMU that is the middle of the city, so there
        // should be some; if the seed data ever moves, this is the assertion that will say so.
        await expect(page.locator('button.card').first()).toBeVisible({ timeout: 20000 })
    })

    test('the All / MRT / Spots filters change what is listed', async ({ page }) => {
        await openMap(page)
        await expect(page.locator('button.card').first()).toBeVisible({ timeout: 20000 })

        const filters = page.getByRole('group', { name: 'Show on map' })
        const chips = () => page.locator('button.card .chip-outline').allInnerTexts()

        // Counting cards cannot test this: views/map.vue caps the list at MAX_CARDS (20), so a filter
        // that removes places can still show 20 of them. Check WHAT is listed instead of how many.
        // In the sidebar each card carries one chip: "MRT · EW13 NS25" for a station, else its category.
        await filters.getByRole('button', { name: 'MRT' }).click()
        const onMrt = await chips()
        expect(onMrt.length).toBeGreaterThan(0)
        for (const chip of onMrt) expect(chip).toMatch(/^MRT/)

        await filters.getByRole('button', { name: 'Spots' }).click()
        const onSpots = await chips()
        expect(onSpots.length).toBeGreaterThan(0)
        for (const chip of onSpots) expect(chip).not.toMatch(/^MRT/)

        // All brings both kinds back
        await filters.getByRole('button', { name: 'All' }).click()
        const onAll = await chips()
        expect(onAll.some((c) => /^MRT/.test(c)), 'All should include stations').toBe(true)
    })

    test('tapping a place opens its panel, and closing brings the list back', async ({ page }) => {
        await openMap(page)

        const first = page.locator('button.card').first()
        await expect(first).toBeVisible({ timeout: 20000 })
        const name = (await first.locator('.title').innerText()).trim()

        await first.click()

        // RoutePanel replaces the cards with this place's preview
        await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(name)
        await expect(page.locator('button.card')).toHaveCount(0)

        await page.getByRole('button', { name: 'Close' }).click()
        await expect(page.locator('button.card').first()).toBeVisible()
    })

    test('the map controls are reachable by name', async ({ page }) => {
        await openMap(page)

        // these are icon-only buttons, so their aria-labels are the only thing a screen reader
        // (or this test) has to go on
        await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Centre the map on me' })).toBeVisible()
    })
})
