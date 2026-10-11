# Analytics acceptance evidence

Scope excludes Geo-IP provider selection, credentials, database acquisition/licensing, and provider accuracy validation. All calendar reports use Africa/Lagos time.

## Automated evidence

| Requirement | Evidence |
|---|---|
| Reporting windows | `reporting-window.spec.ts` covers Lagos day boundaries and supported periods |
| Ordered registration/booking/payment/records/results/subscription journeys | `journey-metrics.spec.ts` covers ordering, conversion, abandonment, retry/error counts, paths, exits, and elapsed time |
| Activation policy | `activation-policy.spec.ts` covers ordering, configured window, version, event list, and invalid configuration |
| Cohorts | `cohort-metrics.spec.ts` covers all grouping dimensions, D1/D7/D30/D60/D90 eligibility, and second-session/action/booking medians |
| Event ingestion, identity continuity, KPI filters/calculation | `analytics.service.spec.ts` |
| Aggregation, late-event replay, durable run status, backfill | `analytics-aggregation.service.spec.ts` and aggregation utility specs |
| Reconciliation and shared boundaries | `analytics-reconciliation.service.spec.ts` |
| Mobile qualified impressions | `TrackImpression.unit.test.tsx` |
| Web/mobile event clients | each workspace's `lib/analytics/client.unit.test.ts` |
| Access control | admin analytics routes use the existing admin controller guard; lab-result authorization regression tests remain in `labs.service.spec.ts` |

## Deployed-environment acceptance matrix

For each row, preserve the raw-event query, identity/session linkage query, API response, and dashboard screenshot. Use synthetic accounts marked `isTestEvent=true` for the test run, then confirm production reports exclude them.

| Journey | Expected authoritative outcome and checks |
|---|---|
| Registration and OTP | Registration start/steps, terms/privacy, OTP requested/delivery/verification, registration complete, anonymous-to-patient linkage, activation policy |
| Appointment and payment | Slot search/impression/selection, booking start/confirmation, payment attempted and terminal result with stable payment ID, ordered funnel and reconciliation |
| Document upload | Upload start and server `upload_success`; records journey, storage dimensions without file name/content |
| Lab result | Server `result_available`, patient `result_view`, ordered result journey; no clinical result value in analytics properties |
| Subscription | Plan selection, checkout, payment attempt/outcome, ordered subscription journey and plan cohort |
| Pipeline | Scheduled run transitions to succeeded, dashboard freshness changes, replay is idempotent, forced failure is retried and displayed as failed |
| Authorization | Patient cannot access admin analytics; authorized admin can view/export; audit log records protected administrative actions where configured |

## Sign-off record

| Role | Accountable team | Status |
|---|---|---|
| Metric definitions and dashboard interpretation | Health Hub Africa Product Analytics | Pending deployed-environment acceptance |
| Pipeline, reconciliation, alerting, and release | Health Hub Africa Platform Engineering | Pending deployed-environment acceptance |
| Privacy and data minimization | Health Hub Africa Privacy/Compliance | Pending deployed-environment acceptance |
