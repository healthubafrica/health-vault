import { test, expect, type Page } from '@playwright/test'

// Public, unauthenticated flow — deliberately no auth cookie anywhere in
// this file. Covers the caregiver/family guest join surface: email-OTP
// verification gating a scoped LiveKit token, no app account involved.

const TOKEN = 'guest-token-abc123'

async function mockInfo(page: Page, overrides: Partial<{
  guestName: string
  patientFirstName: string
  providerName: string | null
  scheduledAt: string
  sessionStatus: string
  canJoin: boolean
}> = {}) {
  const info = {
    guestName: 'Aunty Ngozi',
    patientFirstName: 'Chidi',
    providerName: 'Dr. Amara Okafor',
    scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    sessionStatus: 'scheduled',
    canJoin: true,
    ...overrides,
  }
  await page.route(`**/api/v1/telecare/guest/${TOKEN}`, (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(info) })
  })
}

test.describe('TeleCare guest join (public, email-OTP verified)', () => {
  // First hit to this route triggers a one-time Turbopack dev compile that
  // can exceed the default 30s test timeout; every subsequent test in this
  // file reuses that compiled output and runs in a few seconds.
  test.describe.configure({ timeout: 60_000 })

  test('shows a friendly landing message referencing the inviting patient and provider', async ({ page }) => {
    await mockInfo(page)
    await page.goto(`/telecare-guest/${TOKEN}`)

    await expect(page.getByText("Hi Aunty Ngozi, you're invited to a video call")).toBeVisible()
    await expect(page.getByText(/Chidi invited you to their consultation with Dr\. Amara Okafor/)).toBeVisible()
  })

  test('does not offer to send a code before the join window opens', async ({ page }) => {
    await mockInfo(page, { canJoin: false })
    await page.goto(`/telecare-guest/${TOKEN}`)

    await expect(page.getByText("This call isn't open yet.", { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send access code' })).not.toBeVisible()
  })

  test('happy path: request code, verify, and land in the call', async ({ page }) => {
    await mockInfo(page)
    await page.route(`**/api/v1/telecare/guest/${TOKEN}/otp`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )
    await page.route(`**/api/v1/telecare/guest/${TOKEN}/verify-otp`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake-livekit-jwt',
          serverUrl: 'wss://fake.livekit.cloud',
          roomName: 'telecare-session-1',
          guestName: 'Aunty Ngozi',
        }),
      }),
    )

    await page.goto(`/telecare-guest/${TOKEN}`)
    await page.getByRole('button', { name: 'Send access code' }).click()

    const codeInput = page.getByPlaceholder('000000')
    await expect(codeInput).toBeVisible()
    await codeInput.fill('123456')
    await page.getByRole('button', { name: 'Join call' }).click()

    await expect(page.getByText('Joined as Aunty Ngozi (guest)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Leave Call' })).toBeVisible()
  })

  test('invalid code shows an error and does not join', async ({ page }) => {
    await mockInfo(page)
    await page.route(`**/api/v1/telecare/guest/${TOKEN}/otp`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )
    await page.route(`**/api/v1/telecare/guest/${TOKEN}/verify-otp`, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid code' }) }),
    )

    await page.goto(`/telecare-guest/${TOKEN}`)
    await page.getByRole('button', { name: 'Send access code' }).click()
    await page.getByPlaceholder('000000').fill('000000')
    await page.getByRole('button', { name: 'Join call' }).click()

    await expect(page.getByText('Invalid code')).toBeVisible()
    await expect(page.getByText('Joined as', { exact: false })).not.toBeVisible()
  })

  test('a revoked or unknown invite link shows an error state', async ({ page }) => {
    await page.route(`**/api/v1/telecare/guest/${TOKEN}`, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Invite link not found' }) }),
    )

    await page.goto(`/telecare-guest/${TOKEN}`)

    await expect(page.getByRole('heading', { name: 'Invite unavailable' })).toBeVisible()
    await expect(page.getByText('Invite link not found')).toBeVisible()
  })
})
