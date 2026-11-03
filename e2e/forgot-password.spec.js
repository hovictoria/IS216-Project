import { test, expect } from '@playwright/test'

const EMAIL = 'someone@example.com'

// no saved login: start signed out
test.use({ storageState: { cookies: [], origins: [] } })

//fake Supabase's "send reset email" reply. Returns the list of emails the app asked to send to,
//so a test can check what was sent (or that nothing was)
async function fakeResetEmail(page, { status = 200 } = {}) {
    const sentTo = []
    await page.route('**/auth/v1/recover**', async (route) => {
        sentTo.push(route.request().postDataJSON().email)
        await route.fulfill(status === 200
            ? { json: {} }
            : { status, json: { code: status, error_code: 'over_email_send_rate_limit', msg: 'Email rate limit exceeded' } })
    })
    return sentTo
}

const emailField = (page) => page.getByLabel('Email')
const sendButton = (page) => page.getByRole('button', { name: 'Send link' })

test.describe('Forgot password', () => {
    test('"Forgot password?" on the sign-in page opens it', async ({ page }) => {
        await page.goto('/login')
        await page.getByRole('link', { name: 'Forgot password?' }).click()
        // / ... / is a pattern (a regular expression) rather than an exact address
        // The \ before / just means "a real slash", because / on its own marks the start and end of the pattern
        await expect(page).toHaveURL(/\/forgot-password$/)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forgot password?')
    })

    test('a valid email sends the reset link', async ({ page }) => {
        const sentTo = await fakeResetEmail(page)
        await page.goto('/forgot-password')

        await emailField(page).fill(EMAIL)
        await sendButton(page).click()

        const notice = page.getByRole('status')
        await expect(notice).toContainText(`If ${EMAIL} has a MemoryGo account, we've sent it a link.`)
        expect(sentTo).toEqual([EMAIL])
    })

    test('something that is not an email is stopped', async ({ page }) => {
        const sentTo = await fakeResetEmail(page)
        await page.goto('/forgot-password')

        await emailField(page).fill('not-an-email')
        await sendButton(page).click()

        await expect(page.getByRole('alert')).toHaveText('Please type the email you signed up with.')
        expect(sentTo).toEqual([])
    })

    test('if the email cannot be sent, a friendly error shows', async ({ page }) => {
        await fakeResetEmail(page, { status: 429 })   // Supabase's "too many emails" answer
        await page.goto('/forgot-password')

        await emailField(page).fill(EMAIL)
        await sendButton(page).click()

        await expect(page.getByRole('alert')).toHaveText(
            "We couldn't send the email just now. Please wait a minute and try again.",
        )
        await expect(page.getByRole('status')).toHaveCount(0)   // no "we've sent it" message
    })
})
