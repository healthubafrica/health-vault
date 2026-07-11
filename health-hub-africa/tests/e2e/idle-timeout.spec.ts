import { test, expect, type Page } from '@playwright/test'

/** Set a fake auth cookie so the middleware allows the request through. */
async function setAuthCookie(page: Page) {
  await page.context().addCookies([
    {
      name: 'hha_at',
      value: 'fake-jwt-token-for-e2e-testing',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ])
}

/**
 * Mocks every API call the dashboard makes on mount (see
 * components/screens/DashboardScreen.tsx): profile, vitals, upcoming
 * appointments, and the active subscription. Also mocks /auth/me and
 * /auth/logout since AppShell's useAuthRefresh / useIdleLogout hooks may
 * call them.
 */
async function mockDashboardApis(page: Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'u1', email: 'patient@example.com', role: 'patient' } }),
    }),
  )
  await page.route('**/api/v1/auth/logout', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  )
  await page.route('**/api/v1/patients/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'p1', firstName: 'Ada', hhaPatientId: 'HHA-0001' },
      }),
    }),
  )
  await page.route('**/api/v1/vitals**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  )
  await page.route('**/api/v1/appointments**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], meta: { total: 0 } }),
    }),
  )
  await page.route('**/api/v1/subscriptions/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null }),
    }),
  )
}

test.describe('Idle-timeout logout warning', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page)
    await mockDashboardApis(page)
    await page.clock.install({ time: new Date() })
    await page.goto('/dashboard')
    // Wait for the dashboard to finish its initial load so the skeleton is
    // gone before the clock starts fast-forwarding.
    await expect(page.getByText('Hello, Ada!')).toBeVisible()
  })

  test('shows the warning modal after 10 minutes idle', async ({ page }) => {
    await expect(page.getByText('Still there?')).not.toBeVisible()

    await page.clock.fastForward('10:01')

    await expect(page.getByText('Still there?')).toBeVisible()
    await expect(
      page.getByText("You've been inactive for a while. You'll be logged out automatically unless you continue your session."),
    ).toBeVisible()
  })

  test('clicking "Continue session" dismisses the modal', async ({ page }) => {
    await page.clock.fastForward('10:01')
    await expect(page.getByText('Still there?')).toBeVisible()

    await page.getByRole('button', { name: 'Continue session' }).click()

    await expect(page.getByText('Still there?')).not.toBeVisible()
  })

  test('auto-logs-out and redirects away from the protected app after the full grace period', async ({ page }) => {
    await page.clock.fastForward('10:01')
    await expect(page.getByText('Still there?')).toBeVisible()

    await page.clock.fastForward('00:59')

    // useIdleLogout() calls window.location.assign('/') on timeout, which is
    // a hard navigation. Since '/' is not in middleware.ts's PUBLIC_PATHS and
    // the auth cookie has just been cleared, the server-side middleware
    // immediately bounces the now-unauthenticated request to /login — so the
    // final, observable destination is /login, not '/'. The pre-navigation
    // toast does not survive the hard reload, so we assert on the durable
    // signal instead: the user has landed on the login screen, logged out.
    await page.waitForURL('**/login**')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })
})
