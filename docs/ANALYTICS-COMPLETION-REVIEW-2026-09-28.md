# Analytics completion review — updated 29 September 2026

**Implementation verdict: complete for the repository scope, with Geo-IP provider procurement, credentials, database licensing/download, and provider accuracy validation explicitly excluded.** Production migration, deployment, scheduled-job observation, and business sign-off remain release activities because they require the deployed environment and organizational approvers.

## Closed findings

1. Aggregation, reconciliation, raw reports, and custom date ranges now use one Africa/Lagos reporting-window implementation. Payment reconciliation matches stable payment identities rather than unrelated daily counts.
2. Required registration, OTP, slot, booking, payment, upload, result, privacy/terms, and first-meaningful-action events are instrumented. Durable outcomes are emitted from the server with idempotency keys.
3. Payment success is attempt-based, the digital error rate uses qualifying actions, activation is ordered and configurable, and age segmentation uses the report date.
4. The funnel API reconstructs ordered registration, booking, payment, records, results, and subscription journeys with stage conversion, abandonment, elapsed time, retries, errors, paths, and exits.
5. The dashboard supports Today, Yesterday, 7/30/90 days, Month, Quarter, YTD, and custom dates. Funnel filters include country, continent, region, city, device, browser, OS, age, plan, gender, nationality, acquisition, campaign, lifecycle, feature, timezone, and service type. Cohorts can be grouped by registration month, country, device, acquisition source, plan, or first feature and include second-session/action/booking timing.
6. Durable pipeline-run records cover running/succeeded/failed states. Scheduled aggregation replays three reporting days for late arrivals, processors propagate failures for retry, a protected backfill path exists, and the admin dashboard displays the latest completed scheduled run.
7. Mobile CTA impressions require at least 50% viewport visibility for 500 ms while the screen is focused and the app is active.
8. KPI, privacy, aggregation, reconciliation, and acceptance documentation now describe the implemented behavior.

## Geo-IP exclusion

The implementation retains the provider-neutral resolver contract, edge-header fallback, declared-country reporting, and unknown-location handling. This completion verdict does not claim that a commercial/offline Geo-IP provider has been selected, licensed, configured, downloaded, or validated. Dashboard copy states that city precision is limited without that provider.

## Release-only actions

- Apply the Prisma migration that creates `AnalyticsPipelineRun`.
- Deploy API, portal, mobile, and admin builds from the same release.
- Observe at least one scheduled aggregation and reconciliation run, then confirm health/freshness and alert delivery.
- Execute the representative journeys in the deployed acceptance environment and retain screenshots/query extracts using the matrix in `ANALYTICS-ACCEPTANCE-EVIDENCE.md`.
- Record Product Analytics and Platform Engineering sign-off.

These actions cannot be certified from a source checkout. They do not represent missing repository implementation.
