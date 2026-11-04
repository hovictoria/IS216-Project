// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/navigation.spec.js
// purpose:    - end-to-end tests for the main navigation (components/ui/AppNav.vue), which appears on
//               every signed-in screen and is how players move around the app
// covers:     1. all four tabs are there: Map, Spirits, Journey, Me
//             2. each one goes where it says
//             3. the tab you are on is marked, so a player can see where they are
//             4. a Spirit's page still marks the Spirits tab, which only works because AppNav checks
//                whether the current path sits UNDER a tab rather than matching it exactly
// signed in:  via e2e/auth.setup.js — the nav only exists once signed in
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

const TABS = [
    { name: 'Map', path: '/map' },
    { name: 'Spirits', path: '/spirits' },
    { name: 'Journey', path: '/journey' },
    { name: 'Me', path: '/me' },
]

// the nav labels itself "Main", which is also how a screen reader user finds it
const nav = (page) => page.getByRole('navigation', { name: 'Main' })

test.describe('Main navigation', () => {
    // a cold first visit compiles the route on the dev server, which can outlast the normal limit
    test.slow()

    test('has all four tabs', async ({ page }) => {
        await page.goto('/map')
        for (const { name } of TABS) {
            await expect(nav(page).getByRole('link', { name })).toBeVisible({ timeout: 15000 })
        }
    })

    test('each tab goes where it says, and is marked once you are there', async ({ page }) => {
        await page.goto('/map')
        await expect(nav(page).getByRole('link', { name: 'Map' })).toBeVisible({ timeout: 15000 })

        for (const { name, path } of TABS) {
            await nav(page).getByRole('link', { name }).click()
            await expect(page).toHaveURL(new RegExp(`${path}$`))

            // vue-router adds .router-link-active to the tab for the page you are on
            await expect(nav(page).getByRole('link', { name })).toHaveClass(/router-link-active/)
        }
    })

    test('a page inside a tab still marks that tab', async ({ page }) => {
        // AppNav marks a tab when the current path sits UNDER it (isUnder), not only when it matches.
        // Without that, opening one Spirit would leave the whole nav looking unselected.
        await page.goto('/spirits')
        const firstSpirit = page.getByTestId('spirit-tile').first()
        await expect(firstSpirit).toBeVisible({ timeout: 15000 })
        await firstSpirit.click()

        await expect(page).toHaveURL(/\/spirits\/[a-z-]+$/)
        await expect(nav(page).getByRole('link', { name: 'Spirits' })).toHaveClass(/router-link-active/)
    })
})
