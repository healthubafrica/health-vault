import { test, expect, type Page } from '@playwright/test'

// ── Mock data matching v2 plan structure ─────────────────────────────────

const MOCK_PLANS = [
  {
    id: 'plan-free', slug: 'free', name: 'MyHealth Vault+ FREE',
    priceKobo: 0, annualPriceKobo: 0, launchPriceKobo: 0,
    isMostPopular: false, isBestValue: false, bestFor: '',
    features: ['Digital Health Passport', 'Emergency Health Profile'],
    displayOrder: 0, isActive: true,
  },
  {
    id: 'plan-basic', slug: 'basiccare', name: 'BasicCare™',
    priceKobo: 1_250_000, annualPriceKobo: 14_900_000, launchPriceKobo: 9_900_000,
    isMostPopular: false, isBestValue: false, bestFor: 'Individuals and young professionals',
    features: [
      'Everything in FREE',
      '2 TeleCare™ Consultations Annually',
      '1 MinuteCare™ Visit Annually',
      '1 HealthConsult™ Second Opinion Annually',
      'e-Prescriptions',
      'Care Navigation Support',
      '3% No Claim Discount',
    ],
    displayOrder: 1, isActive: true,
  },
  {
    id: 'plan-silver', slug: 'silvercare', name: 'SilverCare™',
    priceKobo: 2_490_000, annualPriceKobo: 29_900_000, launchPriceKobo: 24_900_000,
    isMostPopular: true, isBestValue: false, bestFor: 'Individuals and families',
    features: ['Everything in BasicCare™', '12 TeleCare™ Consultations Annually'],
    displayOrder: 2, isActive: true,
  },
  {
    id: 'plan-gold', slug: 'goldcare', name: 'GoldCare™',
    priceKobo: 4_990_000, annualPriceKobo: 59_900_000, launchPriceKobo: 49_900_000,
    isMostPopular: false, isBestValue: true, bestFor: 'Executives',
    features: [
      'Everything in SilverCare™',
      'Dedicated Care Coordinator',
      'Executive Health Review',
      'TravelSafe™ Nigeria',
      '7% No Claim Discount',
      'Priority Scheduling',
    ],
    displayOrder: 3, isActive: true,
  },
  {
    id: 'plan-concierge', slug: 'conciergecare', name: 'ConciergeCare™',
    priceKobo: 12_500_000, annualPriceKobo: 150_000_000, launchPriceKobo: 99_900_000,
    isMostPopular: false, isBestValue: false, bestFor: 'VIP members',
    features: ['Dedicated Relationship Manager', 'TravelSafe™ Global'],
    displayOrder: 4, isActive: true,
  },
]

const MOCK_ACTIVE_SUBSCRIPTION = {
  id: 'sub-active',
  status: 'active',
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  plan: MOCK_PLANS[2], // SilverCare
}

// ── Auth helpers ──────────────────────────────────────────────────────────

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

/** Mock the subscriptions API endpoints. */
async function mockSubscriptionsApi(page: Page, options: { activeSub?: object | null } = {}) {
  const { activeSub = MOCK_ACTIVE_SUBSCRIPTION } = options

  await page.route('**/api/v1/subscriptions/plans', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_PLANS }),
    }),
  )

  await page.route('**/api/v1/subscriptions/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: activeSub }),
    }),
  )

  await page.route('**/api/v1/subscriptions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'sub-new', status: 'active', plan: MOCK_PLANS[1] } }),
      })
    } else {
      await route.continue()
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────

test.describe('SubscriptionsScreen', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page)
    await mockSubscriptionsApi(page)
    await page.goto('/subscriptions')
  })

  // ── Page structure ──────────────────────────────────────────────────────

  test('page heading "Subscriptions" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Subscriptions' })).toBeVisible()
  })

  test('shows "Choose the plan that fits your care needs" subtitle', async ({ page }) => {
    await expect(page.getByText('Choose the plan that fits your care needs')).toBeVisible()
  })

  // ── Current plan card ───────────────────────────────────────────────────

  test('displays the active subscription plan name', async ({ page }) => {
    await expect(page.getByText('SilverCare™ Plan').first()).toBeVisible()
  })

  test('displays "active" status pill', async ({ page }) => {
    await expect(page.getByText('active')).toBeVisible()
  })

  test('"Cancel" button is visible for active subscription', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  // ── Plan list ───────────────────────────────────────────────────────────

  test('shows all 5 plan cards', async ({ page }) => {
    for (const plan of ['MyHealth Vault+ FREE', 'BasicCare™', 'SilverCare™', 'GoldCare™', 'ConciergeCare™']) {
      await expect(page.getByText(plan).first()).toBeVisible()
    }
  })

  test('billing toggle has Monthly and Annual buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Annual' })).toBeVisible()
  })

  test('monthly prices are shown by default', async ({ page }) => {
    // BasicCare monthly: priceKobo 1_250_000 / 100 = 12,500 → ₦12,500
    await expect(page.getByText('₦12,500').first()).toBeVisible()
  })

  // ── Billing toggle ──────────────────────────────────────────────────────

  test('switching to Annual changes prices', async ({ page }) => {
    await page.getByRole('button', { name: 'Annual' }).click()
    // BasicCare annual: annualPriceKobo 14_900_000 / 100 = 149,000 → ₦149,000
    await expect(page.getByText('₦149,000').first()).toBeVisible()
  })

  test('switching back to Monthly shows monthly prices again', async ({ page }) => {
    const annualBtn = page.getByRole('button', { name: 'Annual' })
    const monthlyBtn = page.getByRole('button', { name: 'Monthly' })

    await annualBtn.click()
    await monthlyBtn.click()

    await expect(page.getByText('₦12,500').first()).toBeVisible()
  })

  // ── Upgrade confirmation dialog ─────────────────────────────────────────

  test('clicking a plan button shows upgrade confirmation dialog when subscribed', async ({ page }) => {
    // Set up dialog listener before clicking
    let dialogMessage = ''
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message()
      await dialog.dismiss()
    })

    // Click "Choose" for BasicCare (any plan other than active SilverCare)
    const chooseBtns = page.getByRole('button', { name: /choose basiccare/i })
    await chooseBtns.first().click()

    expect(dialogMessage).toContain('Upgrade to BasicCare™')
    expect(dialogMessage).toContain('current plan will be cancelled')
  })

  test('clicking a plan button shows subscribe dialog when no active subscription', async ({ page }) => {
    // Re-mock with no active subscription
    await page.route('**/api/v1/subscriptions/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      }),
    )
    await page.reload()

    let dialogMessage = ''
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message()
      await dialog.dismiss()
    })

    const chooseBtns = page.getByRole('button', { name: /choose silvercare/i })
    await chooseBtns.first().click()

    expect(dialogMessage).toContain('Subscribe to SilverCare™')
    expect(dialogMessage).not.toContain('current plan')
  })

  // ── No active subscription state ────────────────────────────────────────

  test('shows "Free" plan label when no active subscription', async ({ page }) => {
    await page.route('**/api/v1/subscriptions/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      }),
    )
    await page.reload()

    await expect(page.getByText('Free').first()).toBeVisible()
  })

  // ── Expandable feature list ─────────────────────────────────────────────

  test('shows "+N more features included" button when a plan has more than 5 features', async ({ page }) => {
    await expect(page.getByRole('button', { name: '+2 more features included' })).toBeVisible()
  })

  test('does not show a toggle button for plans with 5 or fewer features', async ({ page }) => {
    // SilverCare's mock has only 2 features, well under the truncation threshold.
    const silverCareCard = page.locator('div').filter({ hasText: 'SilverCare™' }).first()
    await expect(silverCareCard.getByRole('button', { name: /more features included/i })).not.toBeVisible()
  })

  test('clicking "+N more features included" reveals the rest of that plan\'s features', async ({ page }) => {
    await expect(page.getByText('Care Navigation Support')).not.toBeVisible()

    await page.getByRole('button', { name: '+2 more features included' }).click()

    await expect(page.getByText('Care Navigation Support')).toBeVisible()
    await expect(page.getByText('3% No Claim Discount')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible()
  })

  test('clicking "Show less" collapses the list back to 5 features', async ({ page }) => {
    await page.getByRole('button', { name: '+2 more features included' }).click()
    await expect(page.getByText('Care Navigation Support')).toBeVisible()

    await page.getByRole('button', { name: 'Show less' }).click()

    await expect(page.getByText('Care Navigation Support')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '+2 more features included' })).toBeVisible()
  })

  test('expanding one plan card does not expand a different plan card', async ({ page }) => {
    // GoldCare also has more than 5 features (6 total, 1 truncated), so it
    // independently exercises the same toggle as BasicCare.
    await page.getByRole('button', { name: '+2 more features included' }).click()
    await expect(page.getByText('Care Navigation Support')).toBeVisible()

    // GoldCare's own toggle should still be in its collapsed label —
    // expanding BasicCare must not have flipped GoldCare's state too.
    await expect(page.getByRole('button', { name: '+1 more features included' })).toBeVisible()
    await expect(page.getByText('Priority Scheduling')).not.toBeVisible()
  })
})
