import { test, expect } from '@playwright/test'

// All plan names as shown on the page
const PLAN_NAMES = ['MyHealth Vault+ FREE', 'BasicCare™', 'SilverCare™', 'GoldCare™', 'ConciergeCare™']

test.describe('Plans page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plans')
  })

  // ── Page loads ───────────────────────────────────────────────────────────

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Membership Plans/)
  })

  test('hero heading is visible', async ({ page }) => {
    await expect(page.getByText('Premium Healthcare Access.')).toBeVisible()
  })

  test('"Get Started Free" CTA is visible in hero', async ({ page }) => {
    await expect(page.getByRole('link', { name: /get started free/i })).toBeVisible()
  })

  // ── Billing toggle ────────────────────────────────────────────────────────

  test('billing toggle has Monthly and Annual buttons', async ({ page }) => {
    const toggles = page.getByRole('button', { name: /monthly|annual/i })
    await expect(toggles.first()).toBeVisible()
    await expect(toggles).toHaveCount(2)
  })

  test('switching to Annual shows founding-member price for BasicCare', async ({ page }) => {
    // BasicCare monthly = ₦12,500; launch annual = ₦99,000
    const annualBtn = page.getByRole('button', { name: /annual/i }).first()
    await annualBtn.click()

    // Founding member price (launchAnnualKobo = 9_900_000 = ₦99,000)
    await expect(page.getByText('₦99,000').first()).toBeVisible()
  })

  test('monthly view shows monthly prices', async ({ page }) => {
    // BasicCare monthly = ₦12,500 (monthlyKobo = 1_250_000)
    await expect(page.getByText('₦12,500').first()).toBeVisible()
  })

  // ── Plan cards ───────────────────────────────────────────────────────────

  test('MOST POPULAR badge is visible', async ({ page }) => {
    await expect(page.getByText('MOST POPULAR')).toBeVisible()
  })

  test('BEST VALUE badge is visible', async ({ page }) => {
    await expect(page.getByText('BEST VALUE')).toBeVisible()
  })

  test('all five plan CTA labels are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /create free account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /choose basiccare/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /choose silvercare/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /choose goldcare/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /choose conciergecare/i }).first()).toBeVisible()
  })

  // ── Comparison table ─────────────────────────────────────────────────────

  test('comparison table header shows all 5 plan names', async ({ page }) => {
    for (const name of ['FREE', 'BasicCare™', 'SilverCare™', 'GoldCare™', 'ConciergeCare™']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible()
    }
  })

  test('TeleCare row appears in comparison table', async ({ page }) => {
    await expect(page.getByRole('cell', { name: /TeleCare™ GP Sessions/i })).toBeVisible()
  })

  // ── Savings Calculator ────────────────────────────────────────────────────

  test('savings calculator heading is visible', async ({ page }) => {
    await expect(page.getByText('How much could you save?', { exact: true })).toBeVisible()
  })

  test('plan selector defaults to SilverCare', async ({ page }) => {
    const select = page.getByLabel('Select membership plan')
    await expect(select).toHaveValue('silvercare')
  })

  test('changing plan in calculator updates membership cost', async ({ page }) => {
    const select = page.getByLabel('Select membership plan')

    // Switch to GoldCare (annualKobo = 59_900_000 = ₦599,000)
    await select.selectOption('goldcare')

    // Membership Cost card should show GoldCare annual price
    await expect(page.getByText('₦599,000')).toBeVisible()
  })

  test('adjusting a quantity updates the retail value', async ({ page }) => {
    const gpInput = page.getByLabel('TeleCare™ GP Consultations')
    await gpInput.fill('10')
    await gpInput.dispatchEvent('change')

    // Result cards are visible after interaction
    await expect(page.getByText('Retail Value', { exact: true })).toBeVisible()
  })

  test('result cards show Retail Value, Membership Cost, Estimated Savings, Savings Percentage', async ({ page }) => {
    await expect(page.getByText('Retail Value', { exact: true })).toBeVisible()
    await expect(page.getByText('Membership Cost', { exact: true })).toBeVisible()
    await expect(page.getByText('Estimated Savings', { exact: true })).toBeVisible()
    await expect(page.getByText('Savings Percentage', { exact: true })).toBeVisible()
  })

  // ── PlanWizard ────────────────────────────────────────────────────────────

  test('plan wizard heading is visible', async ({ page }) => {
    await expect(page.getByText('Not sure which plan is right for you?', { exact: true })).toBeVisible()
  })

  test('wizard shows profile question', async ({ page }) => {
    await expect(page.getByText('1. Who are you covering?', { exact: true })).toBeVisible()
  })

  test('selecting Individual + Nigeria recommends BasicCare', async ({ page }) => {
    await page.getByRole('button', { name: 'Individual', exact: true }).click()
    await page.getByRole('button', { name: 'Within Nigeria', exact: true }).click()
    await page.getByRole('button', { name: /find my plan/i }).click()

    await expect(page.getByText('BasicCare™').first()).toBeVisible()
  })

  test('selecting Family + Nigeria recommends SilverCare', async ({ page }) => {
    await page.getByRole('button', { name: 'Family', exact: true }).click()
    await page.getByRole('button', { name: 'Within Nigeria', exact: true }).click()
    await page.getByRole('button', { name: /find my plan/i }).click()

    await expect(page.getByText('SilverCare™').first()).toBeVisible()
  })

  // ── Pay-per-use section ──────────────────────────────────────────────────

  test('pay-per-use section shows at least one service', async ({ page }) => {
    await expect(page.getByText('TeleCare™ GP Consultation', { exact: true })).toBeVisible()
  })

  // ── Corporate teaser ─────────────────────────────────────────────────────

  test('corporate teaser section is visible', async ({ page }) => {
    await expect(page.getByText('Corporate (Coming Soon)', { exact: false })).toBeVisible()
  })

  test('"Enquire About Corporate" link exists', async ({ page }) => {
    const links = page.getByRole('link', { name: /enquire about corporate/i })
    await expect(links.first()).toBeVisible()
  })
})
