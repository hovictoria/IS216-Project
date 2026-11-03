// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/auth.spec.js
// purpose:    - end-to-end tests for signing in and the guard that protects every page
//             - 13 routes are marked requiresAuth, so this guard is what keeps the whole app private
// covers:     1. a visitor who is not signed in is sent to the sign-in page
//             2. the wrong password is refused, with a message
//             3. the right details sign you in and land you on the map
//             4. someone already signed in does not see the sign-in page again
// note:       the first three run SIGNED OUT, so they clear the saved session from auth.setup.js
// ----------------------------------------------------------------------------------------------------------

import process from 'node:process'
import { test, expect } from '@playwright/test'

// ---------- signed out ----------
test.describe('Signed out', () => {
    // start with an empty browser, ignoring the session auth.setup.js saved
    test.use({ storageState: { cookies: [], origins: [] } })

    test('a visitor who is not signed in is sent to the sign-in page', async ({ page }) => {
        await page.goto('/spirits')
        await expect(page).toHaveURL(/\/login/)
        await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })

    test('the wrong password is refused, with a message', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#login-email').fill(process.env.E2E_EMAIL ?? 'nobody@example.com')
        await page.locator('#login-password').fill('definitely-not-the-password')
        await page.getByRole('button', { name: 'Sign in' }).click()

        // login.vue shows the reason in a <p role="alert">, and we must still be on /login
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })
        await expect(page).toHaveURL(/\/login/)
    })

    test('the right details sign you in and land you on the map', async ({ page }) => {
        const email = process.env.E2E_EMAIL
        const password = process.env.E2E_PASSWORD
        test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD are not set')

        await page.goto('/login')
        await page.locator('#login-email').fill(email)
        await page.locator('#login-password').fill(password)
        await page.getByRole('button', { name: 'Sign in' }).click()

        await expect(page).toHaveURL(/\/map/, { timeout: 15000 })
    })
})

// ---------- already signed in ----------
test.describe('Already signed in', () => {
    test('does not see the sign-in page again', async ({ page }) => {
        // the router sends a signed-in visitor from /login straight to the map
        await page.goto('/login')
        await expect(page).toHaveURL(/\/map/, { timeout: 15000 })
    })

    test('can reach a protected page', async ({ page }) => {
        await page.goto('/spirits')
        await expect(page).toHaveURL(/\/spirits/)
        await expect(page).not.toHaveURL(/\/login/)
    })
})

// NOT TESTED HERE: signing out.
// stores/auth.js calls supabase.auth.signOut() with no scope, and supabase-js defaults to 'global',
// which revokes EVERY session for that account — including the one auth.setup.js saved for the other
// spec files. A logout test would therefore break every test that ran after it.
// To cover it, either sign out with { scope: 'local' } in the app, or give the logout test its own
// throwaway account. Worth agreeing as a team before adding it.
