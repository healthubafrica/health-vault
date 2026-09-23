# Analytics Production Rollout & Rollback Plan

Spec §32 deliverable: "Production rollout and rollback plan." This is the analytics-specific delta on top of `.claude/rules/deployment.md`'s general branch/promotion/rollback process — read that first for the mechanics (staging = `development` branch, production = `master`, migration safety checklist, RDS snapshot restore). This document covers what's specifically different, safer, or riskier about rolling out and rolling back analytics changes versus any other feature.

## Why analytics rollout is lower-risk than most features, by construction

Every analytics ingestion path (`trackEvent`, `emitServerEvent`, `recordVisit`) is wrapped in a try/catch that only logs on failure — see `docs/ANALYTICS-MONITORING-RUNBOOK.md`'s guiding principle. **A broken analytics deploy cannot break booking, payment, login, or record access**, because analytics code never sits in the critical path of those flows; at worst it silently stops recording. This means the standard promotion checklist (all gates green, no destructive migrations) is sufficient for analytics changes — there is no analytics-specific pre-promotion gate beyond what already exists.

## Migrations — the one hard rule specific to this pipeline

**Every analytics-related migration in this project's history has been additive-only** (new nullable columns, new tables, new enum values) — this has been a deliberate, consistently-applied policy across every schema change described in `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md`, not an accident. Reasons specific to analytics:

- `PatientActivityEvent` is an append-only event log (spec §20) — there is no legitimate reason to ever `ALTER`/`DROP` an existing column on it, because doing so would corrupt or destroy historical rows that can never be re-derived (unlike a transactional table where the current state is what matters).
- A destructive migration here (e.g. renaming `analyticsSessionId`) would silently break every historical `AnalyticsSession` join and every dashboard query referencing the old name, with no way to detect it short of a dashboard going quiet.

**Rollout rule:** any PR touching `prisma/schema.prisma` for an analytics table must be additive-only. If a column genuinely needs to be retired, mark it deprecated in code comments and stop writing to it — never drop it in the same migration that stops using it, and only drop it in a much later, separate migration once there's confidence nothing still reads it historically.

## Rolling out a new event or filter dimension

1. Add the event name to `analytics-events.catalog.ts` **in the same PR** that starts emitting it — `trackEvent` already logs a warning for uncatalogued names specifically to catch this being forgotten (see `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §4).
2. No feature flag exists (or is needed) for gating new instrumentation — a client sending a new event name that the server doesn't yet recognize as "known" is harmless (it's still accepted, still written, still counted in dashboards that group by whatever `eventName` values exist; only the catalog-completeness warning fires). This means **client and server can roll out independently and in either order** without breaking each other — a genuine advantage of the "no backend change required to add an event" design already documented in `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §4.
3. New §J filter dimensions (a new column-based filter on `getFunnelAnalytics`) are backward-compatible by construction — an old admin frontend simply never sends the new query param, and the backend already defaults every filter to "not applied" when absent.

## Rolling back a bad analytics deploy

| What was rolled back | What happens to already-written data | Action needed |
|---|---|---|
| A dashboard query change (e.g. a wrong KPI formula) | Nothing — no data was written, only read differently. Reverting the code immediately reverts what the dashboard shows. | None beyond the standard revert-PR-and-redeploy process |
| An instrumentation change (a new/changed `analytics.track()` call) | Events already sent during the bad deploy window keep whatever shape they were sent with — rolling back the code doesn't retroactively fix already-written rows | If the bad shape is bad enough to matter (e.g. wrong `element_id` inflating a specific CTA's numbers), the affected date range's dashboard numbers for that specific metric should be treated as unreliable until cross-checked; there's no automated way to exclude just those rows short of a manual one-off query, since `isTestEvent` isn't meant for this purpose |
| An aggregation-cron logic change (a bug in `ServiceUsageDaily`/`RevenueSummary` computation) | Rows written by the buggy logic persist with wrong values until overwritten | Rolling back the code, then manually re-invoking `runDailyAggregation(forDate)` for every affected day (see `docs/ANALYTICS-MONITORING-RUNBOOK.md` failure mode 4) — safe because the upsert is idempotent, so re-running with corrected code simply overwrites the wrong values |
| A schema migration | Never roll back an applied additive migration — per the migration safety checklist above, there should be nothing destructive to undo. If a bad additive migration genuinely needs undoing (e.g. a wrongly-named column), a follow-up additive migration renaming/fixing it is safer than reverting the original, since other deployed code may already be reading/writing the column by the time rollback would run |

## Post-incident: verifying a rollback actually worked

There is no automated post-rollback verification specific to analytics today. The closest tool available is the reconciliation plan (`docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md`) once built — running it manually for the affected date range after a rollback would confirm whether the bad deploy window left any of the 6 documented event-vs-transactional pairs mismatched. Until that job exists, manual spot-checking (comparing a few known `Payment`/`Appointment` rows against their corresponding events for the affected window) is the fallback.

## What this plan deliberately relies on from the general process

- Branch model, PR gates, and the promotion checklist: `.claude/rules/git-workflow.md` and `.claude/rules/deployment.md` — unchanged for analytics work, no special exception exists or is needed.
- RDS snapshot restore for a genuinely catastrophic destructive migration: `.claude/rules/deployment.md`'s Rollback section — analytics migrations should never need this per the additive-only rule above, but the mechanism is the same one every other domain uses if it's ever needed.
