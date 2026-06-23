# Test Automation Summary — MyHealth Vault+ v2 Membership Plans

## Generated Tests

### API Tests (Jest — NestJS)

- [x] `health-hub-africa-api/src/subscriptions/subscriptions.service.spec.ts` — Subscriptions service unit tests

**22 tests, 22 passing**

Test suites:
| Suite | Tests | Coverage |
|---|---|---|
| `findPlans` | 1 | Returns all active plans |
| `findPlan` | 2 | Happy path + 404 not found |
| `subscribe` | 9 | Monthly/quarterly/annual billing, expiry calculation, duplicate prevention, admin-on-behalf, cancel+create in transaction |
| `findMySubscription` | 3 | Active sub, no sub, admin access |
| `cancelSubscription` | 5 | Happy path, not found, wrong owner, already cancelled, admin override |

### E2E Tests (Playwright — Chromium)

- [x] `myvaultplus-web/tests/e2e/plans-page.spec.ts` — Marketing site plans page
- [x] `health-hub-africa/tests/e2e/subscriptions-screen.spec.ts` — Patient portal subscriptions screen

---

#### Marketing Site — Plans Page (`/plans`)

**23 tests, 23 passing**

| Category | Tests |
|---|---|
| Page loads | title, hero heading, CTA |
| Billing toggle | Monthly/Annual buttons visible, prices update correctly |
| Plan cards | MOST POPULAR badge, BEST VALUE badge, all 5 CTA links |
| Comparison table | All 5 column headers, TeleCare row |
| Savings Calculator | Heading, plan selector defaults to SilverCare, plan change updates price, quantity input updates result, all 4 result cards visible |
| PlanWizard | Heading, Q1 text, Individual+Nigeria→BasicCare, Family+Nigeria→SilverCare |
| Pay-per-use | TeleCare GP Consultation entry visible |
| Corporate teaser | Section visible, "Enquire About Corporate" link |

---

#### Patient Portal — Subscriptions Screen (`/subscriptions`)

**13 tests, 13 passing**

All tests use Playwright route mocking (`page.route()`) to simulate the API responses without a live backend. Auth is simulated via a fake `hha_at` cookie.

| Category | Tests |
|---|---|
| Page structure | Heading, subtitle |
| Active plan card | Plan name, status pill, Cancel button |
| Plan list | All 5 plans visible |
| Billing toggle | Monthly/Annual buttons, price update, toggle back |
| Upgrade dialog | Shows "Upgrade to…" with cancellation warning when subscribed |
| Subscribe dialog | Shows "Subscribe to…" without warning when not subscribed |
| No-subscription state | Shows "Free" label |

---

## Coverage

| Layer | Tests | Status |
|---|---|---|
| API — Subscriptions service | 22/22 | ✅ Pass |
| Marketing site — Plans page E2E | 23/23 | ✅ Pass |
| Portal — SubscriptionsScreen E2E | 13/13 | ✅ Pass |
| **Total** | **58/58** | ✅ All passing |

## How to Run

```bash
# API unit tests
cd health-hub-africa-api
npm test

# Marketing site E2E (starts dev server on port 3002)
cd myvaultplus-web
npm test

# Portal E2E (starts dev server on port 3000)
cd health-hub-africa
npm test
```

## Next Steps

- Wire API unit tests into CI (GitHub Actions) via `npm test` in the API job
- Add Playwright to CI matrix for both web apps
- Add portal E2E tests for other screens (Appointments, Records) as those features stabilise
- Increase API unit test coverage to include edge cases from `plans.service.ts` once that module is extracted
