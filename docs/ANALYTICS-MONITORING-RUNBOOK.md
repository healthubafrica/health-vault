# Analytics Pipeline Monitoring & Runbook

Spec §32 deliverable: "Monitoring/runbook for analytics pipeline failures." Covers every known failure mode in the analytics pipeline as it's actually built today — what happens when it fails, how you'd notice, and what to do. Grounded in the real error-handling code (`trackEvent`, `rollUpSession`, `GeoResolverService`, `AnalyticsAggregationProcessor`), not aspirational monitoring that doesn't exist yet.

## Guiding principle already built into the code

**Analytics failures must never break the product.** `trackEvent`, `emitServerEvent`, and `recordVisit` all wrap their entire body in try/catch and only log on failure — a broken analytics pipeline degrades to "we lose some data," never to "a patient can't book an appointment." This is spec §30's explicit "Failure mode" acceptance test, already satisfied by construction. Every failure mode below is a **silent data-loss risk**, not an availability risk — which is exactly why proactive monitoring matters here: nothing will page anyone or show an error to a user, so nobody notices without deliberately looking.

## Failure mode 1 — Event write silently dropped

**What happens:** `trackEvent`'s catch-all logs `'Analytics track failed'` with the error and returns normally. The client that sent the beacon gets a 204 either way (or whatever HTTP response the controller sends) — it has no way to know the write didn't happen.

**Common causes:** a DB connection blip, a Prisma validation error from a malformed payload that slipped past `EVENT_NAME_RE` but failed a column constraint, a `patientId` lookup failure.

**How you'd notice today:** grep API logs for `Analytics track failed`. There is no dashboard, count, or alert for this — it is purely a log line unless someone is watching.

**Response:**
1. Check the logged error's underlying cause (DB connectivity vs. a specific malformed payload shape).
2. If it's a payload-shape issue, check whether a specific client version is sending a bad field — this usually means a client/server DTO mismatch after a deploy.
3. There is no re-drive mechanism — a dropped event is gone. If the volume is large enough to matter, that's a signal to build the alerting/threshold described below, not to try to recover the specific lost rows.

**What should exist but doesn't:** a counter/metric on this catch block (even a simple `Analytics track failures: N in the last hour` log-based alert) so a spike is visible without someone grepping logs reactively.

## Failure mode 2 — Session rollup silently skipped

**What happens:** `rollUpSession`'s catch logs at `debug` level (not `error`) and returns — the underlying `PatientActivityEvent` row still gets written successfully; only the `AnalyticsSession` rollup for that one event is lost. The code comment is explicit that this is expected during normal operation ("a concurrent event won" — a unique-violation race on `AnalyticsSession.create`), not necessarily a bug.

**How you'd notice:** you likely wouldn't, and mostly shouldn't need to — this is deliberately quiet because most occurrences are benign races. If `AnalyticsSession` row counts look implausibly low relative to `PatientActivityEvent`'s distinct `analyticsSessionId` count, that's the signal something beyond normal races is happening.

**Response:** if investigating, temporarily bump the log level for this catch to `warn` and look for a genuinely different error message than the expected unique-violation race (e.g. a schema/type mismatch would indicate a real bug, not a race).

## Failure mode 3 — GeoIP resolution unavailable

**What happens:** if `MAXMIND_LICENSE_KEY`/the `.mmdb` files are missing, `GeoResolverService` stays disabled and `resolveAccessGeo()` silently falls back to the Vercel/CloudFront edge-header geo (country/region/city only — no lat/long, no ASN). This is a **graceful, intentional degradation**, not a crash — see `geoip/README.md`.

**How you'd notice:** `geoProvider`/`geoAccuracy` on new `PatientActivityEvent` rows will show the edge-header provider instead of `maxmind-geolite2`; the Geography tab's map will have less precise data (country-level only, no city drill-down) but will not error.

**Response:**
1. Confirm `GEOIP_DB_DIR` and `MAXMIND_LICENSE_KEY` are set in the API environment.
2. Confirm `npm run geoip:download` actually ran in the deploy pipeline (check its logs — it exits 0 even on graceful skip, so a missing key won't fail the deploy, which means this can go unnoticed for a long time).
3. Re-run `npm run geoip:download` manually against the target environment if the scheduled/deploy-time run is suspected to have failed silently.

## Failure mode 4 — Daily aggregation cron fails

**What happens:** `AnalyticsAggregationProcessor.handleAggregateDaily()` catches any error from `runDailyAggregation()`, logs it at `error` level, and **does not re-throw, does not retry, and does not alert anyone**. The Bull job itself has no `attempts`/`backoff` configured, so a failed run is not automatically retried. Tomorrow's 01:15 UTC run will attempt to aggregate tomorrow's data, but **yesterday's failed day is never automatically retried** — the `ServiceUsageDaily`/`RevenueSummary` rows for that day simply stay stale or (if this is the day's first-ever run) entirely absent.

**How you'd notice:** grep API logs for `Daily aggregation job failed`. The admin Usage/Revenue charts will show a gap or stale data for that day, with no on-screen indication that it's stale (see `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §7 — no freshness timestamp exists).

**Response:**
1. Find the root cause in the logged error (most likely a DB connectivity issue at 01:15 UTC, or a data shape the aggregation SQL doesn't handle — e.g. a new `ServiceType` value not yet in the util's mapping).
2. **Manual backfill:** `AnalyticsAggregationService.runDailyAggregation(forDate)` is idempotent and accepts an explicit date — the fix is to invoke it directly for the missed day (there is no admin endpoint or script for this today, per `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §6, so this currently means a one-off script or a REPL-style invocation against the running service).
3. Verify the backfill worked by checking `ServiceUsageDaily`/`RevenueSummary` rows for that `reportDate` exist with non-zero-looking values (assuming there was real activity that day).

**What should exist but doesn't:** the reconciliation job described in `docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md` would catch this class of failure automatically (a day with zero aggregate rows but real `Payment`/`Appointment` activity is exactly the kind of mismatch that plan is designed to surface) — building that closes this gap as a side effect.

## Failure mode 5 — Consent gate or test-exclusion misconfigured

**What happens:** these aren't really "failures" in the crash sense — they're **silent over- or under-counting**. If `PatientConsent`'s `analytics` type is ever accidentally set to `granted: false` for a broad set of patients (e.g. a botched migration or admin bulk-action), `trackEvent` will silently drop all of their events with no error — the pipeline is working exactly as designed, just against unintended data. Same risk in the other direction: if the staging BFF's `x-hha-analytics-test` header ever stops being sent, staging traffic starts polluting production dashboards silently (no error, just wrong numbers).

**How you'd notice:** a sudden, otherwise-unexplained drop (or spike) in event volume for no product reason. This is why `docs/ANALYTICS-KPI-DICTIONARY.md`'s numbers should be spot-checked against intuition periodically, not treated as infallible.

**Response:** check `PatientConsent` grant rates directly in the DB if volume drops; check the BFF's outgoing headers directly (`curl` the staging endpoint, inspect what it forwards) if `isTestEvent` counts look wrong.

## Quick reference — where to look

| Symptom | First thing to check |
|---|---|
| Dashboard numbers look wrong/empty for "today" | Nothing is wrong — most dashboards are live-query; check the `period` filter and whether real traffic exists in that window |
| Usage/Revenue charts have a gap for a specific past day | Grep logs for `Daily aggregation job failed` around that day's 01:15 UTC run |
| Geo map suddenly less precise (country-only, no cities) | Check `MAXMIND_LICENSE_KEY`/`.mmdb` files — GeoIP likely fell back to edge-header |
| Event volume dropped sharply with no product explanation | Check `PatientConsent` grant rates and the BFF's `x-hha-analytics-test` header |
| A specific event name never shows up anywhere | Check it's actually in `analytics-events.catalog.ts` — an uncatalogued name still gets written and counted, but logs a warning each time (`Uncatalogued analytics event "..."`), which is itself a signal something wasn't added to the catalog on purpose |
