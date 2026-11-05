import { test, expect } from '@playwright/test'

test.describe('Admin page, as an admin', () => {
    test('sees the Manage users row on the Me page', async ({ page }) => {
        await page.goto('/me')

        const manageUsers = page.getByRole('link', { name: /manage users/i })
        await expect(manageUsers).toBeVisible({ timeout: 15000 })
        // the "Admin" chip next to it
        await expect(manageUsers.getByText('Admin', { exact: true })).toBeVisible()
    })

    test('clicking Manage users opens the admin page with the user list', async ({ page }) => {
        await page.goto('/me')

        await page.getByRole('link', { name: /manage users/i }).click({ timeout: 15000 })
        await expect(page).toHaveURL(/\/admin/)

        // wait for the list first, so the "no alert" check below isn't running too early
        await expect(page.getByText(/@.+\..+/).first()).toBeVisible({ timeout: 15000 })
        await expect(page.getByRole('alert')).toHaveCount(0)
    })

    test('opening /admin directly shows the user list, not a refusal', async ({ page }) => {
        await page.goto('/admin')

        await expect(page.getByText(/@.+\..+/).first()).toBeVisible({ timeout: 15000 })
        await expect(page.getByRole('alert')).toHaveCount(0)
    })

    test('the server accepts the admin endpoints', async ({ page }) => {
        const token = await accessToken(page)

        for (const path of ['/admin/me', '/admin/users']) {
            const answer = await page.request.get(`http://127.0.0.1:8000/api${path}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(answer.status(), `${path} should allow an admin`).toBe(200)
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