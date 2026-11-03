// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/auth.setup.js
// purpose:    - signs in ONCE through the real login form and saves the browser session to a file
//             - every spec then starts already signed in, instead of logging in again each test
//             - almost every page needs a login (router.beforeEach sends guests to /login), so without
//               this the tests would never get past the login screen
// needs:      E2E_EMAIL and E2E_PASSWORD, from memorygo/.env.e2e (see playwright.config.js)
// ----------------------------------------------------------------------------------------------------------

import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { test as setup, expect } from '@playwright/test'

// next to this file, whichever folder the tests were started from (same file as playwright.config.js)
export const SESSION_FILE = fileURLToPath(new URL('.auth/session.json', import.meta.url))

setup('sign in once and save the session', async ({ page }) => {
    const email = process.env.E2E_EMAIL
    const password = process.env.E2E_PASSWORD

    if (!email || !password) {
        throw new Error(
            'Missing E2E_EMAIL / E2E_PASSWORD.\n' +
            'Create memorygo/.env.e2e with a Supabase test account:\n' +
            '  E2E_EMAIL=test@example.com\n' +
            '  E2E_PASSWORD=your-test-password\n' +
            'That account needs at least one spirit already found, or the collection tests will skip.',
        )
    }

    await page.goto('/login')
    // by id, not by label: the password field's "Show" toggle is labelled "Show password",
    // so getByLabel('Password') matches the input AND that button. The ids are set by hand
    // in login.vue, so they are stable.
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // login.vue pushes to /map once Supabase accepts the password
    await expect(page).toHaveURL(/\/map/, { timeout: 15000 })

    // Supabase keeps the session in localStorage, which storageState captures
    await page.context().storageState({ path: SESSION_FILE })
})
