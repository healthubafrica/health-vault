# Demographic & Location Data Dictionary

Spec §32 deliverable: "Demographic and Location Data Dictionary." Maps spec §3 (Patient Demographics) and §4 (Location Analytics — Declared vs Access Location) field-by-field onto the actual `Patient`/`PatientActivityEvent` columns and `AnalyticsService` implementation — not the spec's aspirational field list. Update it when either schema changes.

## 1. Patient Demographics (spec §3)

| Spec field | Actual column | Status | Rule compliance |
|---|---|---|---|
| `patient_id` | `Patient.id` (UUID) | ✅ Implemented | Every dashboard keys on this or `hhaPatientId`, never on name |
| `date_of_birth` | `Patient.dateOfBirth` | ✅ Implemented | Never returned raw by any analytics endpoint — `getDemographicsAnalytics` only ever returns the derived age band, never the DOB itself |
| `age_at_event` | *(not implemented)* | ❌ Gap | `AnalyticsService.calculateAge()` always computes age **as of now**, not as of the event/report date. A patient who was 17 when an event occurred but is 18 today would be bucketed into the 18–24 band for a report covering that historical period. No point-in-time age calculation exists. |
| `age_band` | `AnalyticsService.AGE_BANDS` (private constant) | ✅ Implemented, spec-exact | Bands match spec's list character-for-character: 0–4, 5–12, 13–17, 18–24, 25–34, 35–44, 45–54, 55–64, 65+. Configuration-driven in the sense that it's one array in one file, not hardcoded per call site — not yet an actual runtime config value. |
| `sex_or_gender` | `Patient.gender` (`Gender` enum) | ✅ Implemented | Portal's own controlled enum, not free text |
| `nationality` | `Patient.nationality` (nullable string) | ✅ Implemented | Undeclared defaults to `"Not declared"` in `getDemographicsAnalytics`, never silently dropped from the count |
| `preferred_language` | `Patient.preferredLanguage` (default `"en"`) | ✅ Column exists | Not currently surfaced in any analytics dashboard — collected, not yet analyzed |
| `marital_status` | *(not collected)* | ❌ Not collected | Spec marks this optional ("if collected") — genuinely absent from the schema, not a gap against the spec's own wording |
| `occupation` | *(not collected)* | ❌ Not collected | Same — optional per spec, absent from schema |
| `employer_or_group` | *(not collected)* | ❌ Not collected | Same |
| `subscription_plan` | `PatientSubscription` (relation, `status: 'active'` join to `Plan.tier`) | ✅ Implemented | `getDemographicsAnalytics` defaults to `"Free"` when there's no active subscription row — not a null/undefined case |
| `patient_type` | *(not collected)* | ❌ Not collected | No `individual`/`corporate`/`partner` classification exists anywhere on `Patient` or `User` — every patient in this system is implicitly "individual" today. Flagged previously (§16 aggregation work) as a genuine absence, not re-derived here. |
| `registration_date` | `Patient.createdAt` | ✅ Column exists | Retention/cohort analysis (`getRetentionAnalytics`) actually keys off the first `registration_complete` **event**, not this column — see `docs/ANALYTICS-IDENTITY-SESSIONIZATION-DESIGN.md`. The two should agree for real signups but aren't the same value for a manually-created (admin/OpenEMR-synced) patient row that never fired the event. |
| `registration_source` | `users.acquisition_source`/`utm_*` (raw SQL columns, not in the Prisma `User` model — see `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §1) | ✅ Implemented, first-touch only | Captured once at registration (`MarketingAttributionDto`). Spec asks for "first-touch and last-touch where supported" — only first-touch is persisted; there's no last-touch/most-recent-attribution concept anywhere in this codebase. |

## 2. Patient-Declared Location (spec §4.1)

| Spec field | Actual column | Status |
|---|---|---|
| Country | `Patient.country` (free text, defaults `"Nigeria"`) **and** `Patient.countryCode` (ISO alpha-2, nullable, set only when a client actually asks) | ⚠️ Two columns, different trust levels — `country` is NOT a reliable "declared" signal (defaults to Nigeria even when never asked); `countryCode` is the only column that means "the patient was actually asked and this is what they said." Analytics must key on `countryCode`, never `country` — see `docs/ANALYTICS-KPI-DICTIONARY.md`'s Location Conversion entry and `getGeoComparison`. |
| State / province / region | `Patient.state`, `Patient.stateOfOrigin` | ⚠️ Two overlapping free-text columns, neither ISO-normalized. No analytics dashboard currently segments by either. |
| LGA / county / district | `Patient.lgaOfOrigin` (free text) | ⚠️ Collected, not analyzed — no LGA-level dashboard or filter reads this column today. Same admin-level-2 gap already documented in `docs/MyHealth_Vault_Plus_Global_Patient_Portal_Analytics_Implementation_Specification_v2.md`'s §J filter work (blocked on GeoIP granularity for the *access*-side equivalent; the *declared*-side column exists but is simply unused by any dashboard yet). |
| City / town | `Patient.city` (free text) | ⚠️ Collected, not analyzed |
| Postal code | *(not collected)* | ❌ Not collected |
| Neighborhood/community | *(not collected)* | ❌ Not collected |
| Address verification status | *(not collected)* | ❌ Not collected — no address verification feature exists in the product at all |

**The one rule spec §4 states as a hard requirement — "Patient-declared residence/location must never be overwritten by IP-derived access location" — is honored by construction:** `countryCode` is only ever written by `PatientsService` from direct patient input (onboarding/profile forms); `AnalyticsService.resolveAccessGeo()` writes exclusively to the separate `PatientActivityEvent` geo columns (§3 below) and has no code path that touches `Patient.countryCode`/`country`/`state`/`city`. The two are architecturally incapable of cross-contaminating each other.

## 3. Access Location Derived from Network Session (spec §4.2)

| Spec field | Actual column (`PatientActivityEvent`) | Status |
|---|---|---|
| `source_ip` | *(not stored on this table)* | ⚠️ Deliberate — see `docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md` §1: the resolved geo fields are kept, the raw IP itself isn't persisted here at all, which is narrower than spec's "restricted field/table" suggestion but sidesteps the restricted-field problem by simply not storing it |
| `ip_country_code` | `countryCode` | ✅ Implemented |
| `ip_country_name` | *(not stored — derived on read)* | ⚠️ `continentForCountry()`/`countryName()` helpers derive display names from the code at query time in the admin frontend; no stored country-name column |
| `ip_region_code` | `regionCode` | ✅ Column exists — populated only "where supported" by the resolver, matching spec's own caveat |
| `ip_region_name` | `regionName` | ✅ Implemented |
| `ip_city` | `city` | ✅ Implemented |
| `ip_postal_code` | *(not collected)* | ❌ Not collected |
| `ip_latitude` / `ip_longitude` | `latitude` / `longitude` | ✅ Implemented — `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §1 already documents these as a coarse IP centroid, never presented as GPS-precise |
| `ip_timezone` | `timezone` | ✅ Implemented |
| `network/asn` | `asn` | ✅ Implemented — used as a VPN/hosting-provider security signal, not for location display (matches spec §4.2's own framing) |
| `geo_provider` | `geoProvider` | ✅ Implemented |
| `geo_accuracy_level` | `geoAccuracy` | ✅ Implemented |
| *(reproducibility)* | `geoProviderVersion` | ✅ Implemented — stamped from the GeoLite2 file's mtime, see `geoip/README.md` |

## 4. Location Drill-Down (spec §4.3)

Spec asks for Country → State/Region → City/LGA, with visitors/registrations/verified users/active users/sessions/clicks/appointments initiated/successful bookings/payments/conversion rate/retention at every level.

**Implemented today, per-country only (no state/region/city breakdown yet):** `AnalyticsService.getGeoMapAnalytics()` returns `visitors`, `sessions`, `clicks`, `registrations`, `activatedUsers`, `activationRate`, `bookingConversionRate`, `paymentSuccessRate` — 8 of the ~11 named metrics, all at country granularity only.

**Missing from the drill-down entirely:**
- **State/Region → City/LGA levels** — `getTrafficAnalytics()` does build a Continent→Country→Region→City hierarchy tree, but that's the *marketing-site* traffic dashboard (`SiteVisit`-backed), not the patient-portal conversion metrics above. The two hierarchies are not currently unified into one drill-down that carries conversion/retention metrics below the country level.
- **Verified users** and **active users** as distinct per-country counts (only `registrations`/`activatedUsers` exist — "verified" specifically, per the lifecycle-stage definition in spec §J, isn't broken out per country)
- **Raw successful-booking and payment counts** — only the *rates* (`bookingConversionRate`/`paymentSuccessRate`) are returned, not the underlying numerator counts, per country
- **Retention per location** — `getRetentionAnalytics()` has no geography dimension at all today

**Small-group suppression:** spec asks to "suppress or aggregate very small groups... to reduce re-identification risk." No such suppression threshold exists anywhere in the geo/demographics pipeline today — a country or age band with a single patient in it renders with its exact count, same as any other. This is a real, undone privacy-hardening gap, distinct from (but related to) the RBAC controls documented in `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §3.

## 5. Declared-vs-Access Analysis (spec §4.4)

| Spec requirement | Implementation |
|---|---|
| Declared country vs access country | ✅ `AnalyticsService.getGeoComparison()` — matches on `Patient.countryCode` vs the event's access `countryCode`, excludes undeclared patients rather than fabricating an "Unknown" mismatch |
| Declared state vs access region | ❌ Not implemented — `getGeoComparison` only compares at country granularity |
| Diaspora/remote access cohort | ✅ `getGeoComparison`'s `diasporaPatients` count — flagged when declared and access country codes differ, per patient |
| Unexpected access-location changes for security review | ✅ Partially — `AdminService.getSecurityAnalytics()`'s `locationAnomalies` flags a login from a new country for a given account (shared detection logic also backs the `login_location_anomaly` alert rule, spec §29). This is login-location anomaly detection, not a general "this patient's access location changed" signal outside of login events specifically. |
| Conversion by declared location, independently by access location | ✅ `getGeoMapAnalytics(period, basis)` — the `basis: 'access' \| 'declared'` toggle computes `bookingConversionRate`/`paymentSuccessRate`/`activationRate` independently for each basis, never blending them |
