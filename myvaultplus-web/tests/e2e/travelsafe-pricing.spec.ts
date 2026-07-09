import { test, expect } from '@playwright/test'

test.describe('TravelSafe pricing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services/travelsafe')
  })

  // ── Existing sections still render (baseline, should pass immediately) ───

  test('page title is still correct', async ({ page }) => {
    await expect(page).toHaveTitle(/TravelSafe/)
  })

  test('hero heading is still visible', async ({ page }) => {
    await expect(page.getByText('Travel Prepared.')).toBeVisible()
  })

  test('How It Works section is still present', async ({ page }) => {
    await expect(page.getByText('How It Works', { exact: false })).toBeVisible()
  })

  // ── Tier cards ────────────────────────────────────────────────────────────

  test('pricing section heading is visible', async ({ page }) => {
    await expect(page.getByText('TravelSafe™ Pricing', { exact: false })).toBeVisible()
  })

  test('all four tier names are visible', async ({ page }) => {
    await expect(page.getByText('TravelSafe™ Essential')).toBeVisible()
    await expect(page.getByText('TravelSafe™ Plus')).toBeVisible()
    await expect(page.getByText('TravelSafe™ Premium')).toBeVisible()
    await expect(page.getByText('TravelSafe™ Executive')).toBeVisible()
  })

  test('all four tier prices are visible', async ({ page }) => {
    await expect(page.getByText('₦24,900')).toBeVisible()
    await expect(page.getByText('₦39,900')).toBeVisible()
    await expect(page.getByText('₦59,900')).toBeVisible()
    await expect(page.getByText('₦149,900')).toBeVisible()
  })

  test('MOST POPULAR badge is visible on Premium', async ({ page }) => {
    await expect(page.getByText('MOST POPULAR')).toBeVisible()
  })

  test('all four tier CTA links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /choose essential/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /choose plus/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /choose premium/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /choose executive/i })).toBeVisible()
  })

  // ── Compare matrix ──────────────────────────────────────────────────────

  test('compare matrix header shows all 4 tier names', async ({ page }) => {
    for (const name of ['Essential', 'Plus', 'Premium', 'Executive']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible()
    }
  })

  test('Travel Insurance row appears in compare matrix', async ({ page }) => {
    await expect(page.getByRole('cell', { name: 'Travel Insurance' })).toBeVisible()
  })

  // ── Family plans ─────────────────────────────────────────────────────────

  test('family plans heading is visible', async ({ page }) => {
    await expect(page.getByText('Family Plans', { exact: true })).toBeVisible()
  })

  test('all four family tier prices are visible', async ({ page }) => {
    await expect(page.getByText('₦89,900')).toBeVisible()
    await expect(page.getByText('₦139,900')).toBeVisible()
    await expect(page.getByText('₦199,900')).toBeVisible()
    await expect(page.getByText('₦399,900')).toBeVisible()
  })

  test('additional family member note is visible', async ({ page }) => {
    await expect(page.getByText(/Additional Family Member/i)).toBeVisible()
  })

  // ── Corporate ────────────────────────────────────────────────────────────

  test('corporate section heading is visible', async ({ page }) => {
    await expect(page.getByText('Corporate Travel Protection', { exact: false })).toBeVisible()
  })

  test('"Request Proposal" CTA is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /request proposal/i })).toBeVisible()
  })

  // ── Add-ons ──────────────────────────────────────────────────────────────

  test('add-ons heading is visible', async ({ page }) => {
    await expect(page.getByText('Optional Add-On Services', { exact: true })).toBeVisible()
  })

  test('Pre-Travel Medical Assessment add-on is visible', async ({ page }) => {
    await expect(page.getByText('Pre-Travel Medical Assessment', { exact: true })).toBeVisible()
  })
})
