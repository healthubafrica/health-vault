# Analytics KPI Dictionary

Spec §32 deliverable: "KPI Dictionary with formulas." Covers every KPI named in spec §26 ("KPI Definitions — Minimum Required"), plus two related scored metrics (Engagement Score, §17) that aren't in §26's list but are commonly asked about alongside it. For each KPI, §26 requires numerator, denominator, exclusions, timestamp basis, dimensions, refresh interval, owner and version — this doc gives all of those, grounded directly in the current `AnalyticsService` implementation, not aspirational. Update it when the formulas change; it will drift otherwise.

**Owner:** unassigned — the spec requires every KPI to have a named owner; this is an organizational decision, not something inferable from code. Fill in per-KPI as ownership is assigned.

**Global exclusion (applies to every KPI below unless noted):** rows with `is_test_event = true` are excluded via `AnalyticsService.PRODUCTION_EVENT_FILTER` (`{ isTestEvent: false }`). See spec §20/§30 ("Test exclusion"). One method (`getClickstreamAnalytics`, backing CTA CTR) was missing this filter until this doc's companion PR — flagged and fixed rather than documented as a known gap.

**Global timestamp basis:** all funnel/KPI queries filter on `PatientActivityEvent.occurredAt` (the event's original occurrence time), not `receivedAt` (server ingestion time) or `createdAt` (DB row creation time) — so a delayed/retried delivery doesn't shift which reporting window an event counts toward.

**Global refresh interval:** every KPI below is computed **live, per API request** — there is no pre-aggregation or caching layer for these numbers. The one exception is the `ServiceUsageDaily`/`RevenueSummary` tables (spec §25 aggregation, see `AnalyticsAggregationService`), which are written once daily at 01:15 UTC by a cron job and back the Usage/Revenue charts — not any KPI in this dictionary.

---

## 1. Registration Conversion

| | |
|---|---|
| **Spec formula** | `registration_complete` unique users ÷ `registration_start` unique users |
| **Status** | **Not implemented — not currently buildable.** |
| **Why** | `registration_start` is catalogued (`analytics-events.catalog.ts`) as a planned event but nothing in the web or mobile client ever emits it — there is no "landing on the registration form" instrumentation point today, only `registration_complete` (server-authoritative, fired on account creation). Computing this KPI today would silently divide by an empty/undefined denominator or require fabricating the missing numerator population. |
| **To close this gap** | Instrument `registration_start` client-side (web `OnboardingScreen.tsx` step 1 mount, mobile signup screen mount), then this becomes a direct unique-user ratio exactly like OTP Verification Rate below. |

## 2. OTP Verification Rate

| | |
|---|---|
| **Numerator** | Unique users (patientId, or `anon:<anonymousVisitorId>` when no patientId) who fired `otp_verify_success` |
| **Denominator** | Unique users who fired `otp_requested` |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` (not 0) when denominator is 0 |
| **Exclusions** | Global (`isTestEvent: false`) |
| **Timestamp basis** | `occurredAt`, scoped to the funnel's `period` window (default 30d) |
| **Dimensions** | Every spec §J filter (country, continent, device, os, browser, featureArea, timezone, ageBand, planTier, gender, nationality, acquisitionSource, utmCampaign, lifecycleStage), plus optional date-range comparison (`compare=true`) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 (no versioning scheme on individual `KPI_DEFINITIONS` entries — see Engagement Score/Retention below for the two KPIs that do carry an explicit version number) |
| **Implementation** | `AnalyticsService.KPI_DEFINITIONS` entry `otpVerificationRate`, computed in `getFunnelAnalytics` / exposed via `GET /admin/analytics/funnel` |

## 3. Activation Rate

| | |
|---|---|
| **Numerator** | Unique patients who fired `registration_complete` **and** at least one of `ACTIVATION_QUALIFYING_EVENTS` (`booking_confirmed`, `payment_success`, `upload_success`, `manual_entry_success`, `ticket_created`) |
| **Denominator** | Unique patients who fired `registration_complete` |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` when denominator is 0 |
| **Exclusions** | Global. Anonymous events excluded from both numerator and denominator — there is no patient to attribute activation to. |
| **Timestamp basis** | `occurredAt`, scoped to the funnel's `period` window. **Known simplification** (documented in code): both the registration and the qualifying action must fall within the *same* reporting window — this is not a true "ever activated after registering" measure. A correct unbounded version needs per-user registration timestamps carried forward across periods, which nothing in this pipeline tracks today. |
| **Dimensions** | Same as OTP Verification Rate |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `activationKpi` block inside `getFunnelAnalytics`; also broken out per-country inside `getGeoMapAnalytics` (`activationRate` field, same `ACTIVATION_QUALIFYING_EVENTS` list, same "within-window" simplification) |

## 4. MAU (Monthly Active Users)

| | |
|---|---|
| **Numerator / value** | Count of distinct patients with at least one `ACTIVATION_QUALIFYING_EVENTS` event in the window (this is a single count, not a ratio) |
| **Exclusions** | Global. Anonymous visitors excluded — MAU is a patient-level metric. |
| **Timestamp basis** | `occurredAt`, over a **fixed rolling 30-day window ending now** — this is deliberately **not** the dashboard's period selector (`7d`/`30d`/`90d`), per the spec's own wording ("rolling/configured 30-day period"). Same fixed-window convention `RETENTION_WINDOWS` already uses for D30/D60/D90. |
| **Dimensions** | None currently — a single headline number, not filterable by §J dimensions yet |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getCoreKpis` → `GET /admin/analytics/core-kpis`, `mau` field |

## 5. Clicks per Session

| | |
|---|---|
| **Numerator** | `sum(AnalyticsSession.clickCount)` across engaged sessions in the period |
| **Denominator** | Count of engaged sessions in the period |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` when there are no engaged sessions |
| **Exclusions** | Global (`isTestEvent: false` on `AnalyticsSession`), **and** scoped to `engaged: true` sessions only — a bounce (session with no meaningful activity, per spec §7's `engaged_session` definition) is excluded from the denominator rather than dragging the average toward zero |
| **Timestamp basis** | `AnalyticsSession.startedAt`, scoped to the dashboard's `period` selector |
| **Dimensions** | None currently |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getCoreKpis` → `GET /admin/analytics/core-kpis`, `clicksPerSession` field |

## 6. Feature Adoption

| | |
|---|---|
| **Numerator (per feature)** | Unique patients tagged with that `featureArea` on an event, **intersected with** the eligible-active-patient population below — a patient who merely touched a feature but did nothing else qualifying in the period does not count |
| **Denominator** | Unique patients with at least one `ACTIVATION_QUALIFYING_EVENTS` event in the period (the same "eligible active patient" population MAU uses, but scoped to the requested `period`, not MAU's fixed 30-day window) |
| **Formula** | `numerator ÷ denominator` per `featureArea`, rounded to 1 decimal place; `null` when there are no eligible active patients |
| **Exclusions** | Global. Events with no `featureArea` set are excluded from the numerator entirely — see the §J filter breakdown (#155) for which event producers currently set this column. |
| **Timestamp basis** | `occurredAt`, scoped to the dashboard's `period` selector |
| **Dimensions** | Broken out by `featureArea` (one row per feature observed) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getCoreKpis` → `GET /admin/analytics/core-kpis`, `featureAdoption` array |

## 7. CTA CTR (Click-Through Rate)

| | |
|---|---|
| **Numerator** | Unique users (patientId or anonymous visitor) who fired `ui_click` for a given `elementId` |
| **Denominator** | Unique users who fired `cta_impression` for the same `elementId` (requires `<TrackImpression>` wiring — see the Clickstream Instrumentation Map for coverage) |
| **Formula** | `numerator ÷ denominator` per `elementId`, rounded to 1 decimal place; `null` when the element has never been impressed |
| **Exclusions** | Global. **This was a real gap**: `getClickstreamAnalytics` did not spread `PRODUCTION_EVENT_FILTER` until this doc's companion fix — staging/synthetic traffic was inflating CTA CTR numbers in violation of spec §20/§30's test-exclusion requirement. |
| **Timestamp basis** | `occurredAt`, scoped to the `period` param |
| **Dimensions** | Broken out by `elementId`; no further §J segmentation yet |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getClickstreamAnalytics` → `GET /admin/analytics/clickstream` |

## 8. Booking Conversion

| | |
|---|---|
| **Numerator** | Unique users who fired `booking_confirmed` (server-authoritative — see `AppointmentsService.create`) |
| **Denominator** | Unique users who fired `booking_started` (client beacon) |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` when denominator is 0 |
| **Exclusions** | Global |
| **Timestamp basis** | `occurredAt`, scoped to the funnel's `period` window |
| **Dimensions** | Full §J filter set, same as OTP Verification Rate; also broken out per-country in `getGeoMapAnalytics` (`bookingConversionRate` field) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.KPI_DEFINITIONS` entry `bookingConversionRate` |

## 9. Payment Success

| | |
|---|---|
| **Numerator** | Unique users who fired `payment_success` (server-authoritative — see `PaymentsService.handleChargeSuccess`) |
| **Denominator** | Unique users who fired `checkout_started` (client beacon) |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` when denominator is 0 |
| **Exclusions** | Global |
| **Timestamp basis** | `occurredAt`, scoped to the funnel's `period` window |
| **Dimensions** | Full §J filter set; also broken out per-country in `getGeoMapAnalytics` (`paymentSuccessRate` field) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.KPI_DEFINITIONS` entry `paymentSuccessRate` (labeled `Payment Success Rate`) |

## 10. D30 Retention

| | |
|---|---|
| **Numerator** | Patients in the D30-eligible cohort (registered ≥30 days ago, within the lookback window) who returned with any qualifying activity ≥30 days after their first `registration_complete` |
| **Denominator** | Size of the D30-eligible cohort |
| **Formula** | `numerator ÷ denominator`, rounded to 1 decimal place; `null` when the eligible cohort is empty |
| **Exclusions** | Global. A patient's cohort start date is their **first** `registration_complete` — a duplicate/retried registration event does not reset it. |
| **Timestamp basis** | `occurredAt`; default `lookbackDays` is 120 (max retention window [90] + a 30-day buffer, so a D90-eligible cohort actually has 90 days to return before the window closes) |
| **Dimensions** | None — a single cohort-wide number per window (D1/D7/D30/D60/D90 all computed together, D30 is the one spec §26 names explicitly) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | `cohortDefinitionVersion` = 1 (`RETENTION_COHORT_DEFINITION_VERSION` — bump this whenever `RETENTION_WINDOWS` or the eligibility/return-window logic changes, so historical retention reports don't change silently, per spec §16) |
| **Implementation** | `AnalyticsService.getRetentionAnalytics` → `GET /admin/analytics/retention` |

## 11. Location Conversion

| | |
|---|---|
| **Spec formula** | Converted users in location ÷ eligible visitors/registrants in same location |
| **Status** | Implemented as two separate per-country conversion rates rather than one generic "conversion" metric, since the codebase has two concrete server-authoritative conversion events (booking, payment) and no single generic "conversion" event |
| **Numerator / Denominator** | Same as Booking Conversion (#8) and Payment Success (#9) above, computed independently per country |
| **Exclusions** | Global, plus rows with no resolved country code are excluded from the map entirely (shown separately as "not drawable" in the admin UI, not silently dropped) |
| **Timestamp basis** | `occurredAt`, scoped to the map's `period` param |
| **Dimensions** | Broken out per `countryCode`; `basis: 'access' \| 'declared'` selects IP-derived vs. patient-declared geography (spec §D/§F) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getGeoMapAnalytics` → `GET /admin/analytics/geo-map`, `bookingConversionRate`/`paymentSuccessRate`/`activationRate` fields per country |

## 12. Error Rate

| | |
|---|---|
| **Numerator** | Count of `client_error` events (uncaught JS error or unhandled promise rejection — `ErrorTracker`, window-level) |
| **Denominator** | Total events in the digital-experience query (all page/device/browser telemetry, not just error-qualifying attempts) |
| **Formula** | `numerator ÷ denominator × 100`, rounded to 1 decimal place; `null` when there is no traffic at all |
| **Exclusions** | Global |
| **Timestamp basis** | `occurredAt`, scoped to the `period` param |
| **Dimensions** | None currently — a single rate plus a top-20 ranked list of error messages (`topErrors`) |
| **Refresh interval** | Live per request |
| **Owner** | Unassigned |
| **Version** | 1 |
| **Implementation** | `AnalyticsService.getDigitalExperienceAnalytics` → `GET /admin/analytics/digital-experience`, `errorRate` field |

---

## Related scored metrics (not in §26's list, but adjacent)

### Registered → Verified Rate

Extra KPI beyond §26's 12, kept in `KPI_DEFINITIONS` alongside them: unique users who fired `otp_verify_success` ÷ unique users who fired `registration_complete`. Same exclusions/timestamp basis/dimensions as OTP Verification Rate.

### Engagement Score (spec §17)

Not a ratio KPI — a per-patient weighted score (`recentLogin` + `profileComplete` + `hasBooking` + `repeatBooking` + `hasUpload` + `hasVitals` + `paidSubscription` components, see `AnalyticsService.ENGAGEMENT_WEIGHTS`) mapped to a category (Dormant / … / Highly Engaged via `ENGAGEMENT_CATEGORIES`). Carries its own `version` field (`ENGAGEMENT_SCORE_VERSION` = 1) for the same "don't let historical scores drift silently" reason retention has `cohortDefinitionVersion`. Computed on demand per patient via `getEngagementScore(userId, patientId)`, not as a dashboard-wide aggregate — no dedicated admin endpoint aggregates it across the patient base today.
