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

`AdminService` reads the aggregate tables for usage, revenue, funnel trends, top pages, top elements, top feature areas, and country activity. Filtered funnels, journey reconstruction, cohorts, and experience metrics continue to query raw events because their arbitrary dimension combinations cannot be recovered from unfiltered daily totals.

## 4. Late-arriving events

- The scheduled run reprocesses the previous three Lagos reporting days. Upserts make replay idempotent and allow delayed event delivery to correct page, click, feature, geography, and funnel totals.
- `PatientActivityEvent` carries both `occurredAt` and `receivedAt`; report assignment uses `occurredAt`, while the replay policy absorbs events received after the first daily pass.

## 5. Timezone conversion

The shared `analytics/reporting-window.ts` defines Africa/Lagos as the reporting timezone. Aggregation, reconciliation, raw KPI queries, and admin reporting use the same `[since, until)` boundaries. Calendar-day labels therefore represent Lagos midnight even though timestamps remain stored in UTC.

## 6. Backfill / reprocessing

`runDailyAggregation(forDate?)` is idempotent and the protected aggregation controller exposes a one-day backfill operation. Scheduled replay and manual backfills both write durable `AnalyticsPipelineRun` records with `running`, `succeeded`, or `failed` status.

## 7. Data freshness timestamp

The pipeline health endpoint reads the latest completed scheduled `AnalyticsPipelineRun`, including status, completion timestamp, report date, and staleness. The admin dashboard displays this status and refreshes it every minute. A partially completed or failed run cannot masquerade as success because aggregate-row timestamps are no longer used as the run marker.

## 8. Reconciliation job

`AnalyticsReconciliationService` runs scheduled checks for payment successes/failures, bookings, revenue, and service usage. It shares the Lagos day boundary, matches payment outcomes by stable transaction identity, records the result, raises mismatch alerts, and rethrows processor failures so Bull retries remain effective.
