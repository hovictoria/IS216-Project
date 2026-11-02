import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Found next to this file, not from the folder the tests were started in
// (the VS Code Playwright extension starts them from the repo root, not memorygo/)
const ENV_FILE = fileURLToPath(new URL('./.env.e2e', import.meta.url))
const SESSION_FILE = fileURLToPath(new URL('./e2e/.auth/session.json', import.meta.url))

// The Supabase test account the tests sign in with (see e2e/auth.setup.js).
// Read by hand rather than with dotenv, so the front end gains no dependency just for the tests.
// .env.e2e is git-ignored: it holds a real password.
for (const line of fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8').split('\n') : []) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (match) process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, '')
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters
     'list'  prints each test in the terminal as it runs
     'html'  with open: 'always' opens the report in the browser after EVERY run, not only on failure */
  reporter: [['list'], ['html', { open: 'always' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Only on CI systems run the tests headless */
    headless: !!process.env.CI,
  },

  /* Configure projects for major browsers */
  projects: [
    /* Signs in once and saves the session. Every spec below reuses it, so no test logs in again. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SESSION_FILE,
      },
      dependencies: ['setup'],
    },
    /* Firefox and WebKit are off while we build the suite: three browsers triples the run time.
       Turn them back on for a final check. */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], storageState: SESSION_FILE },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'], storageState: SESSION_FILE },
    //   dependencies: ['setup'],
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      /**
       * Use the dev server by default for faster feedback loop.
       * Use the preview server on CI for more realistic testing.
       * Playwright will re-use the local server if there is already a dev-server running.
       */
      command: process.env.CI ? 'npm run preview' : 'npm run dev',
      port: process.env.CI ? 4173 : 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      /* The API the pages read their data from. Without it the app loads but every list is empty. */
      command: 'npm run dev --prefix ../server',
      port: 8000,
      reuseExistingServer: true,
    },
  ],
})
