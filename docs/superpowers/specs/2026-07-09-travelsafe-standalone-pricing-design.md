# TravelSafe™ Standalone Pricing Section — Design

**Date:** 2026-07-09
**Status:** Approved
**Source spec:** `Health-Hub Africa TravelSafe Pricing Page.md` (user-provided, sections 3–7 in scope)

## Context

TravelSafe™ currently exists in two places:

1. **Patient portal** (`health-hub-africa`) — a lightweight trip-organizer feature (`TravelSafeScreen`, `TravelSafeTrip` model) bundled into the main MyHealth Vault+ plans. This stays exactly as-is; out of scope.
2. **Marketing site** (`myvaultplus-web`) — `/services/travelsafe`, a feature page whose "pricing" section is just a table saying "included in Growth/Enterprise/Corporate plans."

TravelSafe remains bundled under the main plans (notably ConciergeCare™, which already lists "TravelSafe™ Global" as a feature) — that relationship is untouched. This work adds a **second, independent pricing structure**: TravelSafe's own 4-tier pricing, shown on the TravelSafe marketing page, for when TravelSafe is evaluated/purchased as its own product line rather than accessed via a bundled plan.

This is a **content/display feature only** — no payment processing, no new backend models, no enrollment flow. CTAs link to existing signup/contact destinations exactly as other marketing pages already do.

## Scope

**In scope** (spec sections 3–7):
- Section 3: 4 individual pricing tiers (Essential, Plus, Premium, Executive)
- Section 4: Compare-plans matrix across the 4 tiers
- Section 5: Family plan pricing (4 tiers + additional-member rate)
- Section 6: Corporate plans teaser section
- Section 7: Add-on services pricing table

**Out of scope** (explicitly deferred, not silently dropped):
- Section 8 (traditional-insurance-vs-TravelSafe comparison), Section 9 (FAQ accordion), Section 10 (separate final CTA) — the existing page's Final CTA section is kept as-is instead
- Section 11 (full enrollment journey), Section 12 (quote calculator — spec marks this "Phase 2" itself), Section 13 (referral tracking), Section 14 (payment gateway activation), Section 15 (customer dashboard) — these are backend/product features, not pricing-page display
- Sections 16–20 (responsiveness targets, design system, analytics, future enhancements, deliverables checklist) — these are project-management framing, not implementation content; the existing site's responsive/analytics setup already applies

## Data Layer

New file: `myvaultplus-web/src/lib/travelsafePlanData.ts`

Follows `planData.ts` conventions exactly: kobo-denominated prices, reuses the existing `formatKobo()` helper (imported, not duplicated).

```ts
export interface TravelSafeTier {
  slug: string
  name: string           // "TravelSafe™ Essential"
  priceKobo: number       // monthly price in kobo
  bestFor: string[]       // recommended-for bullet list
  features: string[]      // "Everything in X plus" is baked into the first feature string where applicable
  isMostPopular: boolean
  ctaLabel: string
  ctaHref: string
}

export interface TravelSafeFamilyTier {
  slug: string
  name: string            // "Family Essential"
  priceKobo: number
}

export interface TravelSafeAddon {
  service: string
  priceLabel: string       // pre-formatted: handles "From ₦50,000" and "Variable" cases that a plain kobo number can't express
}

export interface TravelSafeCompareRow {
  feature: string
  essential: string
  plus: string
  premium: string
  executive: string
}
```

**Exact values (from source spec, kobo = ₦ × 100):**

`TRAVELSAFE_TIERS`:
| slug | name | priceKobo | bestFor | isMostPopular | ctaLabel |
|---|---|---|---|---|---|
| essential | TravelSafe™ Essential | 2_490_000 (₦24,900) | Students, Vacation Travelers, First-time Travelers | false | Choose Essential |
| plus | TravelSafe™ Plus | 3_990_000 (₦39,900) | — | false | Choose Plus |
| premium | TravelSafe™ Premium | 5_990_000 (₦59,900) | — | **true** | Choose Premium |
| executive | TravelSafe™ Executive | 14_990_000 (₦149,900) | — | false | Choose Executive |

Features per tier (verbatim from spec, cumulative "Everything in X plus" phrasing preserved as the first list item for Plus/Premium/Executive):

- **Essential**: Travel Insurance; Visa Certificate; Digital Health Passport; MyHealth Vault+™; Emergency QR Card; Medical Records; Medication List; Allergies; Vaccination Records; Emergency Contacts
- **Plus**: Everything in Essential plus — One TeleCare Consultation Before Travel; One TeleCare Consultation While Abroad; Family Notifications; Medication Review; Priority Support; Secure Record Sharing
- **Premium**: Everything in Plus plus — Three TeleCare Consultations; Concierge Medical Assistance; Hospital Coordination; Medical Navigation; Second Medical Opinion; Priority Physician Access
- **Executive**: Everything in Premium plus — Unlimited TeleCare; Executive Concierge; Dedicated Care Manager; Hospital Admission Coordination; VIP Medical Support; Executive Wellness Monitoring

`TRAVELSAFE_FAMILY`:
| name | priceKobo |
|---|---|
| Family Essential | 8_990_000 (₦89,900) |
| Family Plus | 13_990_000 (₦139,900) |
| Family Premium | 19_990_000 (₦199,900) |
| Family Executive | 39_990_000 (₦399,900) |

Plus a standalone note: "Additional Family Member — ₦20,000" (2_000_000 kobo), displayed under the family card grid, not as a 5th card.

`TRAVELSAFE_ADDONS` (priceLabel is a pre-formatted string since two rows aren't flat numbers):
| service | priceLabel |
|---|---|
| Pre-Travel Medical Assessment | ₦15,000 |
| Travel Medical Certificate | ₦10,000 |
| Health Screening | From ₦50,000 |
| Vaccinations | Variable |
| Medication Review | ₦7,500 |
| Medical Record Digitization | From ₦10,000 |
| Medical Translation | From ₦25,000 |
| Additional TeleCare | ₦10,000 |

`TRAVELSAFE_COMPARE_ROWS` — one row per feature, columns essential/plus/premium/executive, values derived directly from each tier's feature list (✓ where included, — where not, or a specific count e.g. "3" for Premium's TeleCare consultations, "Unlimited" for Executive). Exact row list: Travel Insurance, Visa Certificate, Digital Health Passport, Emergency QR Code, MyHealth Vault™, Medical Records, Medication History, Allergies, Vaccination Records, Emergency Contacts, TeleCare, Medical Concierge, Hospital Coordination, Family Record Sharing, Priority Support, Dedicated Care Manager, Unlimited TeleCare.

Corporate section has no new data file entries — it reuses the same static content pattern as the existing `/plans` corporate teaser (heading + "suitable for" list + CTA to `/corporate`), since the spec's corporate section (Section 6) has no numeric pricing table, only a qualitative "suitable for" list + Request Proposal CTA.

## Component

New file: `myvaultplus-web/src/components/TravelSafePricing.tsx` — `'use client'` component (required: it uses `AnimatedSection`/`AnimatedCard`, which are themselves client components, same as `PlanCards.tsx`).

Renders four sub-blocks in order, each using `AnimatedSection`/`AnimatedCard` for consistency with the rest of the site:

1. **Tier cards** (reuses the `PLAN_THEME`-style per-slug color mapping pattern from `PlanCards.tsx`, but with TravelSafe's own palette so the section reads as a distinct product, not a reskin of the main plans grid). 4-column grid using the existing `.rg-4` CSS class (`globals.css`, already responsive: 4→2→1 columns across breakpoints), "MOST POPULAR" badge on Premium using the exact badge markup/position from `PlanCards.tsx`.
2. **Compare matrix** — exact visual pattern as `/plans`' compare table: `#07251C` header row, alternating `#fff`/`#F7FAF7` row backgrounds, ✓ styled green/bold, — styled muted, horizontal scroll wrapper for mobile (`overflowX: 'auto'`, `minWidth` on inner table) — copied structurally from `app/plans/page.tsx` lines ~82–103.
3. **Family plans** — horizontal card row (not full pricing cards — compact, name + price only, per spec Section 5 "Display as horizontal cards"), plus the additional-member note below the row.
4. **Corporate + add-ons** — corporate block styled like the existing dark corporate teaser (`#07251C` background, kicker, heading, "suitable for" list, "Request Proposal" CTA to `/corporate`); add-ons rendered as the same flex-grid "service — price" row pattern used for `PAY_PER_USE` on `/plans` (`display: grid, gridTemplateColumns: repeat(auto-fill, minmax(300px,1fr))`).

## Page Integration

In `myvaultplus-web/src/app/services/travelsafe/page.tsx`:

- Remove the current "Plans" section (existing lines 183–223: the `planRows` array, its inline definition, and the two-column layout+table JSX).
- Remove the now-unused `planRows` constant.
- In its place, add a section with the same `page-card` wrapper convention (background `#EBEBEB`, matching what's being replaced) containing a standard section header (kicker: "— TravelSafe™ Pricing", heading following the site's `<em>`-italic-accent pattern, e.g. "Choose your level of *travel health protection.*") followed by `<TravelSafePricing />`.
- Hero, Features ("What You Get"), How-it-works ("How It Works"), and `<FinalCTA />` are untouched — no reordering, no content changes.

## Styling Notes

- All copy, colors, and spacing follow the existing `myvaultplus-web` inline-style convention already used throughout `travelsafe/page.tsx` and `plans/page.tsx` (Manrope for headings, `#07251C`/`#137333`/`#6DC43F` brand palette, `page-card`/`section-inner` CSS classes) — no new design system introduced.
- Screenshot styling reference (the `/plans` PlanCards grid) is a *visual* reference for card shape, badge treatment, and checkmark bullets — not a data/copy reference. TravelSafe pricing content is entirely its own per this spec.
- Currency formatting reuses `formatKobo()` from `planData.ts` (imported into `travelsafePlanData.ts` or directly into the component) rather than duplicating the formatter.

## Testing / Verification

No backend changes, so no API tests. Verification is visual + typecheck:
- `npx tsc --noEmit` clean in `myvaultplus-web`
- Manual browser check at `/services/travelsafe`: all 4 tiers render with correct prices/features, Premium shows "MOST POPULAR", compare matrix scrolls horizontally on narrow viewports, family cards render, corporate/add-ons section renders, all CTA links point to the correct destinations, Hero/Features/How-it-works/FinalCTA sections are unchanged.
