# Event Schema & Aggregation Design

Spec §32 deliverable: "Database/Event Schema and aggregation design." Covers spec §20 (Recommended Event Storage Model), §21 (Event Naming & Versioning), and §25 (Data Warehouse / Aggregation Configuration) as actually implemented, grounded in `prisma/schema.prisma` and `AnalyticsAggregationService`. Update it when either changes, it will drift otherwise.

## 1. Event schema — spec §20's logical model vs. `PatientActivityEvent`

Every column spec §20 names has a direct, first-class counterpart on `PatientActivityEvent` — nothing from the recommended schema was left buried in an untyped JSON blob:

| Spec §20 column | `PatientActivityEvent` column | Note |
|---|---|---|
| `event_id` | `eventId` (nullable, unique) | Dedup/idempotency key — `trackEvent` upserts on it when present (spec §20's "retries do not inflate counts" requirement) |
| `event_name` | `eventName` | Validated against `EVENT_NAME_RE` (lowercase snake_case) before write |
| `event_version` | `eventVersion` | Defaults from `analytics-events.catalog.ts`'s per-event `version` when the client doesn't send one |
| `occurred_at_utc` | `occurredAt` | Client-reported; used for all reporting-window filters |
| `received_at_utc` | `receivedAt` | Server receive time — lets the pipeline detect late arrival by comparing to `occurredAt` (see §4) |
| `patient_id` | `patientId` | See `docs/ANALYTICS-IDENTITY-SESSIONIZATION-DESIGN.md` |
| `anonymous_visitor_id` | `anonymousVisitorId` | Same |
| `analytics_session_id` | `analyticsSessionId` | Same |
| `page_name` / `page_path` | `pageName` / `pagePath` | First-class columns, not JSON |
| `feature_area` | `featureArea` | First-class, drives the §J filter and Feature Adoption KPI |
| `element_id` / `element_type` | `elementId` / `elementType` | First-class, drives CTA CTR |
| `action` / `outcome` | `action` / `outcome` | First-class, largely unused today — reserved for future outcome-classified events |
| `source` / `campaign` fields | *(not on this table)* | Lives on `users.acquisition_source`/`utm_*` instead — captured once at registration, not per-event; see `resolveUserAttributionPatientIds` in `analytics.service.ts` |
| device/browser/os | `deviceCategory` / `browser` / `os` | Derived server-side from `userAgent`, never trusted from the client |
| `declared_geo_keys` | *(not on this table)* | Lives on `Patient.countryCode` instead — a per-patient declaration, not a per-event one; see `getGeoMapAnalytics(basis: 'declared')` |
| access_geo fields | `countryCode`/`regionCode`/`regionName`/`city`/`continentCode`/`timezone`/`latitude`/`longitude`/`asn`/`geoAccuracy`/`geoSource`/`geoProvider`/`geoProviderVersion` | Resolved server-side only, via `GeoResolverService` or edge-header fallback — see `geoip/README.md` |
| `raw_ip_reference` | *(not stored on this table at all)* | The resolved geo fields above are kept; the raw IP itself isn't persisted on `PatientActivityEvent` — narrower than spec's "restricted field/table," but avoids the restricted-field problem entirely by never storing it here |
| `properties` | `properties` (JSON) | Schema-governed by convention: `normalizeFields()` in both client SDKs routes only unrecognized fields here, so `properties` shape drifts per event but never swallows a first-class column |
| `ingestion_source` | `ingestionSource` | `web` \| `mobile` \| `server` |
| `environment` | `environment` | Set directly from `process.env.NODE_ENV`, which the code only ever branches on as `'production'` vs. everything else (defaulting to `'development'`) — there's no third `'staging'` branch in `AnalyticsService` itself. Whatever `NODE_ENV` value the staging deploy is actually configured with (not verified as part of this doc) is what ends up in this column; staging/synthetic-traffic exclusion is handled by `is_test_event`/the BFF header instead of by this field, regardless. |
| `is_test_event` | `isTestEvent` | See `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §5 for the full consent/test-exclusion design |

**One deliberate simplification against spec §21:** the spec's example event names include compound ones like `appointment_booking_started`; this codebase uses `booking_started` (see `analytics-events.catalog.ts`). Naming is otherwise fully compliant — lowercase snake_case, describes a completed observation, versioned, never silently renamed.

## 2. Distinct-user counting strategy (spec §25)

Every dashboard in `AnalyticsService` counts unique users the same way, without exception: a `Set` keyed by `patientId` when present, else `` `anon:${anonymousVisitorId}` `` when not. This single convention is what makes cross-dashboard numbers comparable — the Funnels tab's "unique users," the Geo map's "visitors," CTA CTR's "unique clickers," and MAU's "active patients" (patients only, no anonymous population) are all built on the same union-of-identity-keys idea, just scoped to different event subsets. There is no separate "sessions vs. users vs. visits" ambiguity to document — `analyticsSessionId` is a distinct axis (see the Identity & Sessionization doc), never conflated with the user-counting key.

## 3. What is and isn't pre-aggregated

Spec §25 asks for "hourly/daily aggregate tables for page, click, feature, geography and funnel metrics." All 5 categories now exist as pre-aggregated tables, populated by `AnalyticsAggregationService.runDailyAggregation()` (Bull cron, `15 1 * * *`, i.e. 01:15 UTC daily):

- **`ServiceUsageDaily`** — one row per `(reportDate, serviceType)`, sourced from `Appointment`/`DispatchRequest`/`TravelSafeTrip` (transactional tables, not the clickstream event stream)
- **`RevenueSummary`** — one row per `(reportDate, serviceType, gateway)`, sourced from `Payment` (also transactional, not clickstream)
- **`FunnelEventDaily`** — one row per `(reportDate, eventName)`, sourced from `PatientActivityEvent`, covering every distinct event name that occurred that day (not a fixed list)
- **`DimensionDailyMetric`** — one row per `(reportDate, dimension, dimensionValue)`, covering the remaining 4 named categories (page/click/feature/geography) via a single flexible table rather than 4 near-identical ones — `dimension` is one of `page`/`element`/`feature_area`/`country`

**These are deliberately not yet read by any dashboard.** `AdminService.getAnalyticsUsage()`/`getAnalyticsRevenue()` remain the only two dashboard queries reading a pre-aggregated table — every funnel/demographics/geography/CTA-CTR/retention/engagement/Core-KPI dashboard still computes **live, per API request** from raw `PatientActivityEvent`/`AnalyticsSession` (see `docs/ANALYTICS-KPI-DICTIONARY.md`'s "global refresh interval" note). The reason isn't that the new tables are unfinished — it's that an unfiltered daily rollup can't simply replace a live query that supports spec §J's 14 arbitrary filter dimensions; the new tables serve the *unfiltered* "how many total X happened today" case, which is the more urgent cost problem as raw event volume grows, not a drop-in replacement for filtered dashboard queries. Wiring any specific dashboard over to read these where it can (e.g. an unfiltered default view before a filter is applied) remains open follow-up work.

## 4. Late-arriving events

- **The daily cron aggregates by the *transactional* tables' own `createdAt`** (e.g. `Appointment.createdAt`, `Payment.createdAt`), not by `PatientActivityEvent.occurredAt`/`receivedAt` — so client clock skew on a clickstream beacon has no bearing on the two aggregates that exist today. A payment or appointment row is created server-side at a definite instant; there's no "late arrival" concept for it the way there is for a client-batched analytics beacon.
- **`PatientActivityEvent` itself does carry both `occurredAt` (client-reported) and `receivedAt` (server receive time)** specifically so a future clickstream aggregate could detect and handle late arrival — but since no clickstream aggregate exists yet (§3), that capability is unused today. This is the concrete mechanism spec §25's "late-arriving events handled consistently" requirement would build on, not something already handling it.

## 5. Timezone conversion (spec §25 — gap)

**No business-timezone conversion layer exists.** `reportDate` in both aggregate tables, and every `since`/`until` window computed in `AnalyticsService`/`AdminService`, is plain UTC (`new Date()` on the server, which runs in UTC in production). Spec §25 explicitly asks for "timezone conversion performed at reporting layer using a defined business timezone" — this codebase has never defined one. In practice this means a "daily" aggregate's day boundary is midnight UTC, not midnight in Lagos or any other operating timezone, and every admin dashboard's date labels are UTC dates. Not a subtle bug — a real, undone piece of spec §25.

## 6. Backfill / reprocessing

`runDailyAggregation(forDate?: Date)` accepts an explicit date and is idempotent (upserts on each table's unique key), so re-running it for any past day is safe and won't duplicate rows — the *capability* spec §25 asks for exists. **What doesn't exist: any operational way to actually invoke it for an arbitrary day.** There is no admin endpoint, CLI script, or documented manual procedure — today the only caller is `AnalyticsAggregationProcessor`'s cron handler, which always aggregates "yesterday" with no arguments. A real backfill today means writing and running a one-off script that calls the service method directly.

## 7. Data freshness timestamp (spec §25 — gap)

**No dashboard displays when its data was last refreshed.** For the live-query dashboards this is arguably moot (every load is fresh by construction), but for the two pre-aggregated tables (§3) — which only update once daily at 01:15 UTC — the admin Usage/Revenue charts give no indication that "today" might be showing yesterday's aggregate, or that the whole pipeline could be silently stalled if the cron job started failing. `AnalyticsAggregationService.runDailyAggregation` does log and re-throw on failure (visible in server logs), but nothing surfaces that failure state to anyone looking at the dashboard itself.

## 8. Reconciliation job (spec §25 — gap, also its own §32 deliverable)

**No reconciliation job exists.** Spec §25 asks for one that "compares critical portal outcomes to transactional source records" — e.g., verifying `payment_success` event counts match `Payment` table rows with `status: 'paid'`, or `booking_confirmed` counts match confirmed `Appointment` rows. Today the only cross-check of this kind is qualitative: `emitServerEvent`'s doc comments note that a server event and a client beacon for the same outcome should be deduped by `ingestion_source` when counting, but nothing automated verifies the two actually agree. This is also spec §32's separate "Data reconciliation plan" deliverable, still open — building the plan and building the job are the same piece of work either way.
