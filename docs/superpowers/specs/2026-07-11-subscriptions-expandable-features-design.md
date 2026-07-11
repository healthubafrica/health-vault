# Subscriptions — Expandable Feature List — Design

**Date:** 2026-07-11
**Status:** Approved

## Context

The Subscriptions page (`health-hub-africa`, `components/screens/SubscriptionsScreen.tsx`) lists each plan's included features, but truncates to the first 5 with a static, non-interactive "+N more features included" line (lines 224-246). That line has never done anything when clicked — it's plain text, not a button. Patients comparing tiers can't see the full feature set without leaving the page or asking support.

## Scope

**In scope:**
- Make the "+N more features included" line on each plan card a real toggle: clicking it reveals the rest of that plan's features; clicking again ("Show less") collapses back to the first 5.
- Each plan card's expanded/collapsed state is independent — expanding GoldCare's list doesn't affect SilverCare's.
- Patient portal only (`health-hub-africa`), the `/subscriptions` page specifically.

**Out of scope:**
- `components/panels/SubscriptionsPanel.tsx` (the sidebar/dashboard panel showing the patient's own active plan) — this already renders the full feature list with no truncation, unaffected by this change.
- Any change to the underlying `features: string[]` data or the API.
- Persisting expand/collapse state across page reloads — it resets to collapsed (first 5) on every page load, matching the existing default-collapsed behavior.

## Architecture

`SubscriptionsScreen.tsx` currently renders a list of plan cards from a `plans` array (fetched from `GET /subscriptions/plans`). Each card independently renders its own `features.slice(0, 5)` block. The fix adds one piece of local state to the component that owns the plan list render loop: `const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())`, keyed by plan `id`.

For each plan card:
- `const isExpanded = expandedPlans.has(plan.id)`
- Rendered features: `isExpanded ? features : features.slice(0, 5)`
- The trailing line changes from static text to a `<button>`:
  - Collapsed, `features.length > 5`: "+{features.length - 5} more features included" — clicking calls a toggle function that adds `plan.id` to the set.
  - Expanded: "Show less" — clicking removes `plan.id` from the set.
  - `features.length <= 5`: no button rendered at all (nothing to expand), matching current behavior for short feature lists.

The toggle function is a single `toggleExpanded(planId: string)` closure using the immutable `Set` update pattern (`new Set(prev)` + add/delete), consistent with the codebase's immutability conventions.

## Error Handling

None needed — this is pure client-side UI state with no network calls, no failure modes to handle.

## Testing

- Update the existing e2e spec `health-hub-africa/tests/e2e/subscriptions-screen.spec.ts` (which already mocks `MOCK_PLANS` with short feature arrays — the mocks will need at least one plan with >5 features to exercise the truncation/expansion) with new test cases: the "+N more" button is visible when a plan has more than 5 features, clicking it reveals the rest and changes the button label to "Show less", clicking "Show less" collapses back to 5, and expanding one plan's card doesn't affect a different plan's card in the same page.
