# Health Hub Africa — What Has Been Built

**Purpose:** Complete inventory of implemented functionality across all four workspaces, for comparison against the PRD.
**Generated:** 2026-07-07
**Workspaces covered:** `health-hub-africa-api` (backend), `health-hub-africa` (patient portal), `health-hub-africa-admin` (admin/provider dashboard), `myvaultplus-web` (marketing site)

---

## Table of Contents

1. [API — Backend Services](#1-api--backend-services)
2. [Patient Portal](#2-patient-portal)
3. [Admin & Provider Dashboard](#3-admin--provider-dashboard)
4. [Marketing Site](#4-marketing-site)
5. [Data Model](#5-data-model)
6. [Cross-Cutting Infrastructure](#6-cross-cutting-infrastructure)

---

## 1. API — Backend Services

NestJS backend. 24 feature modules registered in `app.module.ts`, plus Prisma as the data layer.

### 1.1 Global Request Pipeline

- **`JwtAuthGuard`** (global) — validates JWT + checks the session still exists in `UserSession`. Routes opt out with `@Public()`.
- **`RolesGuard`** (global) — enforces `@Roles()` decorators against `patient / provider / coordinator / admin / super_admin`.
- **`UserThrottlerGuard`** (global) — per-user rate limiting, Redis-backed. Default 100 req/min; individual routes override (e.g. auth endpoints at 3–10/min).
- **`AuditLogInterceptor`** (global) — every mutating request is written to `AuditLog`.
- **`GlobalExceptionFilter`** (global) — structured error responses, Sentry capture.
- Bull queues for async work, Redis-backed.

### 1.2 Auth

| Endpoint | Notes |
|---|---|
| `POST /auth/register` | Public. Always forces `role=patient` regardless of payload. Re-registering an unverified email refreshes the password and resends OTP. |
| `POST /auth/login` | Returns `{requiresTwoFactor, userId}` if 2FA is on. Silent lockout after 10 failed attempts (15 min) — no hint to the caller which happened. |
| `POST /auth/verify-otp` / `verify-2fa` | bcrypt-compares hashed OTP, 10-minute TTL. |
| `POST /auth/request-otp` / `request-sms-otp` | Email OTP and SMS OTP, separately throttled. |
| `POST /auth/refresh` | Rotates refresh token — revokes old session, issues new one. |
| `POST /auth/logout` / `logout-all` | Single session or all sessions. |
| `POST /auth/forgot-password` / `reset-password` | OTP-gated reset; revokes all sessions on success. |
| `PATCH /auth/change-password` | Requires current password; revokes other sessions. |
| `GET/PATCH /auth/2fa` | Toggle + status. |
| `GET/PATCH /auth/notification-preferences` | Per-channel opt-in/out. |
| `GET /auth/me` | Returns canonical signed photo URL. |
| `POST /auth/me/profile-photo-upload-url`, `PATCH /auth/me/profile-photo` | S3 presign + finalize. |
| `GET /auth/sessions`, `DELETE /auth/sessions/:id` | Device/session management. |

Password hashing: bcrypt, 12 rounds. OTP hashing: bcrypt, 10 rounds. Access token: 15 min. Refresh token: 7 days, rotated on use.

### 1.3 Patients

- CRUD (`POST/GET/PATCH/DELETE /patients`), with `/patients/me` shortcut.
- `generateHhaId()` — mints `HHA-{REGION}-{YYYYMM}-{4-digit-seq}`, region derived from the patient's country.
- Creation is transactional: `Patient` + `PatientMedicalInfo` + `EmergencyContact` rows all-or-nothing, then enqueues an OpenEMR sync.
- `POST /patients/me/request-export` — sends a confirmation email only; **no actual export file is generated yet.**
- `POST /patients/me/deactivate` — password-verified self-service soft delete.
- Profile photo pipeline: presign → upload → `POST /patients/me/profile-photo/process` (Sharp: crop, resize to max 1024px, WebP @ 85%, old object deleted).
- Storage quota checked before every upload via `StorageService`.

### 1.4 Providers

- Admin-only creation (`POST /providers`) — promotes a target user's role to `provider`.
- Public directory (`GET /providers`), self view (`GET /providers/me`).
- `PATCH /providers/:id/verify` — admin stamps `verifiedAt`/`verifiedBy`, which is the gate that opens booking for that provider and triggers an OpenEMR push.
- Soft delete only.

### 1.5 Appointments

- Full FSM: `requested → confirmed → upcoming → in_progress → completed`, with `cancelled`/`no_show` as side-exits from most states.
- `GET /appointments/slots` — real-time availability, cross-referencing provider shift templates against existing bookings.
- `GET /appointments/providers` — available providers for a service type + time.
- Booking validates the provider is verified; auto-spawns a `TelecareSession` in the same transaction when the appointment is confirmed and the service type is telecare-capable (`TeleCare`, `NeuroFlex`).
- Self-service `cancel` / `reschedule`, gated by a configurable `SchedulingPolicy` (window hours, on/off toggle).
- Every lifecycle event notifies: patient, provider, an ops mailbox (`appointments@healthhubafrica.com`), and staff on patient-initiated changes.
- Reminders: 24h-before and 1h-before, queued via Bull.
- Reference formats: `APT-{YEAR}-{6-digit}` for appointments, `TLC-{YEAR}-{4-digit}` for telecare sessions.

### 1.6 Records & Documents

Two related but distinct surfaces:

- **Records** (`/records`) — clinical records + prescriptions. Presigned upload/download URLs; storage usage endpoint.
- **Documents** (`/documents`) — the "My Vault" document store: full CRUD, category/tag/visibility metadata, replace-in-place (new upload + old S3 object deleted), soft-delete.

### 1.7 Labs (CareTest™)

- Orders (`POST/GET /labs/orders`), status FSM (`PATCH /labs/orders/:id/status`), results (`POST /labs/results`) with itemized `LabResultItem` rows.

### 1.8 Vitals

- `POST/GET /vitals` — heart rate, systolic/diastolic BP, SpO2, weight, height, temperature, blood glucose, HbA1c, WBC, RBC, haemoglobin, platelets, sleep hours.

### 1.9 Telecare (TeleCare™)

- Session lifecycle: create, accept, decline, transfer, complete.
- `POST /telecare/on-demand` — coordinator/admin-initiated immediate session.
- Provider shift management (`GET/POST/DELETE /telecare/shifts`), availability toggle.
- SOAP notes (`POST /telecare/notes`).
- **LiveKit** video: `POST /telecare/sessions/:id/token` issues a room token; `POST /telecare/webhooks/livekit` (public) receives room/participant events.
- `GET /telecare/metrics` — provider-facing session stats.

### 1.10 Dispatch (DispatchCare™)

- `POST /dispatch` — emergency request creation.
- `GET /dispatch/units` — coordinator/admin view of dispatch units.
- Status update endpoint with an event trail (`DispatchEvent`).

### 1.11 Expert Review™

- Case creation → specialist assignment (admin/coordinator) → status FSM → specialist notes → final report.
- Patients must explicitly acknowledge a disclaimer (`POST /expert-review/:id/acknowledge-disclaimer`) before the final report is visible to them.
- Full status history in `ExpertReviewStatusEvent`.

### 1.12 Subscriptions & Payments

- Plans are public (`GET /subscriptions/plans`); subscribing to Free is self-service, paid tiers go through `POST /subscriptions/upgrade`, which returns a gateway `authorizationUrl`.
- **Gateways implemented:** Paystack (HMAC-SHA512 webhook verification), Flutterwave (webhook handler), Bank Transfer (manual admin confirmation — `PATCH /admin/payments/:id/confirm`).
- `GET /payments/gateways/status` — surfaces which gateways are currently live.
- `GET /payments/verify?reference=` — public fallback for Paystack's redirect callback.

### 1.13 Notifications

- Channels: **email** (Resend), **SMS**, **push**, **WhatsApp** (channel modeled; delivery processor not fully present in the surveyed code).
- Every send creates a `NotificationDelivery` row *before* enqueueing — so a queue failure is still visible.
- `NotificationRateLimiterService` — silently drops sends over a per-recipient budget (does not error the caller).
- `POST /notifications/webhooks/resend` — Svix HMAC-verified, updates delivery status to `delivered`/`failed`, and mirrors share-link deliveries into `RecordShareAccess`.
- Ops mailbox deliveries use a sentinel user ID and bypass the per-recipient rate limiter.

### 1.14 Consents, Support, Analytics

- **Consents** — grant/revoke records tied to patient + provider.
- **Support** — tickets with threaded messages and a status field.
- **Analytics** — `POST /analytics/events` (fire-and-forget activity tracking), admin-only KPI/revenue/service-usage rollups.

### 1.15 STRIDE™ (Coordinator/Admin only)

An operational intelligence layer over dispatch and clinical queues:

- **STRIDE™ Overview** — aggregate dispatch triage view.
- **HPACS™** (Healthcare Provider Access & Coordination System) — provider availability/routing.
- **EFCE™** (Emergency Field Care Execution) — active field case tracking.
- **Expert Review funnel** — case-pipeline metrics.

### 1.16 Admin Module

The largest module — covers users, audit logs, analytics, system health, operations dashboards (appointments/telecare/dispatch/labs/expert-review), patient/provider/subscription/payment management, feature flags, notifications, share activity, facilities, storage overrides, and scheduling (service groups, shift templates, shift assignments, scheduling policy).

Notably:
- `GET /admin/features` is **public** (no auth) — both frontends read it at startup to decide which nav items to render.
- `POST /admin/providers/import-from-openemr` and `POST /admin/providers/manual-import` — two provider onboarding paths, both super_admin-gated.
- `POST /admin/facilities` is intentionally disabled (returns 400) — OpenEMR is the source of truth for facilities; only import/update/delete are allowed.

### 1.17 CMS

- Public: published blog posts (list + by slug), published testimonials.
- Admin: full CRUD on both, plus a presigned upload endpoint for cover images.

### 1.18 Shares (Secure Record Sharing)

- Patient creates a link (`POST /shares`) with one of three access modes: **open**, **OTP**, **password**.
- Public resolution at `GET /s/:token` (no auth) with OTP/password verification sub-routes.
- Full audit trail per share: `link_sent`, `link_delivered`, `link_opened`, `viewed`, `otp_sent`, `otp_failed`, `otp_verified`, `forward_detected`, `revoked`, `share_expired` — each with IP, user-agent, and visitor email where available.
- Admin visibility into all shares and their activity logs.

### 1.19 TravelSafe™

- Trip CRUD (`POST/GET/PATCH/DELETE /travelsafe/trips`).
- `GET /travelsafe/trips/:id/summary` — merges the trip with the patient's health profile (blood group, genotype, allergies, conditions, medications, next-of-kin) into a single travel-ready summary.

### 1.20 OpenEMR Integration

- OAuth2 authorization-code flow against OpenEMR's FHIR R4 API, scoped to Patient/Observation/DocumentReference/ServiceRequest/MedicationRequest/Practitioner/Encounter/Appointment/Location/Organization (read/write) + `offline_access`.
- Refresh token persisted twice — Redis (hot path) and AWS Secrets Manager (durability).
- **Outbound sync** (queued): patients, encounters, appointments, records, vitals, providers, lab orders.
- **Inbound pull** (scheduled every 15 min): lab results, observations, medications, documents, encounters — each tracked with a Redis cursor so pulls resume where they left off.
- `recover-unsynced` job runs every 30 minutes; failures also land in `IntegrationError` for manual retry from the admin system-errors screen.
- Provider and facility directories are both sourced from OpenEMR (`fetchPractitioners`, `fetchFacilities` — the latter filters out home-address entries).

---

## 2. Patient Portal

Next.js App Router app. Public marketing lives elsewhere; this is the authenticated product.

### 2.1 Routes

| Route | Gated by |
|---|---|
| `/login` | — |
| `/onboarding` | Post-registration profile setup |
| `/share/[token]` | Public (no auth) |
| `/(protected)/dashboard` | Auth |
| `/(protected)/profile` | Auth |
| `/(protected)/appointments` | Auth |
| `/(protected)/records` + `/records/share` | Auth |
| `/(protected)/vault` | Auth |
| `/(protected)/labs` | `lab_orders_enabled` |
| `/(protected)/telecare` | `teleconsult_enabled` |
| `/(protected)/dispatch` | `dispatch_enabled` |
| `/(protected)/travelsafe` | `travelsafe_enabled` |
| `/(protected)/stride` | `neuroflex_enabled` |
| `/(protected)/subscriptions` | Auth |
| `/(protected)/payments` + `/payments/verify` | Auth |
| `/(protected)/settings` | Auth |

### 2.2 Sidebar Navigation

Dashboard → Profile → Appointments → Records → My Vault → CareTest™ Labs → TeleCare™ → DispatchCare™ → TravelSafe™ → Subscriptions → Payments → STRIDE™ AI, then Settings / theme toggle / Sign Out. A floating emergency-dispatch button (pulse-ring animation) appears whenever `dispatch_enabled` is on.

### 2.3 Auth Architecture (BFF pattern)

- Access token (`hha_at`) — JS-readable, SameSite=Strict, 15 min.
- Refresh token (`hha_rt`) — HttpOnly, 7 days, never touched by client JS.
- Next.js route handlers (`/api/auth/login|logout|refresh`) own the HttpOnly cookie; the browser only ever talks to these, not the API directly, for token issuance.
- Client `lib/api.ts` auto-refreshes on 401 and redirects to `/login` on refresh failure.
- Request deduplication: in-flight map + 3-second result cache, to stop concurrent component mounts from tripping rate limits.

### 2.4 Feature Flags Consumed

`lab_orders_enabled`, `teleconsult_enabled`, `dispatch_enabled`, `travelsafe_enabled`, `neuroflex_enabled` — fetched once from the public `GET /admin/features` endpoint at app load.

---

## 3. Admin & Provider Dashboard

Second Next.js app, shared between back-office admins and clinical providers — the sidebar itself changes shape based on role.

### 3.1 Routes by Area

**Provider-only:**
`/provider/telecare` (session hub — video, SOAP notes, transfer), `/provider/shifts`, `/provider/appointments`.

**Management (admin/super_admin):**
`/users`, `/users/[id]`, `/analytics`, `/facilities`, `/patients`, `/providers`, `/scheduling`, `/subscriptions`, `/payments`.

**Operations:**
`/operations/appointments`, `/operations/telecare`, `/operations/dispatch`, `/operations/labs` (admin/super_admin); `/operations/expert-review` (all roles); `/clinical-queue` (admin/super_admin — combined telecare + expert-review wait queue).

**System (admin/super_admin, some super_admin-only):**
`/system/sync` (OpenEMR queue + retry), `/system/errors` (+ retry), `/system/audit-logs` (**super_admin only**), `/feature-flags` (**super_admin only**), `/notifications` (+ resend), `/shares` (share activity).

**Content:**
`/content/blog`, `/content/blog/new`, `/content/blog/[id]`, `/content/testimonials`.

**Shared:**
`/overview` (KPI landing, all roles), `/settings`, `/support`, `/support/[id]`.

### 3.2 Provider Telecare Workspace

Purpose-built components: `CallOverlay` (full-screen LiveKit room), `IncomingCallBanner` (accept/decline), `MetricsGrid` (total/completed/missed/cancelled/avg-duration), `SessionCard`, `SoapNotesModal`, `TransferModal`.

### 3.3 Admin Capabilities Not Yet Mentioned Elsewhere

- Manual provider onboarding that issues a temp password, as an alternative to OpenEMR import.
- Storage quota override per patient.
- Manual bank-transfer payment confirmation (the only "gateway" that isn't self-service).
- Scheduling admin: service groups, shift templates, shift assignments, and a global scheduling policy (the same policy that governs patient-facing cancel/reschedule windows).

---

## 4. Marketing Site

Public-facing Next.js site at myvaultplus.com.

### 4.1 Routes

`/`, `/about`, `/blog`, `/blog/[slug]`, `/contact`, `/corporate`, `/dispatchcare`, `/expert-review`, `/faq`, `/plans`, `/privacy`, `/terms`, `/services`, and one landing page per service: `/services/caretest`, `/healthconsult`, `/minutecare`, `/neuroflex`, `/telecare`, `/travelsafe`.

### 4.2 Services Presented

TeleCare™, MinuteCare™, CareTest™, HealthConsult™, Expert Review™, DispatchCare™, NeuroFlex™, TravelSafe™ — all eight cross-linked from the nav mega-menu, the homepage bento grid, and the footer.

### 4.3 Plans / Pricing

| Plan | Monthly | Launch Annual | Headline inclusions |
|---|---|---|---|
| **Free** | ₦0 | — | Digital Health Passport, PHR storage, Emergency Health Profile, med/appointment reminders, vaccination tracking, pay-per-use access |
| **BasicCare™** | ₦12,500 | ₦99,000 | 2 TeleCare/yr, e-Prescriptions, Care Navigation, discounted CareTest, 1 DispatchCare/yr, 3% no-claim discount |
| **SilverCare™** *(Most Popular)* | ₦24,900 | ₦249,000 | 12 TeleCare/yr, 2 Specialist Second Opinions, Annual Wellness Assessment, chronic disease monitoring, 2 DispatchCare/yr, 5% no-claim discount |
| **GoldCare™** *(Best Value)* | ₦49,900 | ₦499,000 | Everything in Silver + expanded TeleCare, Executive Health Review, dedicated coordinator, 4 priority DispatchCare/yr, TravelSafe™ Nigeria, 7% no-claim discount |
| **ConciergeCare™** | ₦125,000 | ₦999,000 | Dedicated Relationship Manager, monthly wellness check-ins, quarterly reviews, 6 priority DispatchCare/yr, TravelSafe™ Global |

Family pricing scales from 2 to 6–10 members on Silver/Concierge tiers. Corporate tiers: SME (10–50 staff, ₦150/employee), Mid-Market (51–250, ₦125/employee), Enterprise (250+, ₦99/employee). A "Founding Member" discount applies to the first 1,000 signups.

Pay-per-use price list is also published (TeleCare GP ₦10,000, DispatchCare ₦75,000, Specialist Second Opinion ₦50,000, International Second Opinion ₦150,000, NeuroFlex® Assessment ₦150,000, etc.) — this is what non-subscribers pay à la carte.

### 4.4 Homepage Structure

Hero → HeroMarquee (partner logos) → Services bento grid → How It Works → Plans (with monthly/annual toggle) → Testimonials (CMS-sourced) → Why Join → Blog (CMS-sourced) → Savings Calculator (interactive, plan-aware defaults) → Corporate CTA → Final CTA → Footer.

---

## 5. Data Model

57 Prisma models. Grouped by domain:

- **Identity & access:** `User`, `UserSession`, `VerificationToken`
- **Patients:** `Patient`, `PatientMedicalInfo`, `EmergencyContact`, `PatientAlert`, `PatientConsent`, `PatientActivityEvent`
- **Providers & scheduling:** `Provider`, `ProviderAvailability`, `ProviderServiceGroup`, `ShiftTemplate`, `ProviderShiftAssignment`, `SchedulingPolicy`, `PatientProviderAssignment`
- **Appointments & care delivery:** `Appointment`, `AppointmentReminder`, `ClinicalRecord`, `Prescription`, `LabOrder`, `LabResult`, `LabResultItem`, `VitalsReading`
- **Telecare:** `TelecareSession`, `TelecareSessionNote`
- **Dispatch:** `DispatchRequest`, `DispatchEvent`, `DispatchUnit`
- **Facilities:** `HealthcareFacility`
- **Commerce:** `SubscriptionPlan`, `PatientSubscription`, `Payment`, `PaymentLineItem`, `Invoice`
- **Notifications:** `NotificationDelivery`, `NotificationPreference`
- **STRIDE:** `StridePhase`, `StrideTriage`, `ExpertReviewFunnelMetric`
- **Expert Review:** `ExpertReviewCase`, `ExpertReviewDocument`, `ExpertReviewStatusEvent`, `ExpertReviewSpecialistNote`, `ExpertReviewFinalReport`
- **Platform/ops:** `AuditLog`, `SupportTicket`, `SupportMessage`, `IntegrationError`, `OpenemrSyncQueue`
- **Sharing:** `RecordShare`, `RecordShareAccess`
- **Reporting:** `ServiceUsageDaily`, `RevenueSummary`, `OperationalKpi`
- **CMS:** `BlogPost`, `Testimonial`
- **TravelSafe:** `TravelSafeTrip`

Key enums worth noting: `UserRole` (5 values), `ServiceType` (8 services), `AppointmentStatus` (7-state FSM), `SessionStatus` (6), `ExpertReviewStatus` (6), `ShareAccessMode` (password/otp/open), `PlanTier` (5 tiers).

---

## 6. Cross-Cutting Infrastructure

### 6.1 Roles & Authorization

`patient → provider → coordinator → admin → super_admin`, enforced globally via guard + per-route `@Roles()` decorators. Sensitive actions (role changes, audit log access, feature flags, subscription overrides) are locked to `super_admin` specifically, not just any admin.

### 6.2 File Storage (S3)

All uploads are browser-to-S3 via presigned URLs — the API never proxies file bytes. Pattern: presign → client PUT → finalize call creates the DB row. Documents support in-place replace (new object uploaded, old one deleted). Profile photos get a Sharp post-process step (crop/resize/WebP). Per-patient storage quotas are enforced pre-presign and are admin-overridable.

### 6.3 Async Work (Redis + Bull)

- **`notifications` queue** — email/SMS/push/appointment-email/share-email, each with retry + exponential backoff.
- **`appointment-reminders` queue** — 24h and 1h reminder jobs.
- **`openemr` queue** — 5 scheduled 15-minute pull jobs + 1 scheduled 30-minute recovery job, plus one-off outbound sync jobs per resource type.

### 6.4 Payments

Paystack and Flutterwave are live via webhook + signature verification; Bank Transfer is admin-confirmed manually. A gateway-status endpoint lets the frontend know which options to show.

### 6.5 Video (LiveKit)

Powers TeleCare™ sessions end-to-end: token issuance per session, webhook consumption of room/participant lifecycle events, and a dedicated provider-side call UI in the admin dashboard.

### 6.6 Notifications

Four channels are modeled (email/SMS/push/WhatsApp); email is fully wired through Resend with delivery-status webhooks. Every attempted send is logged before it's queued, so a dead queue is still auditable. Per-recipient rate limiting exists to prevent notification floods to a single patient.

### 6.7 OpenEMR (the system of record for clinical/provider/facility data)

Two-way FHIR sync: HHA pushes patients/encounters/appointments/vitals/records/lab-orders out; OpenEMR pushes lab results/observations/medications/documents/encounters back in, on a 15-minute cadence with resumable cursors. Providers and facilities are *sourced from* OpenEMR, not authored independently in HHA (facility creation is explicitly blocked in the admin API for this reason).

### 6.8 Audit & Observability

Every mutating API call is logged to `AuditLog` (actor, role, action, resource, IP, user-agent, severity). Unhandled exceptions are captured to Sentry. Admin has dedicated screens for sync queue health, integration errors, and audit logs (the latter super_admin-only).

### 6.9 Secure Sharing

A patient-controlled, expiring, access-audited link system for sharing records outside the platform — three access modes (open/OTP/password), full event-level audit trail, and admin-side visibility into every share's activity.

---

## Known Gaps Worth Flagging Against the PRD

- **Data export** (`POST /patients/me/request-export`) sends a confirmation email but does not yet generate or deliver an actual export file — the pipeline is a stub.
- **WhatsApp notifications** are modeled in the schema/enum but no delivery processor was found for that channel.
- Three provider records still carried a duplicated "Dr. Dr." title in production data prior to the July 2026 cleanup (see `scripts/cleanup-provider-titles.ts`) — now corrected, but worth confirming the PRD's provider-import spec matches the current normalization behavior (title comes from OpenEMR only, no default assignment).
