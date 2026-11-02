// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/spirits.spec.js
// purpose:    - end-to-end tests for the Spirits collection, against the real app, API and database
// covers:     1. the collection page lists all 24 spirits, found ones named and locked ones hidden
//             2. the Found / Not yet filters actually change what is listed
//             3. a found spirit's page opens and shows where and when it was found
//             4. a spirit that has not been found stays hidden on its own page
// signed in:  via e2e/auth.setup.js, so these start already logged in
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

const TOTAL_SPIRITS = 24

// wait for the collection to arrive from /api/spirits — until then the page shows "Loading your spirits…"
async function openCollection(page) {
    await page.goto('/spirits')
    await expect(page.getByText('Loading your spirits…')).toHaveCount(0, { timeout: 15000 })
    await expect(page.getByRole('progressbar', { name: 'Spirits found' })).toBeVisible()
}

// how many the signed-in account has found, read off the "7 of 24 found" label
async function foundCount(page) {
    const label = await page.getByText(/\d+ of \d+ found/).first().innerText()
    return Number(label.match(/^(\d+) of/)[1])
}

test.describe('Spirits collection', () => {
    test('lists every spirit, naming the found ones and hiding the rest', async ({ page }) => {
        await openCollection(page)

        const tiles = page.getByTestId('spirit-tile')
        await expect(tiles).toHaveCount(TOTAL_SPIRITS)

        // a locked spirit shows "???" instead of its name, so the two counts must add up
        const locked = page.getByTestId('spirit-tile').filter({ hasText: '???' })
        const found = await foundCount(page)
        await expect(locked).toHaveCount(TOTAL_SPIRITS - found)
    })

    test('the Found and Not yet filters change what is listed', async ({ page }) => {
        await openCollection(page)
        const found = await foundCount(page)
        test.skip(found === 0, 'This account has not found any spirits yet')

        await page.getByRole('button', { name: 'Found', exact: true }).click()
        await expect(page.getByTestId('spirit-tile')).toHaveCount(found)
        await expect(page.getByTestId('spirit-tile').filter({ hasText: '???' })).toHaveCount(0)

        await page.getByRole('button', { name: 'Not yet' }).click()
        await expect(page.getByTestId('spirit-tile')).toHaveCount(TOTAL_SPIRITS - found)

        await page.getByRole('button', { name: 'All', exact: true }).click()
        await expect(page.getByTestId('spirit-tile')).toHaveCount(TOTAL_SPIRITS)
    })

    test('opening a found spirit shows where and when it was found', async ({ page }) => {
        await openCollection(page)
        test.skip((await foundCount(page)) === 0, 'This account has not found any spirits yet')

        // filter to the found ones so the first tile is certain to be unlocked
        await page.getByRole('button', { name: 'Found', exact: true }).click()
        const first = page.getByTestId('spirit-tile').first()
        const name = (await first.getByTestId('spirit-tile-name').innerText()).trim()

        await first.click()
        await expect(page).toHaveURL(/\/spirits\/[a-z-]+$/)

        // its name, not "???", and the two facts a found spirit has
        await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
        await expect(page.getByText('Found at', { exact: true })).toBeVisible()
        await expect(page.getByText('On', { exact: true })).toBeVisible()
    })

    test('a spirit that has not been found stays hidden on its own page', async ({ page }) => {
        await openCollection(page)
        const found = await foundCount(page)
        test.skip(found === TOTAL_SPIRITS, 'This account has found every spirit')

        await page.getByRole('button', { name: 'Not yet' }).click()
        await page.getByTestId('spirit-tile').first().click()

        // the name is withheld and the page says where it is hiding, not where it was found
        await expect(page.getByRole('heading', { level: 1 })).toContainText('???')
        await expect(page.getByText('Hiding at', { exact: true })).toBeVisible()
        await expect(page.getByText('On', { exact: true })).toHaveCount(0)
    })
})
