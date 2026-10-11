# MyHealth Vault+™ Mobile Application — Implementation Plan

> **Status:** Planning document, derived from `HHA_MyHealth_Vault_Plus_Mobile_App_Developer_Feature_Requirements_v3.pdf` and a direct audit of the existing `health-hub-africa-api` backend.
> **Stack decision:** React Native (Expo, managed workflow).
> **Core principle carried over from the spec:** the existing NestJS API (`health-hub-africa-api`) is the single source of truth. The mobile app is a new client on top of it — not a new backend, not a new patient record.

```
MyHealth Vault+ Backend / API (health-hub-africa-api)  ← source of truth, unchanged
        ↓                              ↓                         ↓
Web Patient Portal              iOS App (Expo/RN)         Android App (Expo/RN)
(health-hub-africa)             ─────────── new: health-hub-africa-mobile ───────────
```

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Backend Audit — What Already Exists](#3-backend-audit--what-already-exists)
4. [Backend Gaps — New Work Required](#4-backend-gaps--new-work-required)
5. [Auth Strategy (Mobile-Specific)](#5-auth-strategy-mobile-specific)
6. [Portal-to-Mobile Feature Parity Matrix](#6-portal-to-mobile-feature-parity-matrix)
7. [Mobile-Native Enhancements](#7-mobile-native-enhancements)
8. [MyChart-Benchmarked Features — Build Order](#8-mychart-benchmarked-features--build-order)
9. [Screen & Navigation Architecture](#9-screen--navigation-architecture)
10. [Data Layer, Sync & Offline Rules](#10-data-layer-sync--offline-rules)
11. [Push Notification Architecture](#11-push-notification-architecture)
12. [Security & Compliance](#12-security--compliance)
13. [Repo Structure & Tooling](#13-repo-structure--tooling)
14. [Release Phasing (V1 / V1.5 / V2)](#14-release-phasing-v1--v15--v2)
15. [Testing Strategy](#15-testing-strategy)
16. [Discovery Checklist Before Sprint 0](#16-discovery-checklist-before-sprint-0)

---

## 1. Executive Summary

The source PDF asks for a mobile-first health companion app that reaches **portal parity first**, layers **mobile-native enhancements second**, and adds **MyChart-benchmarked features third** — all without creating a second source of truth. That principle drives every decision below.

The backend audit in §3 found the API is **further along than the spec assumes** in some areas (vitals, consents, document upload, telecare, record sharing all have working endpoints today) and **has real gaps** in others that need backend work *before* mobile screens can be built against them (device-token registration for push, family/dependent access, secure care-team messaging, prescription refills, wait lists). §4 lists exactly what's missing, scoped to match the PDF's own P0/P1/P2 priorities.

**Recommendation:** build the mobile app in the monorepo as a fourth sibling project (`health-hub-africa-mobile`), consuming the same NestJS API directly (no BFF layer — mobile doesn't need the cookie trick the web apps use), with native secure storage for tokens.

---

## 2. Architecture & Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo (managed workflow)** | Fastest path to a real iOS+Android build with OTA updates; drop to bare/config-plugin only where a native module demands it (HealthKit, Health Connect, LiveKit). |
| Navigation | **Expo Router** (file-based) | Matches the Next.js App Router mental model already used across `health-hub-africa` and `health-hub-africa-admin` — same team, same instincts. |
| Server state | **TanStack Query** | Direct native analogue of the `useApi` hook pattern already used in both web apps (loading/error/refetch, polling support). Swap `useApi` for `useQuery`/`useMutation`; keep the same API client functions. |
| Client state | **Zustand** | Already the standard across both web apps (`authStore`, `useAppStore`) — reuse the same mental model and, where logic is pure, the same store shape. |
| Forms | **react-hook-form** | Already a dependency in `health-hub-africa-admin`; same API works in RN. |
| Auth token storage | **`expo-secure-store`** (iOS Keychain / Android Keystore) | No browser, no HttpOnly cookies available — see §5. |
| Video (TeleCare) | **`@livekit/react-native`** | Same LiveKit Cloud project already used by web (`@livekit/components-react`); no backend change needed, just a new client SDK. |
| Push | **Firebase Cloud Messaging**, via `expo-notifications` | Backend already has a working FCM v1 sender (`NotificationsService.sendPush`) — see §3. Needs a device-token registration endpoint — see §4. |
| Biometrics | **`expo-local-authentication`** | Face ID / Touch ID / Android biometric prompt, gates access to the locally-cached refresh token. |
| Health platforms | **`react-native-health`** (HealthKit) + **`react-native-health-connect`** (Android) | Both are the standard, actively maintained wrappers; matches the PDF's HealthKit/Health Connect requirement directly (§6 of the PDF). |
| Camera / document scan | **`expo-camera`** + **`react-native-document-scanner-plugin`** (or `vision-camera` + a scanning frame processor if more control is needed later) | Auto-crop/deskew requirement in PDF §9. |
| Bluetooth medical devices | **`react-native-ble-plx`** | Deferred to P1/P2 per the PDF — device-neutral architecture, not full device support, is the V1 ask. |
| Error tracking | **`@sentry/react-native`** | Matches `@sentry/nextjs` already used on both web apps — same Sentry org/project, one dashboard. |
| CI/CD & builds | **EAS Build + EAS Submit** | Standard Expo path to App Store / Play Store; EAS Update for OTA JS-only patches between store releases. |

**Explicitly not needed:** a BFF/API-route layer like the web apps' `/api/auth/*` Next.js routes. Those exist purely to set `HttpOnly` cookies from a browser context. Mobile has no browser — it holds tokens in secure native storage and calls `api.myvaultplus.com` directly, same as the web apps' own `lib/api.ts` does for everything *except* login/refresh/logout.

---

## 3. Backend Audit — What Already Exists

Verified directly against `health-hub-africa-api/src` (26 controllers) rather than assumed from the spec.

### Fully ready to consume as-is

| Domain | Controller | Notes |
|---|---|---|
| Auth | `auth.controller.ts` | Register, login, OTP verify, 2FA, forgot/reset password, refresh, logout, profile photo (presigned S3), sessions list/revoke, notification prefs |
| Appointments | `appointments.controller.ts` | Book/list/get/cancel, facilities, provider search — same endpoints power the web booking flow built earlier this project |
| TeleCare | `telecare.controller.ts`, `guest-invite.controller.ts` | Session lifecycle already includes device-check state, guest invites with OTP; LiveKit token issuance already backend-driven |
| Labs | `labs.controller.ts` | Orders + results; results trigger the in-app notification (see §11) already wired for the web notifications panel |
| Vitals | `vitals.controller.ts` | `POST/GET /vitals`, `GET /vitals/:id` — **already exists**, contrary to what a spec-only read might assume. Confirm current metric coverage against the PDF's vitals table (§4 of the PDF) before assuming full parity — likely needs additional metric types added, not a new endpoint. |
| Records / Documents | `records.controller.ts`, `documents.controller.ts` | Clinical records + patient document vault, S3-backed upload |
| Prescriptions | via `records` domain | Patient-facing prescription list already exposed |
| Payments | `payments.controller.ts` | Paystack/Flutterwave, webhook-driven, receipt emails |
| Subscriptions | `subscriptions.controller.ts` | Plan/entitlement state |
| Notifications (in-app) | `notifications.controller.ts` | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` — built for the web notifications panel; the mobile in-app notification center can point at the exact same endpoints |
| Record Sharing | `shares.controller.ts`, `public-share.controller.ts` | Patient-controlled temporary link sharing with expiry, notify-by-email/SMS, access audit trail (`RecordShareAccess`) — this already covers most of PDF §17 (Health Passport) and the "Who's Accessed My Record?" MyChart-benchmarked feature (§32 of the PDF) |
| Consents | `consents.controller.ts` | `POST/GET /consents` — versioned consent capture already exists |
| Expert Review | `expert-review.controller.ts` | Second-opinion case workflow |
| Dispatch | `dispatch.controller.ts` | DispatchCare emergency request flow |
| TravelSafe | `travelsafe.controller.ts` | Trip data |
| Support | `support.controller.ts` | Ticket system (not the same as clinical care-team messaging — see gap below) |
| Stride (AI) | `stride.controller.ts` | Existing AI surface — evaluate for reuse under PDF §12/§13 (AI Symptom Intake, Ask My Record) rather than building a parallel AI layer |

### Backend infrastructure that's built but has zero callers yet

| Capability | Where | Gap |
|---|---|---|
| FCM push sending | `NotificationsService.sendPush(fcmToken, subject, body, userId)` — full FCM v1 HTTP API implementation, `FIREBASE_PROJECT_ID`/`FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL` already in `.env.example` | Nothing in the codebase calls it yet, and there's no persisted device-token table — see §4 |

---

## 4. Backend Gaps — New Work Required

Scoped and priority-tagged to match the PDF's own P0/P1/P2 scheme. **These are prerequisites for the mobile screens that depend on them** — sequence accordingly, don't discover them mid-sprint.

| # | Gap | Needed for | Priority | Scope estimate |
|---|---|---|---|---|
| 1 | `DeviceToken` model (`userId`, `token`, `platform`, `createdAt`, `lastSeenAt`) + `POST /notifications/devices` (register) + `DELETE /notifications/devices/:id` (unregister) | Push notifications (PDF §15, §37) | P0 | Small — one migration, one small service extension to the already-built `NotificationsService`, wire into the same trigger points already used for in-app alerts (appointment/lab/payment events) |
| 2 | Family/Dependents/Proxy access — new model(s) for guardian↔dependent relationships, consent/guardianship rules, scoped-access enforcement on every existing patient-scoped endpoint | Family & Dependents (PDF §18), Friends & Family Proxy Access (PDF §32) | P1 | Large — touches auth/authorization middleware across most controllers, needs real legal/consent review per the PDF's own caveat ("age, consent, guardianship and access-control rules approved by HHA") |
| 3 | Secure Care-Team Messaging — new `Conversation`/`Message` models, patient↔clinician inbox, attachments, category routing (clinical/customer-service/billing) | PDF §32 | P1 | Large — new domain end to end |
| 4 | Prescription Refill Requests — new `RefillRequest` model + endpoints, pharmacy-selection field, status lifecycle (requested/approved/declined/ready) | PDF §10, §32 | P1 | Medium |
| 5 | Wait List — `AppointmentWaitlist` model, capacity-open matching logic | PDF §32 | P1 | Medium |
| 6 | Provider Finder — confirm `providers.controller.ts` supports filter-by-specialty/location/language/availability for patient-facing search (today's usage is mostly booking-context provider lists); extend query params if not | PDF §32 | P1 | Small–Medium, pending confirmation |
| 7 | Care Plans / Care Companion — new `CarePlan`/`CarePlanTask` models, clinician-assigned, tied to reminders + questionnaires | PDF §32 | P1 | Large |
| 8 | Patient Questionnaires — new `Questionnaire`/`QuestionnaireResponse` models, clinician-assignable | PDF §32 | P1 | Medium–Large |
| 9 | Preventive Care / Care Gap Dashboard — rules engine for due/overdue screenings tied to patient demographics + history | PDF §32 | P1 | Medium, depends on #8/#7 data model |
| 10 | Growth Charts (pediatric) — depends on #2 (dependents) existing first | PDF §20 | P1 | Small once #2 lands |
| 11 | Insurance/HMO Information — new model, display-only initially | PDF §32 | P1 | Small |
| 12 | Cost Estimate Before Care — pricing lookup exposed pre-booking | PDF §32 | P1 | Small–Medium |
| 13 | eCheck-In — pre-arrival flow (demographics/consent/payment confirmation) tied to existing appointment + consent + payment endpoints | PDF §32 | P1 | Medium, mostly orchestration of existing pieces |
| 14 | Asynchronous E-Visit — new encounter type, photo/video/questionnaire submission without a live TeleCare session | PDF §32 | P1 | Medium–Large |
| 15 | AI-assisted features (Symptom Intake, Health Summary, Ask My Record, Result Explanation, Navigation Assistant) | PDF §12, §13, §32 | P1/P2 | Evaluate `stride.controller.ts` first — may already be the right foundation rather than a clean build |

**Not a gap, just a config task:** the S3 bucket CORS policy needs `capacitor://localhost` / the app's custom scheme (or, for Expo, the dev-client origin) added if any direct-from-app-to-S3 upload path is used outside of `expo-file-system` background uploads — verify during Sprint 0, don't assume.

---

## 5. Auth Strategy (Mobile-Specific)

The web apps' cookie-based BFF pattern (`hha_at`/`hha_rt`, `SameSite=Strict`, Next.js `/api/auth/*` route handlers) exists **specifically because a browser needs `HttpOnly` cookies to keep the refresh token off JS**. Mobile has no browser and no equivalent threat model — the correct native pattern is:

1. **Login / register / OTP verify / refresh / logout** call the NestJS API **directly** (`POST /auth/login`, etc. — same endpoints the web BFF proxies to today, no new backend work needed).
2. **Access token** (15 min expiry, same `JWT_EXPIRY`) held **in memory** (a Zustand store, not persisted) — re-fetched via refresh on cold start.
3. **Refresh token** (7 day expiry, same `JWT_REFRESH_EXPIRY`) stored in **`expo-secure-store`**, which backs onto iOS Keychain / Android Keystore.
4. **Biometric gate**: on app open, if a refresh token exists in secure storage, require Face ID/Touch ID/biometric prompt (`expo-local-authentication`) before reading it and hitting `/auth/refresh`. Fall back to password login if biometrics are unavailable/declined.
5. **Sessions**: mobile logins already land in the existing `UserSession` table (device/IP/userAgent tracked) — no schema change. The existing `GET /auth/sessions` / `DELETE /auth/sessions/:id` endpoints let a patient see and revoke a lost phone's session from either the web portal or the app itself. Surface this in Account Settings (parity item, not new work).
6. **Passkeys** (PDF §32, P1): defer to V1.5 — requires WebAuthn-equivalent native support (`expo-passkeys` or platform APIs) and a backend passkey-credential model that doesn't exist yet; treat as its own gap, not bundled into V1 auth.

---

## 6. Portal-to-Mobile Feature Parity Matrix

Reproducing the PDF's matrix (§36), with the **API/Backend Dependency** column corrected against the real controller inventory from §3, and a **Status** column added.

| Portal Feature | API Dependency (confirmed) | Status | Priority |
|---|---|---|---|
| Account Registration & Login | `auth.controller.ts` | ✅ Ready | P0 |
| Patient Profile | `auth.controller.ts` (profile photo), `patients.controller.ts` | ✅ Ready | P0 |
| Subscription / Plan | `subscriptions.controller.ts` | ✅ Ready | P0 |
| Storage | `documents.controller.ts` | ✅ Ready | P0 |
| Medical Records | `records.controller.ts` | ✅ Ready | P0 |
| Visit Notes / Clinical Notes | `records.controller.ts` | ✅ Ready | P0 |
| After-Visit Summary | `records.controller.ts` (confirm AVS is a distinct release flag vs. a general record) | ⚠️ Confirm release-state modeling | P0 |
| Prescriptions | `records.controller.ts` domain | ✅ Ready | P0 |
| Medications (adherence UI) | Same, mobile-native Take/Skip/Snooze is local UI + reminder scheduling | ✅ Ready (backend); reminders are client-local | P0/P1 |
| Lab / Test Results | `labs.controller.ts` | ✅ Ready | P0 |
| Appointments | `appointments.controller.ts` | ✅ Ready | P0 |
| TeleCare | `telecare.controller.ts` | ✅ Ready | P0 |
| HHA Service Booking | `appointments.controller.ts` + service-specific controllers (`dispatch`, `travelsafe`, `expert-review`) | ✅ Ready | P0 |
| Payments | `payments.controller.ts` | ✅ Ready | P0 |
| Billing / Receipts | `payments.controller.ts` | ✅ Ready | P1 |
| Notifications | `notifications.controller.ts` (in-app) + **Gap #1** (push) | ⚠️ In-app ready, push needs Gap #1 | P0 |
| Record Sharing | `shares.controller.ts` | ✅ Ready | P0 |
| Emergency Profile | `dispatch.controller.ts` (confirm dedicated Emergency Profile fields exist vs. need adding) | ⚠️ Confirm during discovery | P0/P1 |
| Support / Help | `support.controller.ts` | ✅ Ready | P0 |
| Account Settings | `auth.controller.ts` (2FA, notification prefs, sessions), `patients.controller.ts` | ✅ Ready | P0 |
| Account Deletion | Confirm dedicated endpoint exists — not seen in controller audit | ❌ **Gap — verify/build** | P0 |
| Family / Dependents | **Gap #2** | ❌ Not built | P1 |
| Provider / Care Team | `providers.controller.ts` | ✅ Ready (booking-context); extend for directory view — **Gap #6** | P1 |
| Preferred Pharmacy | Not found in audit | ❌ **Gap — new field/endpoint, small** | P1 |
| Patient Documents Upload | `documents.controller.ts` | ✅ Ready | P0 |
| Consent & Legal Documents | `consents.controller.ts` | ✅ Ready | P0 |
| Audit / Access History | `shares.controller.ts` → `RecordShareAccess` | ✅ Ready (covers sharing-triggered access); confirm coverage for other access events | P1 |

---

## 7. Mobile-Native Enhancements

Direct implementation notes for the PDF's §37 list:

- **Biometric auth** — `expo-local-authentication`, gates refresh-token read per §5.
- **Push + deep links** — `expo-notifications` + `expo-router` deep-link handling; notification payload should carry the same `actionUrl` shape already used by the web `NotificationsPanel` (`/appointments`, `/labs`, `/telecare`, etc.) so the deep-link mapping is a shared constant, not reinvented per platform.
- **Camera document scanning** — `expo-camera` + scanning plugin, uploads through the **existing** presigned-S3 flow (`documents.controller.ts`), same as web. OCR metadata extraction (PDF §9) is a backend or third-party OCR call, not a mobile-only feature — route photo through the existing document upload, then call a (possibly new) OCR endpoint rather than running OCR on-device, to keep extraction logic server-side and auditable.
- **HealthKit / Health Connect** — `react-native-health` / `react-native-health-connect`, writes land through the **existing** `vitals.controller.ts` `POST /vitals` with a `source` field distinguishing manual/imported/device — confirm that field exists today or add it as part of Gap review, since provenance tracking is a P0 requirement in the PDF (§4).
- **Bluetooth devices** — deferred (P1/P2 per PDF §24), `react-native-ble-plx` when built.
- **QR workflows** — Health Passport QR reuses `shares.controller.ts` link-sharing (encode the share URL/token as a QR, don't invent a parallel sharing mechanism). Clinic check-in QR is new scope tied to Gap #13 (eCheck-In).
- **Location for DispatchCare** — `expo-location`, foreground-only, explicit permission prompt immediately before a dispatch request, never background-tracked.
- **Encrypted offline Emergency Profile** — cache a minimal, explicitly-scoped subset (allergies, medications, conditions, emergency contacts, blood group) in `expo-secure-store`, refreshed on every successful app foreground/sync; **never** cache the full record offline per the PDF's explicit constraint.
- **Voice input** — `expo-speech` (or platform speech-to-text) for symptom/vitals entry, always routed through the same confirmation step already required for OCR-extracted data — no silent writes.

---

## 8. MyChart-Benchmarked Features — Build Order

The PDF lists ~25 MyChart-benchmarked features (§32) as mostly P1/P2. Given they mostly require **new backend domains** (§4), sequence by leverage, not by the PDF's listing order:

**Tier 1 — highest leverage, smallest backend lift** (do first, V1.5):
1. Who's Accessed My Record? — **already ~90% built** (`RecordShareAccess`), just needs a patient-facing read endpoint + mobile screen.
2. Provider/Care Team Directory — small extension of `providers.controller.ts`.
3. Preferred Pharmacy — trivial new field.
4. Cost Estimate + Billing Summary — mostly display work over existing `payments`/`subscriptions` data.
5. Passkeys — security/convenience win, independent of other gaps (see §5 caveat on scope).

**Tier 2 — meaningful new domains, clear patient value** (V1.5–V2):
6. Prescription Refill Requests (Gap #4).
7. Wait List (Gap #5).
8. eCheck-In (Gap #13) — mostly orchestration, not a new domain.
9. Secure Care-Team Messaging (Gap #3) — biggest single lift, biggest patient-facing value.

**Tier 3 — depends on Tier 2 or on Family/Dependents landing first** (V2):
10. Care Plans / Care Companion (Gap #7).
11. Patient Questionnaires (Gap #8).
12. Preventive Care / Care Gap Dashboard (Gap #9).
13. Growth Charts for Children (needs Gap #2 first).
14. Asynchronous E-Visit (Gap #14).

**Tier 4 — explicitly P2 in the source PDF, no reason to pull forward:**
Research/Program Eligibility, Advance Directives, Inpatient Companion, Payment Plans, Paperless Statements, External Health Record Linking (FHIR interop with *other* orgs).

---

## 9. Screen & Navigation Architecture

Expo Router, file-based, mirroring the existing web portal's route naming where the concept is shared (keeps the deep-link `actionUrl` mapping trivial):

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   ├── otp-verify.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (tabs)/                        # bottom tab navigator, post-login
│   ├── index.tsx                  # Home — vitals CTA, Today, Your Health, recent activity
│   ├── vitals/
│   ├── appointments/
│   ├── records/
│   │   ├── index.tsx
│   │   ├── prescriptions.tsx
│   │   ├── results.tsx
│   │   └── documents.tsx
│   ├── telecare/
│   ├── services/                  # HHA Service Hub — DispatchCare, MinuteCare, CareTest, etc.
│   └── profile/
│       ├── index.tsx
│       ├── settings.tsx
│       ├── sessions.tsx
│       ├── notifications-prefs.tsx
│       └── connected-devices.tsx  # HealthKit/Health Connect + (later) BLE device management
├── emergency/                     # outside the tab bar — always one tap from anywhere
├── share/[token].tsx              # deep-link target for shared-record viewing
└── modals/
    ├── document-scan.tsx
    ├── crop-photo.tsx
    └── consent-review.tsx
```

Bottom-tab primary actions match the PDF's recommended home screen (§3): Check My Vitals, Talk to a Doctor/TeleCare, Book Care, My Health Records, Medications, Test Results, Emergency/DispatchCare — condensed into a 5-tab bar (Home, Vitals, Records, TeleCare, Profile) with Emergency as a persistent floating/pinned action rather than a 6th tab, so it's reachable from every screen without competing for tab-bar space.

---

## 10. Data Layer, Sync & Offline Rules

Directly inherited from the PDF §39, made concrete:

- **No local clinical master record.** TanStack Query's cache is a *view* cache (with a sane `staleTime`/`gcTime`), never a write-through local database. No WatermelonDB/Realm-style offline-first data layer for clinical data — that would violate the single-source-of-truth principle the whole spec is built on.
- **All writes go through the existing NestJS endpoints.** Same DTOs, same validation, same rate limiting the web apps already hit — the mobile API client (`lib/api.ts` equivalent) should be a near-line-for-line port of the patient portal's existing client, not a reinvention.
- **Idempotent retries** — TanStack Query mutations get an idempotency key (UUID generated client-side, sent as a header) on create-type calls (appointments, payments, uploads, messages) so a retry after a dropped connection can't double-book/double-charge. **This likely needs a small backend addition** — confirm whether any existing POST endpoints already accept/enforce an idempotency key; if not, this is effectively Gap #16, small scope, high value given the PDF's explicit "poor network" requirement (§27).
- **Sync state UI** — a lightweight "pending" badge on any optimistically-rendered mutation until the server confirms, matching the pattern already used in the web `NotificationsPanel`'s optimistic mark-read (`setLocalItems` then reconcile on response).
- **Conflict resolution** — server wins, always. Mobile never silently overwrites a newer server value; on a 409/conflict response, surface it and require the user to re-view fresh data before retrying.

---

## 11. Push Notification Architecture

Ties together §3's finding (FCM sender built, unused) and §4's Gap #1 (no device-token storage):

1. On login (and on token refresh, in case the OS token rotated), the app calls `expo-notifications` to get the device's push token, then `POST /notifications/devices { token, platform }` (**new endpoint, Gap #1**).
2. The **same trigger points already wired for in-app `PatientAlert` creation** — appointment confirmed/cancelled/rescheduled/completed, lab results ready, payment successful, 24h/1h appointment reminders (all built earlier in this project's notifications work) — get a **parallel call to `NotificationsService.sendPush()`** for any of the user's registered device tokens, reusing the exact same title/body copy already written for the in-app alert. This is additive, not a rebuild: one new call per existing trigger site, not a new notification pipeline.
3. Notification payload includes `actionUrl` (already a field on `AppNotification`) so the app's deep-link handler can route directly to the relevant screen (§9), matching PDF §11's "deep-link appropriate notifications directly to the visit or follow-up screen."
4. On logout, `DELETE /notifications/devices/:id` for the current device's token.

---

## 12. Security & Compliance

Everything the PDF's §26 asks for either already exists as a backend pattern (reuse) or is a mobile-specific addition (new):

| Requirement | Approach |
|---|---|
| Biometric login | §5 |
| Secure token storage | §5 — `expo-secure-store` |
| TLS in transit | Already enforced API-side; nothing mobile-specific needed |
| No PHI in crash logs / analytics | Configure `@sentry/react-native` with the same PII-scrubbing the web apps already need to have (confirm `beforeSend` scrubbing is already in place on `@sentry/nextjs` config and port the same rules) |
| Role/object-level authorization | Already backend-enforced (`@Roles()`, `@CurrentUser()` pattern seen across every controller) — mobile inherits this for free by calling the same endpoints; **never** implement authorization logic client-side |
| Consent & permission management | Native OS permission prompts (camera, mic, location, health data) — `expo-camera`, `expo-location`, HealthKit/Health Connect consent screens are platform-provided, not custom-built |
| Audit sensitive actions | Already covered for sharing (`RecordShareAccess`); confirm coverage for other sensitive mobile-initiated actions during discovery |
| Account deletion | Flagged as a gap to verify/build in §6 |
| Pen-testing before launch | Schedule against the existing HHA security review process (`SECURITY.md` at repo root) before App Store/Play submission |
| Clinical thresholds require HHA approval | Applies identically to mobile vitals Green/Amber/Red logic — **do not** hardcode thresholds in the mobile client; fetch from the same clinician-approved config source the web trend logic uses (confirm this is server-driven today, not hardcoded in `health-hub-africa` — if it *is* hardcoded there, that's a shared gap to fix once, not duplicate per-platform) |

---

## 13. Repo Structure & Tooling

This repo is **not** a linked npm/yarn/pnpm workspace monorepo — it's four independent projects (`health-hub-africa`, `health-hub-africa-admin`, `health-hub-africa-api`, `myvaultplus-web`) sitting side by side, each deployed independently. The mobile app follows the same convention:

```
Health Hub Africa/
├── health-hub-africa/          # existing — patient portal (Next.js)
├── health-hub-africa-admin/    # existing — admin/provider dashboard (Next.js)
├── health-hub-africa-api/      # existing — NestJS API (shared backend)
├── myvaultplus-web/            # existing — marketing site (Next.js)
└── health-hub-africa-mobile/   # NEW — Expo/React Native app
    ├── app/                    # Expo Router screens (§9)
    ├── components/
    ├── lib/
    │   ├── api.ts               # ported from health-hub-africa/lib/api.ts
    │   ├── stores/               # Zustand — authStore, etc.
    │   └── hooks/
    ├── app.json / app.config.ts
    ├── eas.json
    └── package.json
```

No changes to `health-hub-africa-api`'s deployment topology — it already serves `api.myvaultplus.com` over HTTPS with CORS/rate-limiting in place; the mobile app is just another CORS-exempt native client (mobile requests don't carry an `Origin` header the same way browsers do, so the existing CSP/CORS work done for the web apps doesn't block mobile — confirm the API's CORS config allows requests with no `Origin` header, which is the typical native-app signature, during Sprint 0).

---

## 14. Release Phasing (V1 / V1.5 / V2)

Directly from the PDF §28, cross-referenced against §4's gap list so the phasing is achievable, not aspirational:

### V1 — Production Foundation
Auth/biometrics (§5) · Dashboard · Health record, results, prescriptions (all backend-ready, §3) · TeleCare (backend-ready) · Appointments (backend-ready) · Manual/imported vitals + trends (backend-ready, confirm metric coverage) · Apple Health/Health Connect · Reminders (client-local) · Push + in-app + email + SMS (push needs Gap #1) · Document scanner · Secure sharing (backend-ready) · Emergency Profile (confirm/extend) · DispatchCare access (backend-ready) · HHA service booking (backend-ready) · Payments (backend-ready).

**V1 blockers to close first:** Gap #1 (push device tokens), Account Deletion verification, Emergency Profile field confirmation.

### V1.5 — Engagement & Intelligence
Enhanced device integrations · AI symptom intake / health summary (evaluate `stride.controller.ts` reuse) · Medication OCR/reminders · Family/dependents (Gap #2) · RPM foundation · Clinic check-in (Gap #13) · Improved lab trends · Tier 1 + start of Tier 2 MyChart-benchmarked features (§8).

### V2 — Advanced Platform
Advanced RPM · Personalized care pathways · TravelSafe intelligence · NeuroFlex longitudinal data · Voice workflows · Expanded connected-device support · Remaining Tier 2/3 MyChart-benchmarked features · Predictive/health-scoring features (with clinical validation).

---

## 15. Testing Strategy

Consistent with this repo's existing testing conventions (Jest on the API, no mobile precedent yet to match — set one):

- **Unit** — Jest + `@testing-library/react-native` for components/hooks; mirror the API's existing Jest conventions where shared logic (e.g., a ported validation util) is literally the same code.
- **API contract** — the mobile client should be tested against the **same** API, not a mock server, for critical flows (auth, booking, payment) — spin up the existing `health-hub-africa-api` locally (already has a working local-dev path per this repo's `deployment.md`) rather than maintaining a parallel mock.
- **E2E** — Detox or Maestro for critical flows: login → biometric re-auth, book appointment, join TeleCare, upload a document, create a share link. Matches the web apps' Playwright-for-critical-flows convention in spirit.
- **Manual device matrix** — minimum iOS (latest + latest-1) and Android (API 33+, a low-end device for performance), given the PDF's explicit low-bandwidth/low-end-device requirement (§27).

---

## 16. Discovery Checklist Before Sprint 0

Concrete, not generic — resolve these against the real codebase before writing mobile screens against assumptions:

- [ ] Confirm `vitals.controller.ts`'s current metric coverage against the PDF §4 table (heart rate, BP, SpO₂, temp, resp rate, weight/BMI, glucose, pain score) — extend the DTO if any are missing.
- [ ] Confirm whether vitals readings persist a `source`/provenance field today (manual/imported/device) — PDF §4 requires this at P0.
- [ ] Confirm whether an Account Deletion endpoint exists anywhere (not found in the §3 audit) — build if missing, since it's a P0 store-submission requirement for both Apple and Google.
- [ ] Confirm Emergency Profile field modeling — does `dispatch.controller.ts` or `patients.controller.ts` already expose allergies/medications/conditions/emergency-contacts/blood-group as a distinct queryable set, or does the mobile app need to assemble it from multiple endpoints?
- [ ] Confirm the API's CORS configuration doesn't implicitly require an `Origin` header (native app requests typically don't send one).
- [ ] Confirm whether Green/Amber/Red vitals-trend thresholds are server-driven config today or hardcoded in `health-hub-africa` — if hardcoded, extracting to a shared server-driven source is a prerequisite for *any* client duplicating the logic safely.
- [ ] Evaluate `stride.controller.ts` as the foundation for AI Symptom Intake / Ask My Record / Result Explanation before scoping those as net-new work.
- [ ] Confirm idempotency-key support (or lack of it) on create-type endpoints (§10) — needed for the PDF's explicit poor-network/duplicate-submission requirement.
- [ ] Set up Firebase project credentials in a mobile-specific `.env`/EAS secret (the backend already has `FIREBASE_PROJECT_ID`/`FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL` — the mobile app needs its own `google-services.json`/`GoogleService-Info.plist` from the *same* Firebase project for `expo-notifications` to receive pushes).
- [ ] Legal/compliance review of Family & Dependents guardianship rules (Gap #2) — explicitly flagged as needing "HHA clinical/legal approval" in the source PDF, not a pure engineering decision.
