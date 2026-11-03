import { test, expect } from '@playwright/test'

test.describe('Admin page, as an ordinary player', () => {
    test('does not see the Manage users row on the Me page', async ({ page }) => {
        await page.goto('/me')

        // wait until the page has really loaded, otherwise "not there" proves nothing
        await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15000 })
        await expect(page.getByRole('button', { name: 'Change password' })).toBeVisible()
        await page.waitForLoadState('networkidle')

        await expect(page.getByRole('link', { name: /manage users/i })).toHaveCount(0)
        await expect(page.getByText('Only admins can see this')).toHaveCount(0)
    })

    test('shows no user data, only a refusal', async ({ page }) => {
        await page.goto('/admin')

        // the page loads (the router lets anyone in) but loading the users fails,
        // and admin.vue renders the reason in a <div role="alert">
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })

        // and nothing about anybody: no email addresses anywhere on the page
        await expect(page.getByText(/@.+\..+/)).toHaveCount(0)
    })

    test('the server refuses the admin endpoints, not just the page', async ({ page }) => {
        const token = await accessToken(page)

        for (const path of ['/admin/me', '/admin/users']) {
            const answer = await page.request.get(`http://127.0.0.1:8000/api${path}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(answer.status(), `${path} should refuse a non-admin`).toBe(403)
        }
    })
})

async function accessToken(page) {
    await page.goto('/me')
    return page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            try {
                const value = JSON.parse(localStorage.getItem(localStorage.key(i)))
                if (value?.access_token) return value.access_token
            } catch { /* not ours */ }
        }
        return ''
    })
}