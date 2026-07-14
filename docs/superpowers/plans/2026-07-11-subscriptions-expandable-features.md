# Subscriptions Expandable Feature List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "+N more features included" line on each Subscriptions plan card a real toggle that expands/collapses the full feature list, instead of static dead text.

**Architecture:** One piece of local `Set<string>` state on `SubscriptionsScreen`, keyed by plan id, tracks which plan cards are expanded. Each card's feature-list `<ul>` renders either the first 5 or all features depending on whether its id is in the set; the trailing line becomes a `<button>` that toggles membership.

**Tech Stack:** Next.js/React, Playwright e2e (this app has no unit-test runner — `tests/e2e/subscriptions-screen.spec.ts` is the existing test suite for this exact component).

## Global Constraints

- Patient portal (`health-hub-africa`) only, `/subscriptions` page (`components/screens/SubscriptionsScreen.tsx`) specifically.
- `components/panels/SubscriptionsPanel.tsx` is untouched — it already renders the full list unconditionally.
- Expand/collapse state is per-plan-card and does not persist across reloads (resets to collapsed on every page load).
- No change to the `features: string[]` data shape or the `GET /subscriptions/plans` API.
- Verification bar: `pnpm tsc --noEmit` clean in `health-hub-africa`, plus the updated Playwright e2e suite passing (no unit-test runner in this app).

---

### Task 1: Expandable feature list

**Files:**
- Modify: `health-hub-africa/components/screens/SubscriptionsScreen.tsx:26-30` (add state), `:224-246` (replace static line with toggle button)
- Modify: `health-hub-africa/tests/e2e/subscriptions-screen.spec.ts:13-19` (extend `BasicCare`'s mock features so it has more than 5, to exercise truncation/expansion), add new test cases

**Interfaces:**
- Produces: no new exported interfaces — this is a self-contained UI change within one component.

- [ ] **Step 1: Write the failing e2e tests**

In `health-hub-africa/tests/e2e/subscriptions-screen.spec.ts`, first extend the `BasicCare` mock plan (currently at lines 13-19) to have more than 5 features so the truncation UI actually renders. Change:

```ts
  {
    id: 'plan-basic', slug: 'basiccare', name: 'BasicCare™',
    priceKobo: 1_250_000, annualPriceKobo: 14_900_000, launchPriceKobo: 9_900_000,
    isMostPopular: false, isBestValue: false, bestFor: 'Individuals and young professionals',
    features: ['Everything in FREE', '2 TeleCare™ Consultations Annually'],
    displayOrder: 1, isActive: true,
  },
```

to:

```ts
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
```

This gives BasicCare 7 features (2 more than the 5-item truncation threshold), so "+2 more features included" will render for it. SilverCare, GoldCare, ConciergeCare, and the FREE plan keep their existing 2-feature mocks (≤5, so they never show the toggle — confirms the "no button when ≤5 features" case stays correct without needing a dedicated test).

Then add this new `test.describe` block at the end of the file, right before the final closing `})` of the outer `test.describe('SubscriptionsScreen', ...)` block (i.e. as new tests inside that same describe, after the existing `'shows "Free" plan label when no active subscription'` test):

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd health-hub-africa && npx playwright test tests/e2e/subscriptions-screen.spec.ts -g "features"`
Expected: FAIL — the 4 new tests fail because the "+2 more features included" text is not a `button` role (it's a plain `<li>`), so `getByRole('button', ...)` finds nothing, and clicking never reveals the remaining features.

- [ ] **Step 3: Implement the expand/collapse state**

In `health-hub-africa/components/screens/SubscriptionsScreen.tsx`, the component's state declarations currently read (lines 26-30):

```tsx
export function SubscriptionsScreen() {
  const { data: subRes, isInitialLoad: subLoading, error, refetch } = useApi(() => subscriptions.getMy())
  const { data: plansRes, isInitialLoad: plansLoading } = useApi(() => subscriptions.listPlans())
  const [saving, setSaving] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')
```

Change to:

```tsx
export function SubscriptionsScreen() {
  const { data: subRes, isInitialLoad: subLoading, error, refetch } = useApi(() => subscriptions.getMy())
  const { data: plansRes, isInitialLoad: plansLoading } = useApi(() => subscriptions.listPlans())
  const [saving, setSaving] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  const toggleExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const next = new Set(prev)
      if (next.has(planId)) {
        next.delete(planId)
      } else {
        next.add(planId)
      }
      return next
    })
  }
```

- [ ] **Step 4: Replace the static truncation block with a toggle**

The features block currently reads (lines 223-246):

```tsx
                  {/* Features */}
                  {features.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {features.slice(0, 5).map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={12} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)' }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li
                          className="text-xs pl-5"
                          style={{ color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'var(--color-text-faint)' }}
                        >
                          +{features.length - 5} more features included
                        </li>
                      )}
                    </ul>
                  )}
```

Replace with:

```tsx
                  {/* Features */}
                  {features.length > 0 && (
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {(expandedPlans.has(plan.id) ? features : features.slice(0, 5)).map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={12} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)' }}
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(plan.id)}
                            className="text-xs pl-5 text-left"
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.5)' : 'var(--color-text-faint)' }}
                          >
                            {expandedPlans.has(plan.id)
                              ? 'Show less'
                              : `+${features.length - 5} more features included`}
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
```

- [ ] **Step 5: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd health-hub-africa && npx playwright test tests/e2e/subscriptions-screen.spec.ts`
Expected: all tests pass (the pre-existing tests plus the 4 new ones).

- [ ] **Step 7: Commit**

```bash
git add health-hub-africa/components/screens/SubscriptionsScreen.tsx health-hub-africa/tests/e2e/subscriptions-screen.spec.ts
git commit -m "feat(subscriptions): make plan card feature list expandable"
```
