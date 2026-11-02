// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   e2e/admin.spec.js
// purpose:    - end-to-end tests for the admin page (/admin), which lists and edits every user
// covers:     1. an ordinary player who opens /admin is shown nothing about other users
//             2. the server itself refuses them, which is where the real protection lives
// why it matters:
//             /admin has NO requiresAuth and no guard in the router, so anyone can navigate to it.
//             The protection is server-side: /api/admin/* sits behind requireAdmin (a role = 'admin'
//             row in the progress table). views/admin.vue says so itself: "the real check that someone
//             is an admin MUST happen on the server, hiding this page in the router is not enough."
//             These tests pin that down, so nobody later 'fixes' it by trusting the router.
// signed in:  via e2e/auth.setup.js, as an ordinary (non-admin) player
// ----------------------------------------------------------------------------------------------------------

import { test, expect } from '@playwright/test'

test.describe('Admin page, as an ordinary player', () => {
    test('shows no user data, only a refusal', async ({ page }) => {
        await page.goto('/admin')

        // the page loads (the router lets anyone in) but loading the users fails,
        // and admin.vue renders the reason in a <div role="alert">
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })

        // and nothing about anybody: no email addresses anywhere on the page
        await expect(page.getByText(/@.+\..+/)).toHaveCount(0)
    })

    test('the server refuses the admin endpoints, not just the page', async ({ page }) => {
        // Ask the API the way the page does, carrying this player's own login.
        // This is the check that actually protects the data: the router does not.
        const refused = []
        for (const path of ['/admin/me', '/admin/users']) {
            const answer = await page.request.get(`http://127.0.0.1:8000/api${path}`, {
                headers: { Authorization: `Bearer ${await accessToken(page)}` },
            })
            refused.push([path, answer.status()])
        }

        for (const [path, status] of refused) {
            expect(status, `${path} should refuse a non-admin`).toBe(403)
        }
    })
})

// the signed-in player's token, read from the browser the way lib/api.js does
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
