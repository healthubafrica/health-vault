import { test, expect, type Page } from '@playwright/test'

// ── Auth + mock helpers ─────────────────────────────────────────────────────

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

const SESSION_ID = 'session-1'

const MOCK_SESSION = {
  id: SESSION_ID,
  hhaRef: 'TLC-2026-0001',
  status: 'scheduled',
  scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  provider: { firstName: 'Amara', lastName: 'Okafor', title: 'Dr.' },
}

/** In-memory invite store so create/list/revoke behave like a real backend
 * across the sequence of requests a single test makes. */
function makeInviteStore() {
  let invites: Array<{
    id: string
    guestName: string
    guestEmail: string
    isRevoked: boolean
    verifiedAt: string | null
    createdAt: string
  }> = []
  return {
    async mock(page: Page) {
      await page.route('**/api/v1/telecare/sessions', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [MOCK_SESSION] }) }),
      )
      await page.route(`**/api/v1/telecare/sessions/${SESSION_ID}/guest-invites`, async (route) => {
        const method = route.request().method()
        if (method === 'GET') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(invites) })
        }
        if (method === 'POST') {
          const body = route.request().postDataJSON() as { guestName: string; guestEmail: string }
          const invite = {
            id: `invite-${invites.length + 1}`,
            guestName: body.guestName,
            guestEmail: body.guestEmail,
            isRevoked: false,
            verifiedAt: null,
            createdAt: new Date().toISOString(),
          }
          invites = [invite, ...invites]
          return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(invite) })
        }
        return route.continue()
      })
      await page.route(`**/api/v1/telecare/sessions/${SESSION_ID}/guest-invites/*`, async (route) => {
        if (route.request().method() !== 'DELETE') return route.continue()
        const id = route.request().url().split('/').pop()!
        invites = invites.map((i) => (i.id === id ? { ...i, isRevoked: true } : i))
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(invites.find((i) => i.id === id)) })
      })
    },
  }
}

test.describe('TeleCare guest invite management (patient side)', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page)
  })

  test('inviting a guest sends it and shows it as pending in the list', async ({ page }) => {
    await makeInviteStore().mock(page)
    await page.goto('/telecare')

    await page.getByRole('button', { name: 'Invite a caregiver or family member' }).click()
    await expect(page.getByText('Invite a caregiver or family member')).toBeVisible()

    await page.getByLabel('Guest name').fill('Aunty Ngozi')
    await page.getByLabel('Guest email').fill('ngozi@example.com')
    await page.getByRole('button', { name: 'Send invite' }).click()

    await expect(page.getByText('Aunty Ngozi')).toBeVisible()
    // Non-exact would also match the "Invite sent to ngozi@example.com" toast.
    await expect(page.getByText('ngozi@example.com', { exact: true })).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
  })

  test('revoking a guest invite updates its status', async ({ page }) => {
    const store = makeInviteStore()
    await store.mock(page)
    await page.goto('/telecare')

    await page.getByRole('button', { name: 'Invite a caregiver or family member' }).click()
    await page.getByLabel('Guest name').fill('Uncle Femi')
    await page.getByLabel('Guest email').fill('femi@example.com')
    await page.getByRole('button', { name: 'Send invite' }).click()
    await expect(page.getByText('Pending')).toBeVisible()

    await page.getByRole('button', { name: 'Revoke invite' }).click()

    await expect(page.getByText('Revoked')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Revoke invite' })).not.toBeVisible()
  })

  test('shows a validation error when submitting without a name or email', async ({ page }) => {
    await makeInviteStore().mock(page)
    await page.goto('/telecare')

    await page.getByRole('button', { name: 'Invite a caregiver or family member' }).click()
    await page.getByRole('button', { name: 'Send invite' }).click()

    await expect(page.getByText('Enter a name and email address')).toBeVisible()
  })
})
