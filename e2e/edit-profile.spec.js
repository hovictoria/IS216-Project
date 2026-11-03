import { test, expect } from '@playwright/test'

const NEW_NAME = 'Test Explorer'

//the signed-in user, from the login Supabase keeps in localStorage (key "sb-<project>-auth-token")
async function signedInUser(page) {
    return page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
        return JSON.parse(localStorage.getItem(key)).user
    })
}

//fake Supabase's "update user" reply. Returns the list of names the app tried to save,
//so a test can check what was sent (or that nothing was)
async function fakeNameSave(page) {
    const user = await signedInUser(page)
    const savedNames = []

    await page.route('**/auth/v1/user**', async (route) => {
        if (route.request().method() !== 'PUT') return route.continue()   // only fake the save

        const displayName = route.request().postDataJSON().data.display_name
        savedNames.push(displayName)
        await route.fulfill({
            json: { ...user, user_metadata: { ...user.user_metadata, display_name: displayName } },
        })
    })
    return savedNames
}

//open the Me page and the Edit profile pop-up
async function openEditProfile(page) {
    await page.goto('/me')
    await expect(page.getByText(/^Level \d+$/)).toBeVisible({ timeout: 15000 })   // the profile has loaded

    //there are two "Edit profile" buttons (under the level, and in the Account card); both open the same pop-up
    await page.getByRole('button', { name: 'Edit profile' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible()
}

const nameField = (page) => page.getByLabel('Your name')
const saveButton = (page) => page.getByRole('button', { name: 'Save changes' })

test.describe('Edit profile', () => {
    test('changing the name saves it and shows it on the Me page', async ({ page }) => {
        await page.goto('/me')
        const savedNames = await fakeNameSave(page)
        await openEditProfile(page)

        await nameField(page).fill(NEW_NAME)
        await saveButton(page).click()

        //the "Updated!" pop-up replaces the edit pop-up
        const updated = page.getByRole('dialog', { name: 'Updated!' })
        await expect(updated).toBeVisible()
        await expect(updated).toContainText('Your name has been updated.')
        await expect(page.getByRole('dialog', { name: 'Edit profile' })).toHaveCount(0)

        //the app sent the new name to Supabase
        expect(savedNames).toEqual([NEW_NAME])

        //OK closes it, and the Me page shows the new name straight away
        await updated.getByRole('button', { name: 'OK' }).click()
        await expect(updated).toHaveCount(0)
        await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(NEW_NAME)
    })

    test('an empty name is not saved', async ({ page }) => {
        await page.goto('/me')
        const savedNames = await fakeNameSave(page)
        await openEditProfile(page)

        await nameField(page).fill('')
        await saveButton(page).click()

        await expect(page.getByRole('alert')).toHaveText('Please type your name.')
        await expect(page.getByRole('dialog', { name: 'Updated!' })).toHaveCount(0)
        expect(savedNames).toEqual([])
    })

    test('saving without changing anything says so', async ({ page }) => {
        await page.goto('/me')
        const savedNames = await fakeNameSave(page)
        await openEditProfile(page)

        await saveButton(page).click()

        await expect(page.getByRole('alert')).toHaveText("You haven't changed anything yet.")
        expect(savedNames).toEqual([])
    })
})
