# TravelSafe™ Standalone Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TravelSafe's own 4-tier pricing (Essential/Plus/Premium/Executive), family plans, corporate section, and add-ons to the marketing site's `/services/travelsafe` page, replacing the current "included in main plans" table.

**Architecture:** A new static data file (`travelsafePlanData.ts`, mirrors the existing `planData.ts` conventions) feeds a new presentational component (`TravelSafePricing.tsx`, mirrors `PlanCards.tsx`'s structure) that renders four sub-blocks (tier cards, compare matrix, family plans, corporate + add-ons). The component replaces the old two-column "Plans" section inside `travelsafe/page.tsx`. A new Playwright e2e spec (`tests/e2e/travelsafe-pricing.spec.ts`) locks in the rendered content.

**Tech Stack:** Next.js (App Router), React, TypeScript, inline-style convention (no CSS modules/Tailwind on this site), Playwright for e2e.

## Global Constraints

- Prices are exact, in kobo (₦ × 100), per the source spec — never approximate or round:
  - Tiers: Essential ₦24,900 (2,490,000 kobo), Plus ₦39,900 (3,990,000), Premium ₦59,900 (5,990,000, MOST POPULAR), Executive ₦149,900 (14,990,000)
  - Family: Family Essential ₦89,900 (8,990,000), Family Plus ₦139,900 (13,990,000), Family Premium ₦199,900 (19,990,000), Family Executive ₦399,900 (39,990,000)
  - Additional family member: ₦20,000 (2,000,000 kobo)
  - Add-ons: Pre-Travel Medical Assessment ₦15,000; Travel Medical Certificate ₦10,000; Health Screening "From ₦50,000"; Vaccinations "Variable"; Medication Review ₦7,500; Medical Record Digitization "From ₦10,000"; Medical Translation "From ₦25,000"; Additional TeleCare ₦10,000
- No new design system: reuse existing brand colors only (`#07251C`, `#137333`, `#6DC43F`, `#B59410`, `#0E8567`, `#34E0A0`) and the existing `var(--font-manrope), sans-serif` font stack.
- No payment/backend wiring in this plan — all CTAs link to `https://portal.myvaultplus.com/register` (individual/family tiers) or `/corporate` (corporate section), matching the site's existing convention.
- `travelsafe/page.tsx`'s Hero, Features ("What You Get"), How-it-works ("How It Works"), and `<FinalCTA />` sections must remain byte-for-byte unchanged — only the "Plans" section is replaced.
- Currency formatting always goes through the existing `formatKobo()` from `src/lib/planData.ts` — never reimplemented.

---

### Task 1: Write the failing e2e test

**Files:**
- Create: `myvaultplus-web/tests/e2e/travelsafe-pricing.spec.ts`

**Interfaces:**
- Consumes: nothing (this is the first task)
- Produces: a Playwright spec that Task 4 must make pass. Uses `page.goto('/services/travelsafe')` per the existing `tests/e2e/plans-page.spec.ts` pattern (baseURL `http://localhost:3002` is already configured in `playwright.config.ts`).

- [ ] **Step 1: Write the full spec file**

```ts
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
```

- [ ] **Step 2: Run the suite to verify the new-content tests fail**

Run: `cd myvaultplus-web && npx playwright test travelsafe-pricing`
Expected: the 3 "existing sections" tests PASS (hero/title/how-it-works already exist on the page). All other tests FAIL — e.g. `TimeoutError: locator.waitFor: Timeout ... waiting for getByText('TravelSafe™ Essential')` — because none of this content exists yet.

- [ ] **Step 3: Commit**

```bash
git add myvaultplus-web/tests/e2e/travelsafe-pricing.spec.ts
git commit -m "test(travelsafe): add failing e2e spec for standalone pricing section"
```

---

### Task 2: Create the pricing data file

**Files:**
- Create: `myvaultplus-web/src/lib/travelsafePlanData.ts`

**Interfaces:**
- Consumes: `formatKobo` from `myvaultplus-web/src/lib/planData.ts` (already exists: `export function formatKobo(kobo: number): string`)
- Produces (consumed by Task 3): `TravelSafeTier`, `TravelSafeFamilyTier`, `TravelSafeAddon`, `TravelSafeCompareRow` interfaces; `TRAVELSAFE_TIERS: TravelSafeTier[]`, `TRAVELSAFE_FAMILY: TravelSafeFamilyTier[]`, `TRAVELSAFE_ADDITIONAL_MEMBER_KOBO: number`, `TRAVELSAFE_ADDONS: TravelSafeAddon[]`, `TRAVELSAFE_COMPARE_ROWS: TravelSafeCompareRow[]`.

- [ ] **Step 1: Write the file**

```ts
// Static TravelSafe™ pricing constants — independent of the main MyHealth
// Vault+™ plans in planData.ts. TravelSafe remains bundled as a feature
// inside ConciergeCare™ etc (see planData.ts PLANS); this is TravelSafe's
// own standalone pricing, shown on /services/travelsafe.

const REGISTER_URL = 'https://portal.myvaultplus.com/register'

export interface TravelSafeTier {
  slug: string
  name: string
  priceKobo: number
  bestFor: string[]
  features: string[]
  isMostPopular: boolean
  ctaLabel: string
  ctaHref: string
}

export interface TravelSafeFamilyTier {
  slug: string
  name: string
  priceKobo: number
}

export interface TravelSafeAddon {
  service: string
  priceLabel: string
}

export interface TravelSafeCompareRow {
  feature: string
  essential: string
  plus: string
  premium: string
  executive: string
}

export const TRAVELSAFE_TIERS: TravelSafeTier[] = [
  {
    slug: 'essential',
    name: 'TravelSafe™ Essential',
    priceKobo: 2_490_000,
    bestFor: ['Students', 'Vacation Travelers', 'First-time Travelers'],
    features: [
      'Travel Insurance',
      'Visa Certificate',
      'Digital Health Passport',
      'MyHealth Vault+™',
      'Emergency QR Card',
      'Medical Records',
      'Medication List',
      'Allergies',
      'Vaccination Records',
      'Emergency Contacts',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Essential',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'plus',
    name: 'TravelSafe™ Plus',
    priceKobo: 3_990_000,
    bestFor: [],
    features: [
      'Everything in Essential plus',
      'One TeleCare Consultation Before Travel',
      'One TeleCare Consultation While Abroad',
      'Family Notifications',
      'Medication Review',
      'Priority Support',
      'Secure Record Sharing',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Plus',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'premium',
    name: 'TravelSafe™ Premium',
    priceKobo: 5_990_000,
    bestFor: [],
    features: [
      'Everything in Plus plus',
      'Three TeleCare Consultations',
      'Concierge Medical Assistance',
      'Hospital Coordination',
      'Medical Navigation',
      'Second Medical Opinion',
      'Priority Physician Access',
    ],
    isMostPopular: true,
    ctaLabel: 'Choose Premium',
    ctaHref: REGISTER_URL,
  },
  {
    slug: 'executive',
    name: 'TravelSafe™ Executive',
    priceKobo: 14_990_000,
    bestFor: [],
    features: [
      'Everything in Premium plus',
      'Unlimited TeleCare',
      'Executive Concierge',
      'Dedicated Care Manager',
      'Hospital Admission Coordination',
      'VIP Medical Support',
      'Executive Wellness Monitoring',
    ],
    isMostPopular: false,
    ctaLabel: 'Choose Executive',
    ctaHref: REGISTER_URL,
  },
]

export const TRAVELSAFE_FAMILY: TravelSafeFamilyTier[] = [
  { slug: 'family-essential', name: 'Family Essential', priceKobo: 8_990_000 },
  { slug: 'family-plus', name: 'Family Plus', priceKobo: 13_990_000 },
  { slug: 'family-premium', name: 'Family Premium', priceKobo: 19_990_000 },
  { slug: 'family-executive', name: 'Family Executive', priceKobo: 39_990_000 },
]

export const TRAVELSAFE_ADDITIONAL_MEMBER_KOBO = 2_000_000

export const TRAVELSAFE_ADDONS: TravelSafeAddon[] = [
  { service: 'Pre-Travel Medical Assessment', priceLabel: '₦15,000' },
  { service: 'Travel Medical Certificate', priceLabel: '₦10,000' },
  { service: 'Health Screening', priceLabel: 'From ₦50,000' },
  { service: 'Vaccinations', priceLabel: 'Variable' },
  { service: 'Medication Review', priceLabel: '₦7,500' },
  { service: 'Medical Record Digitization', priceLabel: 'From ₦10,000' },
  { service: 'Medical Translation', priceLabel: 'From ₦25,000' },
  { service: 'Additional TeleCare', priceLabel: '₦10,000' },
]

export const TRAVELSAFE_COMPARE_ROWS: TravelSafeCompareRow[] = [
  { feature: 'Travel Insurance', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Visa Certificate', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Digital Health Passport', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Emergency QR Code', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'MyHealth Vault+™', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Medical Records', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Medication History', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Allergies', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Vaccination Records', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Emergency Contacts', essential: '✓', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'TeleCare', essential: '—', plus: '2', premium: '3', executive: 'Unlimited' },
  { feature: 'Medical Concierge', essential: '—', plus: '—', premium: '✓', executive: '✓' },
  { feature: 'Hospital Coordination', essential: '—', plus: '—', premium: '✓', executive: '✓' },
  { feature: 'Family Record Sharing', essential: '—', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Priority Support', essential: '—', plus: '✓', premium: '✓', executive: '✓' },
  { feature: 'Dedicated Care Manager', essential: '—', plus: '—', premium: '—', executive: '✓' },
  { feature: 'Unlimited TeleCare', essential: '—', plus: '—', premium: '—', executive: '✓' },
]
```

- [ ] **Step 2: Typecheck**

Run: `cd myvaultplus-web && npx tsc --noEmit --pretty false`
Expected: no errors (this file has no consumers yet, so it just needs to compile standalone).

- [ ] **Step 3: Commit**

```bash
git add myvaultplus-web/src/lib/travelsafePlanData.ts
git commit -m "feat(travelsafe): add standalone pricing data (tiers, family, addons, compare rows)"
```

---

### Task 3: Create the pricing component

**Files:**
- Create: `myvaultplus-web/src/components/TravelSafePricing.tsx`

**Interfaces:**
- Consumes: everything from Task 2 (`TRAVELSAFE_TIERS`, `TRAVELSAFE_FAMILY`, `TRAVELSAFE_ADDITIONAL_MEMBER_KOBO`, `TRAVELSAFE_ADDONS`, `TRAVELSAFE_COMPARE_ROWS` from `@/lib/travelsafePlanData`), `formatKobo` from `@/lib/planData`, `AnimatedSection`/`AnimatedCard` from `./AnimatedSection` / `./AnimatedCard` (existing components, same imports `PlanCards.tsx` uses).
- Produces (consumed by Task 4): `export default function TravelSafePricing()` — a zero-props component rendering the full pricing block.

- [ ] **Step 1: Write the component**

```tsx
'use client'
import AnimatedSection from './AnimatedSection'
import AnimatedCard from './AnimatedCard'
import { formatKobo } from '@/lib/planData'
import {
  TRAVELSAFE_TIERS,
  TRAVELSAFE_FAMILY,
  TRAVELSAFE_ADDITIONAL_MEMBER_KOBO,
  TRAVELSAFE_ADDONS,
  TRAVELSAFE_COMPARE_ROWS,
} from '@/lib/travelsafePlanData'

const TIER_THEME: Record<string, { bg: string; accent: string; badgeBg: string; badgeText: string; isDark: boolean }> = {
  essential: { bg: '#EBF5EC', accent: '#137333', badgeBg: '#137333', badgeText: '#fff', isDark: false },
  plus: { bg: '#E6F4F0', accent: '#0E8567', badgeBg: '#0E8567', badgeText: '#fff', isDark: false },
  premium: { bg: '#0C3328', accent: '#34E0A0', badgeBg: '#34E0A0', badgeText: '#0C3328', isDark: true },
  executive: { bg: '#07251C', accent: '#B59410', badgeBg: '#B59410', badgeText: '#fff', isDark: true },
}

export default function TravelSafePricing() {
  return (
    <div>
      {/* Tier cards */}
      <AnimatedSection stagger className="rg-4" style={{ alignItems: 'stretch', marginBottom: 56 }}>
        {TRAVELSAFE_TIERS.map((tier) => {
          const theme = TIER_THEME[tier.slug]
          return (
            <AnimatedCard
              key={tier.slug}
              style={{
                background: theme.bg,
                border: theme.isDark ? 'none' : `1.5px solid ${theme.accent}55`,
                borderRadius: 20,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 240,
              }}
            >
              {tier.isMostPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: theme.badgeBg,
                    color: theme.badgeText,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    padding: '5px 16px',
                    borderRadius: 100,
                    whiteSpace: 'nowrap',
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: theme.isDark ? theme.accent : '#07251C',
                  marginBottom: 6,
                  marginTop: tier.isMostPopular ? 14 : 0,
                }}
              >
                {tier.name}
              </div>

              {tier.bestFor.length > 0 && (
                <p style={{ fontSize: 12, lineHeight: 1.5, color: theme.isDark ? 'rgba(255,255,255,0.65)' : '#5A7068', margin: '0 0 16px' }}>
                  {tier.bestFor.join(', ')}
                </p>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 34, letterSpacing: '-0.03em', color: theme.isDark ? '#fff' : '#07251C' }}>
                    {formatKobo(tier.priceKobo)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: theme.isDark ? 'rgba(255,255,255,0.6)' : '#7A8C84' }}>/month</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24 }}>
                {tier.features.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: theme.isDark ? `${theme.accent}30` : `${theme.accent}20`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l4 4L19 7" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span style={{ color: theme.isDark ? 'rgba(255,255,255,0.85)' : '#27433A' }}>{item}</span>
                  </div>
                ))}
              </div>

              <a
                href={tier.ctaHref}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: theme.accent,
                  color: theme.isDark ? theme.badgeText : '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: 14,
                  borderRadius: 100,
                }}
              >
                {tier.ctaLabel}
              </a>
            </AnimatedCard>
          )
        })}
      </AnimatedSection>

      {/* Compare matrix */}
      <div style={{ marginBottom: 56 }}>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Compare TravelSafe™ Tiers
        </h3>
        <div style={{ background: '#DEDEDE', borderRadius: 28, padding: 16, overflowX: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', minWidth: 700 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#07251C' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, color: '#6DC43F', fontWeight: 600 }}>Feature</th>
                  {['Essential', 'Plus', 'Premium', 'Executive'].map((h) => (
                    <th key={h} style={{ padding: '16px 14px', textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRAVELSAFE_COMPARE_ROWS.map((row, idx) => (
                  <tr key={row.feature} style={{ background: idx % 2 === 0 ? '#fff' : '#F7FAF7', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                    <td style={{ padding: '13px 20px', fontWeight: 600, fontSize: 13.5, color: '#07251C' }}>{row.feature}</td>
                    {[row.essential, row.plus, row.premium, row.executive].map((val, vi) => (
                      <td
                        key={vi}
                        style={{
                          padding: '13px 14px',
                          textAlign: 'center',
                          fontSize: 13,
                          color: val === '✓' ? '#137333' : val === '—' ? '#C4CEC9' : '#27433A',
                          fontWeight: val === '✓' ? 700 : 500,
                        }}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Family plans */}
      <div style={{ marginBottom: 56 }}>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Family Plans
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          {TRAVELSAFE_FAMILY.map((tier) => (
            <div key={tier.slug} style={{ background: '#fff', border: '1.5px solid rgba(7,37,28,0.1)', borderRadius: 16, padding: '20px 28px', textAlign: 'center', minWidth: 180 }}>
              <div style={{ fontSize: 12, color: '#5A7068', fontWeight: 600, marginBottom: 8 }}>{tier.name}</div>
              <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 22, color: '#07251C' }}>{formatKobo(tier.priceKobo)}</div>
              <div style={{ fontSize: 12, color: '#7A8C84', marginTop: 4 }}>per month</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13.5, color: '#41584E' }}>
          Additional Family Member — {formatKobo(TRAVELSAFE_ADDITIONAL_MEMBER_KOBO)}/month
        </p>
      </div>

      {/* Corporate */}
      <div style={{ background: '#07251C', borderRadius: 28, padding: '56px 40px', textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6DC43F', marginBottom: 16 }}>
          — Corporate Travel Protection
        </div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 'clamp(24px, 3vw, 34px)', color: '#fff', margin: '0 auto 20px', maxWidth: 560, lineHeight: 1.1 }}>
          Group travel health coverage for{' '}
          <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic', color: '#6DC43F' }}>every organisation.</em>
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.65 }}>
          Suitable for SMEs, Large Enterprises, NGOs, Government Agencies, and Educational Institutions.
        </p>
        <a
          href="/corporate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#6DC43F',
            color: '#07251C',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            padding: '13px 13px 13px 28px',
            borderRadius: 100,
          }}
        >
          Request Proposal
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#07251C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 19L19 5M19 5H9M19 5v10" stroke="#6DC43F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </a>
      </div>

      {/* Add-ons */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 22, color: '#07251C', textAlign: 'center', margin: '0 0 24px' }}>
          Optional Add-On Services
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {TRAVELSAFE_ADDONS.map((item) => (
            <div
              key={item.service}
              style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, border: '1px solid rgba(7,37,28,0.07)' }}
            >
              <span style={{ fontSize: 14, color: '#27433A', fontWeight: 500 }}>{item.service}</span>
              <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 700, fontSize: 15, color: '#07251C', whiteSpace: 'nowrap' }}>{item.priceLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd myvaultplus-web && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add myvaultplus-web/src/components/TravelSafePricing.tsx
git commit -m "feat(travelsafe): add TravelSafePricing component (tiers, compare matrix, family, corporate, addons)"
```

---

### Task 4: Integrate into the TravelSafe page and verify

**Files:**
- Modify: `myvaultplus-web/src/app/services/travelsafe/page.tsx`

**Interfaces:**
- Consumes: `TravelSafePricing` default export from Task 3 (`@/components/TravelSafePricing`).
- Produces: nothing further downstream — this is the final integration task.

- [ ] **Step 1: Remove the unused `planRows` constant**

In `myvaultplus-web/src/app/services/travelsafe/page.tsx`, delete this block (currently lines 74-79):

```ts
const planRows = [
  { plan: 'Free / Starter', access: 'Add-on', highlight: false },
  { plan: 'Growth', access: '✓ Included', highlight: true },
  { plan: 'Enterprise', access: '✓ Included', highlight: true },
  { plan: 'Corporate & HMO', access: 'Custom allocation', highlight: false },
]
```

- [ ] **Step 2: Add the import**

At the top of the file, alongside the other component imports:

```tsx
import TravelSafePricing from '@/components/TravelSafePricing'
```

- [ ] **Step 3: Replace the "Plans" section**

Replace this entire block (the `{/* ── Plans ── */}` section, currently lines 183-223):

```tsx
      {/* ── Plans ── */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— Pricing</div>
              <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 16px', color: '#07251C' }}>
                Included from Growth.{' '}
                <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>Available as add-on.</em>
              </h2>
              <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
                TravelSafe™ is included in Growth, Enterprise, and Corporate plans. Starter members can activate it as a flexible add-on.
              </p>
              <a href="/plans" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#07251C', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 12px 22px', borderRadius: 100 }}>
                See All Plans
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#6DC43F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M19 5H9M19 5v10" stroke="#07251C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </a>
            </div>
            <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#07251C' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em' }}>Plan</th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em' }}>TravelSafe™</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map((row, i) => (
                    <tr key={row.plan} style={{ background: i % 2 === 0 ? '#F7FAF7' : '#fff', borderBottom: '1px solid rgba(7,37,28,0.06)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: 14, color: '#07251C' }}>{row.plan}</td>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 14, color: row.highlight ? '#137333' : '#41584E' }}>{row.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
```

With this:

```tsx
      {/* ── Pricing ── */}
      <div className="page-card" style={{ background: '#EBEBEB' }}>
        <section className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#137333', marginBottom: 14 }}>— TravelSafe™ Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: 560, color: '#07251C' }}>
              Choose your level of{' '}
              <em style={{ fontFamily: 'var(--font-manrope), sans-serif', fontStyle: 'italic' }}>travel health protection.</em>
            </h2>
            <p style={{ color: '#41584E', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              Four tiers, family plans, and corporate coverage — all built on your MyHealth Vault+™ profile.
            </p>
          </div>
          <TravelSafePricing />
        </section>
      </div>
```

- [ ] **Step 4: Typecheck**

Run: `cd myvaultplus-web && npx tsc --noEmit --pretty false`
Expected: no errors. (This also confirms `planRows` has no remaining references — a leftover reference would fail here with `Cannot find name 'planRows'`.)

- [ ] **Step 5: Run the full e2e suite to verify GREEN**

Run: `cd myvaultplus-web && npx playwright test travelsafe-pricing plans-page`
Expected: all tests in both `travelsafe-pricing.spec.ts` and the pre-existing `plans-page.spec.ts` PASS. (Running `plans-page` alongside confirms nothing on the shared `/plans` page or `planData.ts` broke.)

- [ ] **Step 6: Manual visual check**

Run: `cd myvaultplus-web && npm run dev` (starts on port 3000 by default — Playwright's own dev server runs separately on 3002 per `playwright.config.ts`, so this manual check can run concurrently)
Visit: `http://localhost:3000/services/travelsafe`
Confirm: Hero/Features/How-it-works sections look unchanged; the new Pricing section shows 4 cards with Premium's "MOST POPULAR" badge, a dark compare matrix, 4 family plan cards, the dark corporate block, and the add-ons grid — all readable, no layout overflow at 375px/768px/1440px widths.

- [ ] **Step 7: Commit**

```bash
git add myvaultplus-web/src/app/services/travelsafe/page.tsx
git commit -m "feat(travelsafe): wire standalone pricing section into TravelSafe page"
```

---

## Self-Review Notes

**Spec coverage:** Section 3 (tiers) → Task 2 data + Task 3 cards. Section 4 (compare matrix) → Task 2 `TRAVELSAFE_COMPARE_ROWS` + Task 3 table. Section 5 (family plans) → Task 2 `TRAVELSAFE_FAMILY` + Task 3 family cards. Section 6 (corporate) → Task 3 corporate block (qualitative, no pricing table in source spec). Section 7 (add-ons) → Task 2 `TRAVELSAFE_ADDONS` + Task 3 add-ons grid. All 5 in-scope sections covered.

**Type consistency:** `TravelSafeTier.slug` values (`essential`/`plus`/`premium`/`executive`) match `TIER_THEME` keys in Task 3 exactly. `formatKobo` signature (`(kobo: number) => string`) matches its existing definition in `planData.ts` — no new formatter introduced.

**No placeholders:** every step above contains complete, runnable code — no TBDs.
