import { defineConfig, devices } from '@playwright/test'

// Overridable so a dev machine with something else already bound to :3000
// (e.g. another project's dev server) doesn't get silently reused by
// Playwright's reuseExistingServer behavior.
const PORT = process.env.PLAYWRIGHT_PORT ?? '3000'
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT },
  },
})
