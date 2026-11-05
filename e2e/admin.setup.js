import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { test as setup,expect } from '@playwright/test'

export const ADMIN_SESSION_FILE = fileURLToPath(new URL('.auth/admin.json', import.meta.url))

setup('sign in as admin and save the session', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD

    if (!email || !password) {
        throw new Error('Missing E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD in .env.e2e')
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
    await page.context().storageState({ path: ADMIN_SESSION_FILE })
})
