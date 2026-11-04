// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/signup.spec.js
// purpose:    - end-to-end tests for creating an account (/signup), the only way a new player gets in
// covers:     1. the sign-up page is reachable from the sign-in page, with its three fields
//             2. an empty form is stopped by the browser, before anything is sent
//             3. an address that is not an email is stopped the same way
//             4. a password Supabase refuses shows the reason, and does NOT let the visitor in
// signed out: these run with an EMPTY browser, ignoring the session auth.setup.js saved — a visitor
//             creating an account is by definition not signed in
// NOT HERE:   a sign-up that SUCCEEDS. It would make a real account in Supabase on every run, fill the
//             project with junk users and send a real confirmation email. Nor signing up with an address
//             that already exists: Supabase deliberately answers that with success, so that strangers
//             cannot discover who has an account, and the test would be asserting the wrong thing.
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

// Fill the form and submit it.
//
// Note for whoever reads this next: the fields carry `required` and the email field is type="email",
// but the <form> carries `novalidate`, which switches both off. So NOTHING is checked in the browser —
// every attempt, however obviously wrong, is sent to Supabase and answered by the server.
// These tests therefore check what the player sees, not what the browser blocks.
async function trySignUp(page, { name, email, password }) {
    await page.goto('/signup')
    await page.locator('#signup-name').fill(name)
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
}

// a sign-up that was refused must say so, and must not let the visitor into the app
async function expectRefused(page) {
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/signup/)
}

test.describe('Creating an account', () => {
    test('the sign-up page is reachable from the sign-in page', async ({ page }) => {
        await page.goto('/login')
        await page.getByRole('link', { name: 'Create an account' }).click()

        await expect(page).toHaveURL(/\/signup/)
        await expect(page.locator('#signup-name')).toBeVisible()
        await expect(page.locator('#signup-email')).toBeVisible()
        await expect(page.locator('#signup-password')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })

    test('an empty form is refused', async ({ page }) => {
        await page.goto('/signup')
        await page.getByRole('button', { name: 'Create account' }).click()

        await expectRefused(page)
    })

    test('an address that is not an email is refused', async ({ page }) => {
        await trySignUp(page, {
            name: 'Test Person',
            email: 'not-an-email',
            password: 'a-long-enough-password',
        })

        await expectRefused(page)
    })

    test('a password Supabase refuses is explained, and does not let you in', async ({ page }) => {
        // A unique address, so this is never an "account already exists" answer by accident.
        // Supabase rejects the password before creating anything, so no account and no email.
        await trySignUp(page, {
            name: 'Test Person',
            email: `e2e-${Date.now()}@example.com`,
            password: '123',
        })

        // stores/auth.js turns Supabase's reply into one of two messages. Either is accepted here:
        // Supabase rate-limits repeated sign-up attempts, and a 429 gives the general message instead
        // of the one about the password. Insisting on the password wording would make this test pass
        // in the morning and fail after a few runs, which teaches people to ignore a red test.
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })
        await expect(page.getByRole('alert')).toHaveText(
            /longer password|couldn’t create your account|couldn't create your account/i,
        )

        // the point of the test: a refused sign-up must not get you into the app
        await expect(page).toHaveURL(/\/signup/)
    })
})
