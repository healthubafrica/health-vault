# Data Reconciliation Plan

Spec §32 deliverable: "Data reconciliation plan," and the corresponding line item in spec §25 ("Reconciliation job compares critical portal outcomes to transactional source records"). **This is a plan, not an implementation** — `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §8 already confirmed no reconciliation job exists in the codebase today. This document specifies what such a job should actually check, at what cadence, and with what response — so building it later is a scoping exercise, not a research project.

## Why this matters here specifically

Every "critical outcome" event in this pipeline has a **dual-write risk**: a client-side beacon (`ui_click`-adjacent funnel events like `checkout_started`) can be dropped by a closed tab or a flaky network, while the transactional row it's supposed to correspond to (a `Payment`, an `Appointment`) is written directly by the API and is authoritative by construction. Spec §23 already pushed the most consequential outcomes to server-authoritative emission (`emitServerEvent`) for exactly this reason — but server-authoritative emission and the transactional write are still two separate `INSERT`s in two different code paths, not one atomic transaction, so they *can* drift (a crash between the two, a bug in one path but not the other, a manual DB fix to one side only). Reconciliation is the check that they haven't.

## Scope — which pairs to reconcile

| # | Analytics side | Transactional source | Match key | Notes |
|---|---|---|---|---|
| 1 | `payment_success` events (`ingestionSource: 'server'`) | `Payment` rows with `status: 'paid'` | Count in the same UTC day window | The authoritative pair — `PaymentsService.handleChargeSuccess` emits the event and updates the row from the same webhook handler, so any drift here means that handler itself is failing partway through, not a client-beacon problem |
| 2 | `payment_failure` events (`ingestionSource: 'server'`) | `Payment` rows with a failed/declined status | Count in the same window | Same source method as #1 |
| 3 | `booking_confirmed` events (`ingestionSource: 'server'`) | `Appointment` rows created via `AppointmentsService.create` | Count in the same window | |
| 4 | `registration_complete` events | `User`/`Patient` rows created (excluding admin-created and OpenEMR-synced patients, which never fire this event) | Count in the same window | Client-only today (spec §23 flags this as still-deferred to server-side — see `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §4) — reconciliation here is partly *validating that deferral is still acceptable*, not just catching drift |
| 5 | `RevenueSummary.netRevenueKobo` (aggregate) | `sum(Payment.amountKobo)` for `status: 'paid'` rows in the same `reportDate` | Amount, not count | Aggregate-vs-source, not event-vs-source — checks `AnalyticsAggregationService.aggregateRevenue`'s own math, not the client pipeline |
| 6 | `ServiceUsageDaily.completedCount` per `serviceType` (aggregate) | `Appointment` rows with a completed status for that `serviceType` in the same `reportDate` | Count | Same aggregate-vs-source category as #5 |

**Deliberately out of scope for a first version:** `otp_verify_success`, `dispatch_request_success`, `telecare_session_join_success`, and every purely-client-emitted funnel event (`booking_started`, `checkout_started`, etc.) — these either have no single authoritative transactional counterpart to compare against, or (per spec §20's own framing) are expected to undercount relative to the true user action since a closed tab genuinely does lose them. Reconciling those would produce permanent, uninformative "drift" rather than catching real bugs. Start with the pairs that have exactly one correct answer.

## Method

For each pair above, for a given UTC day:

1. Count (or sum) the analytics side.
2. Count (or sum) the transactional side, filtered to `isTestEvent`-equivalent exclusion (staging/synthetic Payment/Appointment rows — see whatever test-account marking those tables already use, e.g. a known staging user ID range).
3. Compute `abs(analytics - transactional)` and `abs(analytics - transactional) / max(transactional, 1)`.
4. **Exact-match pairs (#1–#4, event-vs-source):** any non-zero absolute difference is a finding — these are meant to agree exactly, not approximately. Log every mismatched day with both counts.
5. **Aggregate-vs-source pairs (#5–#6):** these should also match exactly, since both sides read from the same `Payment`/`Appointment` tables — a mismatch here indicates a bug in the aggregation SQL/logic itself (e.g. a status-filter mismatch), not event-pipeline drift.

## Cadence and timing

Run once daily, **after** `AnalyticsAggregationService.runDailyAggregation()` completes (it runs at 01:15 UTC) — the reconciliation job depends on that day's aggregates existing for checks #5–#6, and depends on the raw event/transactional tables having settled for #1–#4 (same reasoning `runDailyAggregation` itself uses for aggregating "yesterday" rather than "today": late-night activity needs time to land). A reasonable schedule is `30 2 * * *` (02:30 UTC), 75 minutes after the aggregation cron.

## Response when a mismatch is found

- **Log the finding** with both counts, the day, and the specific pair — at minimum, this makes drift *visible* even before any alerting exists, which is strictly better than today's silence.
- **Do not auto-correct.** A reconciliation job's job is to detect and surface, not to guess which side is right and silently rewrite the other. If `payment_success` events undercount `Payment.status: 'paid'` rows, that's a real gap in `emitServerEvent` firing (or a crash between the two writes) that needs a person to look at the actual failed case, not a script papering over it.
- **Threshold for escalation:** any exact-match pair (#1–#4) mismatching by more than a small buffer (recommend: 1 row, or 0.5% of that day's volume, whichever is larger — a single-row mismatch is expected from race conditions right at a day boundary, more than that is a real bug) should raise an `AdminAlert`, following the exact same pattern `AlertsService` already uses for spec §29's security rules (see `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` and the alert rules in `alerts.service.ts`) — reusing that existing alert delivery mechanism rather than inventing a new one.
- **A dashboard indicator**, per spec §25's "data freshness timestamp" requirement (also flagged as missing in `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §7): once a reconciliation job exists, its last-run timestamp and pass/fail status for each pair is exactly the kind of freshness signal that section calls for — building the two together is more efficient than building them separately later.

## What this plan deliberately does not attempt

- **No automatic backfill/correction** when a mismatch is found (see above).
- **No reconciliation against OpenEMR** or any other external system — this plan is scoped to internal analytics-vs-transactional consistency within `health-hub-africa-api`'s own Postgres database, not cross-system sync (that's `docs/PATIENT-ID-RECONCILIATION-REPORT.md`'s domain, a separate and already-existing effort for a different kind of drift).
- **No real-time reconciliation** — daily batch, matching the cadence of the aggregation layer it depends on. A payment that fails to reconcile is caught the next morning, not the next minute; that's an acceptable latency for a data-quality check, not for fraud/security response (which spec §29's alert rules already cover on their own, faster cadence).
