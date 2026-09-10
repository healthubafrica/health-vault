# Analytics Privacy & Data Governance

Companion doc to the MyHealth Vault+ Patient Portal Analytics Implementation & Configuration Specification — covers the four governance deliverables from that spec's remaining-work list: data classification, retention, RBAC, and the event catalog. Grounded directly in the current `health-hub-africa-api` Prisma schema and route guards, not aspirational — update this file when the schema or role checks change, it will drift otherwise.

## 1. Data Classification Matrix

| Category | Examples (fields) | Tables | Sensitivity | Handling |
|---|---|---|---|---|
| **Identity** | `email`, `phone`, `fullName`, `firstName`/`lastName`, `dateOfBirth`, `nin` (national ID), `nextOfKin*` | `User`, `Patient` | **Restricted** — direct PII | Never logged in plaintext outside `AuditLog.metadata`; never included in analytics `properties` JSON |
| **Clinical / health** | Vitals, lab orders, clinical notes, prescriptions, `bloodGroup`, `genotype` | `LabOrder`, `ClinicalRecord`, vitals tables, `Patient.bloodGroup`/`genotype` | **Restricted** — PHI | Provider/admin/coordinator access only (see §3); never referenced in analytics events beyond a boolean "did an action happen" |
| **Financial** | `Payment`, `PatientSubscription`, gateway references | `Payment`, `PatientSubscription` | **Restricted** | No card/bank data stored — gateway tokens only; amounts in `amountKobo` are internal-only in reporting |
| **Location / device** | `ipAddress`, `userAgent`, `countryCode`, `regionCode`/`regionName`, `city`, `continentCode`, `timezone`, `latitude`/`longitude` (approx. IP centroid — never GPS), `asn`, `deviceCategory`/`browser`/`os`, `geoAccuracy`/`geoSource`/`geoProvider`/`geoProviderVersion` | `PatientActivityEvent`, `SiteVisit`, `UserSession`, `AuditLog` | **Sensitive** — indirectly identifying | Never exposed to other patients; admin dashboards show it aggregated (counts, breakdowns), row-level access requires an admin role. `latitude`/`longitude` are a coarse IP centroid with `geoAccuracy` stating the precision — do not present as a patient's location |
| **Behavioral / analytics** | `eventName`, `eventVersion`, `eventId` (dedup key), `properties` (JSON), `featureArea`/`pageName`/`pagePath`/`elementId`/`elementType`/`action`/`outcome`, `analyticsSessionId`, `anonymousVisitorId`, `ingestionSource`, `isTestEvent`; session rollups (`entryPage`/`exitPage`, `pageViewCount`/`clickCount`/`eventCount`, `engaged`, `returningVisitor`) | `PatientActivityEvent`, `AnalyticsSession` | **Internal** | `properties` and `pagePath` must never carry identity/clinical/financial fields or tokens — see the event catalog in §4 (and `src/analytics/analytics-events.catalog.ts`) for what's actually captured. `AnalyticsSession` is keyed off the pseudonymous client `analyticsSessionId`, never the auth session |
| **System / audit** | `action`, `resourceType`, `ipAddress`, `metadata` | `AuditLog` | **Restricted** | Write-only from the app's perspective; read access is `super_admin`-gated (see §3) |
| **Credentials** | `passwordHash`, `refreshToken`, OTP `VerificationToken.token` | `User`, `UserSession`, `VerificationToken` | **Critical** | Hashed/opaque at rest; never included in any API response, log line, or analytics payload |

**Rule of thumb for new analytics events:** if a field would let you look up *who* a specific patient is or *what* their clinical/financial situation is, it does not belong in `PatientActivityEvent.properties`. `patientId`/`anonymousVisitorId` is the only identity carried, and it exists specifically to link funnel events to a single (pseudonymous, pre-login) visitor or a real patient row — not to be joined back out to `Patient` PII by anyone without admin access.

## 2. Data Retention Policy

| Data | Table | Retention | Deletion mechanism |
|---|---|---|---|
| Active patient/user account | `User`, `Patient` | Retained for the life of the account | `User.deletedAt` (soft delete) — no hard-delete path exists today; a hard-delete/purge job is a gap if "right to erasure" becomes a compliance requirement |
| Sessions | `UserSession` | Until `expiresAt` or explicit revoke; rows are not currently purged after expiry | **Gap**: add a periodic purge of `expiresAt < now() - 90d` rows — cheap win, no data-loss risk since these are pure bearer tokens |
| OTP / verification tokens | `VerificationToken` | Single-use, `expiresAt` typically minutes | **Gap**: same as sessions — expired/used rows accumulate with no purge job |
| Analytics events (funnel) | `PatientActivityEvent` | No enforced cap today | Recommend 24 months rolling (covers YoY comparison, the longest lookback any dashboard in this codebase uses is 90d) then archive-or-drop older rows |
| Analytics sessions | `AnalyticsSession` | No enforced cap today | Same 24-month rolling window as `PatientActivityEvent` — one row per visit, rolled up from those events; purge in lockstep |
| Anonymous site visits | `SiteVisit` | No enforced cap today | Same 24-month recommendation — lower sensitivity than `PatientActivityEvent` (no `patientId`) but still IP/UA-bearing |
| Audit logs | `AuditLog` | No enforced cap today | Recommend 7 years for anything touching PHI/financial actions (typical healthcare compliance baseline) — do not shorten this without legal sign-off, it's the only record of who-did-what-when |
| Notification deliveries | `NotificationDelivery` | No enforced cap today | Recommend 12 months — operational/debugging value drops off fast after that |
| Admin/patient alerts | `AdminAlert`, `PatientAlert` | `PatientAlert.expiresAt` exists but isn't enforced by a purge job; `AdminAlert` has no expiry field at all | Recommend a 90-day purge for read alerts on both tables |
| Support tickets | `SupportTicket` | No enforced cap today | Retain per whatever SLA/complaints-handling policy the business already has for support — no analytics-specific guidance needed here |

None of the "no enforced cap" rows above are actively harmful — they're growth-over-time cost/perf concerns, not a compliance gap, with the exception of sessions/OTP tokens (cheap to fix) and the account hard-delete gap (only matters if/when a formal erasure request needs to be honored). Flagging both here so they're visible next to the retention numbers rather than only living in code comments.

## 3. RBAC Matrix

Roles, as defined on `User.role` (`UserRole` enum): `patient`, `provider`, `coordinator`, `admin`, `super_admin`. Every admin-facing route sits behind NestJS's `@Roles(...)` guard; this table reflects what's actually enforced in the controllers today, not an aspirational policy.

| Resource / action | patient | provider | coordinator | admin | super_admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Own patient portal (appointments, records, vault, payments) | ✅ | — | — | — | — |
| Provider console (telecare sessions, availability, own patients) | — | ✅ | — | — | — |
| Expert review case queue | — | ✅ (assigned cases) | ✅ | ✅ | ✅ |
| Labs — order/result workflows | — | ✅ | ✅ | ✅ | ✅ |
| Patient record management (`patients.controller.ts`) | — | — | ✅ | ✅ | ✅ |
| Dispatch / TravelSafe coordination (`stride.controller.ts`) | — | — | ✅ | ✅ | ✅ |
| Admin dashboard — analytics, KPIs, alerts (`admin.controller.ts` base, `analytics.controller.ts`) | — | — | — | ✅ | ✅ |
| User role changes, email changes, account activation | — | — | — | — | ✅ |
| Provider account management | — | — | — | ✅ | ✅ |
| OpenEMR sync administration | — | — | — | ✅ | ✅ (write ops `super_admin`-only) |
| Payments admin (refunds, manual reconciliation) | — | — | — | ✅ | ✅ |
| CMS content management | — | — | — | ✅ | ✅ |

Two things worth calling out explicitly since they're easy to get wrong by reading the frontend alone:

- The admin frontend's own role selector UI is gated to `super_admin` (`health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx` — `isSuperAdmin` check), but that's a UX convenience, not the actual authorization boundary. The real boundary is the backend `@Roles()` guard on each route; never assume a frontend check alone is sufficient when reasoning about who can do what.
- `@Roles()` with no arguments (seen on several routes, e.g. `analytics.controller.ts` event ingestion) means "any authenticated role, no role restriction" — not "no one." Don't misread an empty `@Roles()` as a deny-all.

## 4. Analytics Event Catalog

Every event name currently emitted via `analytics.track()` (patient portal) into `PatientActivityEvent.eventName`, grouped the same way the admin Funnels tab groups them (`FUNNEL_GROUPS` in `health-hub-africa-admin/app/(dashboard)/analytics/page.tsx`). None of these carry direct PII in `properties` — see §1's rule of thumb.

The machine-readable companion to this table is `health-hub-africa-api/src/analytics/analytics-events.catalog.ts`. It also lists events that are *planned but not yet wired* (e.g. `landing_view`, `registration_start`, `otp_delivery_*`, `login_success`, `first_meaningful_action`) and marks which ones must be emitted server-side (`origin: 'server'`) so a browser echo can't be trusted as the authoritative count. `trackEvent` logs a warning when a well-formed event name shows up that isn't in that file — that's the signal to add it here and there together.

| Group | Event name | Fired when |
|---|---|---|
| Registration & OTP | `registration_complete` | Registration form submitted successfully |
| | `registration_error` | Registration form submission failed |
| | `otp_requested` | OTP requested (registration or password reset) |
| | `otp_verify_success` / `otp_verify_failure` | OTP verification attempted |
| Booking | `service_selected` | Patient picks a service type before booking |
| | `booking_started` / `booking_validation_error` | Booking flow entered / client-side validation failed |
| | `booking_confirmed` / `booking_error` | Booking submitted — success/failure |
| | `booking_cancelled` / `booking_rescheduled` | Existing appointment cancelled or rescheduled |
| Payments | `checkout_started` | Checkout flow entered |
| | `payment_pending` / `payment_success` / `payment_failure` | Payment gateway callback result |
| | `plan_select` / `checkout_start` / `subscription_checkout_error` / `subscription_cancelled` | Subscription-specific checkout variants |
| Document uploads | `upload_start` / `upload_success` / `upload_failure` | Document upload to the vault |
| Sharing | `share_start` / `share_success` / `share_failure` | Record-share link creation |
| Dispatch (ambulance) | `dispatch_request_started` / `dispatch_request_success` / `dispatch_request_failure` | Emergency dispatch request |
| TeleCare | `telecare_session_join_success` / `telecare_session_join_failure` | Joining a video consultation |
| TravelSafe | `travelsafe_trip_created` | Trip logged in TravelSafe |
| Vitals | `manual_entry_success` | A vital sign logged manually (also an Engagement Score signal — see `AnalyticsService.getEngagementScore`) |
| Support | `ticket_created` | Support ticket submitted |
| Records | `download` | Clinical record or vault document downloaded |
| Profile | `profile_completed` | Onboarding profile step finished |
| Digital Experience | `client_error` | Uncaught JS error or unhandled promise rejection (`ErrorTracker` — window-level, not a React boundary) |
| Navigation | `page_view` | Route change (`PageViewTracker`, authenticated area only) |
| Generic UI | `ui_click` | Ad-hoc CTA click instrumentation (dashboard quick actions) |
| Auth (server) | `login_success` / `login_failure` | Every call to `AuthService.recordLoginEvent` — `ingestion_source = 'server'`, authoritative, mirrors the `login_events` row |
| Booking (server) | `booking_confirmed` | `AppointmentsService.create` success (`ingestion_source = 'server'`) — fires alongside the portal's own client beacon; dedupe by `ingestion_source` when counting |

**Server-authoritative events (spec §23):** `AnalyticsService.emitServerEvent()` writes `PatientActivityEvent` rows with `ingestion_source = 'server'` for outcomes a closed browser tab could otherwise drop. Wired so far: `login_success` / `login_failure` (`recordLoginEvent`), `booking_confirmed` (appointment `create`). Still client-only and pending a server hook: `payment_success` / `payment_failure` (needs a focused pass over the payments webhook) and `registration_complete` / `otp_verify_success` (need the client `anonymousVisitorId` plumbed through the auth DTOs — no Patient row exists yet at that stage). When both a client and a server event exist for the same outcome, count one `ingestion_source` only.

**One event not in `PatientActivityEvent` at all:** `SiteVisit` rows (anonymous marketing-site pageviews, `recordVisit()`) are a separate table entirely. Login failures now have both a `login_events.success = false` row (Security dashboard) and a `login_failure` analytics event.

**Adding a new event:** no backend change is required — `getFunnelAnalytics` groups by whatever `eventName` values exist in the table, and the admin dashboard's "Other events" table (in the Funnels tab) automatically shows anything not yet added to `FUNNEL_GROUPS`. Only that frontend grouping map needs a deliberate update to categorize a new event nicely; the pipeline itself needs nothing.
