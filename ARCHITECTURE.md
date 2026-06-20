# MyHealth Vault+™ — System Architecture & Overview

> Last updated: 2026-06-19  
> Stack: Next.js · NestJS · PostgreSQL · Redis · OpenEMR (FHIR) · AWS

---

## Table of Contents

1. [High-Level Diagram](#1-high-level-diagram)
2. [Frontend](#2-frontend)
3. [Backend API](#3-backend-api)
4. [Data Layer](#4-data-layer)
5. [OpenEMR Integration Layer](#5-openemr-integration-layer)
6. [Authentication & OAuth Flow](#6-authentication--oauth-flow)
7. [Patient Registration & Sync Flow](#7-patient-registration--sync-flow)
8. [Document Management Flow](#8-document-management-flow)
9. [Notification Pipeline](#9-notification-pipeline)
10. [Video Consultation Flow (TeleCare™)](#10-video-consultation-flow-telecare)
11. [Payment Flow](#11-payment-flow)
12. [Third-Party Integrations](#12-third-party-integrations)
13. [Security Controls](#13-security-controls)
14. [Infrastructure (AWS)](#14-infrastructure-aws)

---

## 1. High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS / BROWSERS                                │
└───────────────────────────┬─────────────────────────────────────────────────┘
                            │ HTTPS
          ┌─────────────────▼──────────────────────┐
          │         AWS Application Load Balancer    │
          │   api.myvaultplus.com (port 443)         │
          └──────┬────────────────────────┬──────────┘
                 │                        │ clinical.myvaultplus.com
    ┌────────────▼──────────┐   ┌─────────▼──────────────────┐
    │   NestJS API           │   │   OpenEMR (EC2 + Apache)    │
    │   ECS Fargate          │   │   clinical.myvaultplus.com  │
    │   hha-api-service      │   │   FHIR R4 + REST API        │
    └──┬───┬───┬────────────┘   └────────────────────────────┘
       │   │   │
       │   │   └─────────────────────────────────────────┐
       │   │                                             │
  ┌────▼───▼────────────┐    ┌──────────────────┐   ┌───▼────────────────┐
  │  AWS RDS             │    │  AWS ElastiCache  │   │  AWS S3            │
  │  PostgreSQL          │    │  Redis            │   │  (documents,       │
  │  (primary data)      │    │  (queues, tokens) │   │   profile photos)  │
  └─────────────────────┘    └──────────────────┘   └───────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │                    Next.js Frontend                                   │
  │                    (Vercel / CDN or separate deployment)              │
  │   myvaultplus.com   ·   Patient Dashboard   ·   Provider Portal      │
  └──────────────────────────────────────────────────────────────────────┘

  Third-party services (outbound only from NestJS API):
  ┌───────────┐  ┌──────────────────┐  ┌──────────┐  ┌──────────────────┐
  │  Resend   │  │  Africa's Talking │  │ Paystack  │  │   LiveKit Cloud  │
  │  (email)  │  │  (SMS)           │  │Flutterwave│  │  (video rooms)   │
  └───────────┘  └──────────────────┘  └──────────┘  └──────────────────┘

  Observability:
  ┌────────────┐  ┌─────────────────────┐
  │  Sentry    │  │  AWS CloudWatch Logs │
  │  (errors)  │  │  (container stdout)  │
  └────────────┘  └─────────────────────┘
```

---

## 2. Frontend

**Framework:** Next.js 14+ (App Router) — deployed as a standalone web app.  
**State:** Zustand (`authStore`, `useAppStore`).  
**Auth tokens:** Stored in `SameSite=Strict; Secure` cookies (`hha_at` access, `hha_rt` refresh). Next.js middleware guards all routes except `/login` and `/onboarding`.

### Screens & Pages

| Section | Screens |
|---|---|
| Auth | Login · Register · Email OTP verify · Forgot password · Reset password |
| Onboarding | Multi-step patient profile setup (name, DOB, gender, blood group, contacts, consents) |
| Dashboard | KPI cards, active conditions, recent activity |
| Profile | Personal info, profile photo, medical summary |
| Appointments | Book, view, cancel appointments with providers |
| Records | Clinical records, prescriptions, uploaded documents |
| CareTest™ Labs | Lab orders, result history, visualisations |
| TeleCare™ | Video consultation scheduling and live room (LiveKit) |
| DispatchCare™ | Emergency dispatch request, real-time status timeline |
| Subscriptions | Plan tiers, upgrade/downgrade |
| Payments | Payment history, initiate payments |
| STRIDE™ AI | Dispatch operations overview, field unit tracking |
| Settings | Notification preferences, security, account |

### Layout Components

```
AppShell
├── Sidebar          (desktop — collapsible, theme toggle, sign out)
├── Topbar           (breadcrumb, search, notifications, sign out on mobile)
├── MobileBottomNav  (Home, Appointments, Dispatch, Profile, AI)
├── RightPanel       (contextual detail panel, desktop)
└── MobilePanelSheet (slide-in sheet for mobile)
```

### Data Flow (Frontend → API)

```
Component
  └── Zustand store (authStore / useAppStore)
        └── lib/api.ts  ──fetch──►  NestJS API
              ├── Cookie: hha_at (access token, 15 min)
              └── Cookie: hha_rt (refresh token, 7 days, auto-rotated)
```

GET requests are deduplicated in `lib/api.ts` with a 3-second in-memory cache to prevent duplicate fan-out on concurrent component mounts.

---

## 3. Backend API

**Framework:** NestJS with Fastify adapter.  
**Runtime:** Node.js on AWS ECS Fargate (single service `hha-api-service`, cluster `hha-cluster`, region `af-south-1`).  
**Image registry:** AWS ECR.

### Global Middleware & Guards

| Layer | What it does |
|---|---|
| `JwtAuthGuard` | Verifies `hha_at` JWT on every request; public routes are decorated `@Public()` |
| `RolesGuard` | Enforces `@Roles(UserRole.admin)` decorators |
| `UserThrottlerGuard` | Redis-backed rate limiter: 100 req/min global, 10 req/min on auth endpoints |
| `AuditLogInterceptor` | Writes a row to `audit_logs` for every mutating request |
| `GlobalExceptionFilter` | Maps Prisma P2002 → 409, P2025 → 404; captures all errors to Sentry |

### API Modules

```
src/
├── auth/            JWT auth, OTP (email + SMS), password reset, session management
├── patients/        Patient CRUD, profile photos (S3 presigned URLs)
├── providers/       Healthcare provider management
├── appointments/    Scheduling, status transitions, OpenEMR encounter sync
├── records/         Clinical records, prescriptions, file attachments (S3)
├── labs/            Lab orders, results, OpenEMR ServiceRequest sync
├── vitals/          Vital signs readings, OpenEMR Observation sync
├── telecare/        TeleCare™ sessions, LiveKit token generation
├── dispatch/        DispatchCare™ emergency requests, timeline events
├── expert-review/   Second opinion cases, documents, specialist notes
├── subscriptions/   Subscription plans, patient subscriptions
├── payments/        Paystack + Flutterwave initiation, webhook verification
├── openemr/         OAuth2 setup, FHIR sync queue, admin retry endpoints
├── notifications/   Email (Resend) + SMS (Africa's Talking) + Push + WhatsApp
├── consents/        GDPR consent records
├── support/         Support ticket management
├── analytics/       Platform-level metrics (admin)
├── stride/          STRIDE™ operational overview (dispatch + expert review KPIs)
└── admin/           Admin-only user and system management
```

---

## 4. Data Layer

### PostgreSQL (AWS RDS)

Primary store for all patient and operational data. Accessed via **Prisma ORM**.

```
Core tables:

users                    Authentication identity (email, passwordHash, isVerified, role)
  └── user_sessions      JWT refresh token sessions (rotation on every use)
  └── verification_tokens  OTP tokens stored as bcrypt hashes

patients                 Clinical profile (name, DOB, gender, blood group, address,
  │                      openemrPatientUuid, openemrSyncStatus, hhaPatientId)
  ├── patient_medical_info      Allergies, chronic conditions
  ├── emergency_contacts
  ├── vitals_readings           Heart rate, BP, SpO2, weight, glucose…
  ├── clinical_records          Documents, prescriptions (file keys → S3)
  │     └── prescriptions       Drug, dosage, frequency, refills
  ├── lab_orders
  │     └── lab_results
  ├── appointments
  ├── telecare_sessions
  ├── dispatch_requests
  │     └── dispatch_timeline_events
  ├── expert_review_cases
  │     ├── expert_review_documents
  │     ├── expert_review_status_events
  │     └── expert_review_final_report
  ├── patient_subscriptions
  └── payments

providers                Healthcare provider profiles (openemrProviderUuid)
plans                    Subscription plan definitions
openemr_sync_queue       Audit trail of every sync job (status, errors, attempts)
integration_errors       HTTP-level errors from OpenEMR API calls
audit_logs               Immutable record of all API mutations
notification_logs        Sent notifications (channel, status)
support_tickets
consents
```

### Redis (AWS ElastiCache)

| Key pattern | Purpose |
|---|---|
| `openemr:refresh_token` | OpenEMR OAuth2 refresh token (single key, survives restarts) |
| `openemr:oauth_state:<uuid>` | CSRF state for OAuth initiation (10 min TTL) |
| `bull:openemr-sync:*` | Bull queue: patient/encounter/vitals/record/lab sync jobs |
| `bull:notifications:*` | Bull queue: email, SMS, push notification jobs |
| `throttler:<key>` | Per-user / per-IP rate-limit counters |
| `notif-rate:<channel>:<recipient>` | Per-recipient notification rate limiter |

---

## 5. OpenEMR Integration Layer

OpenEMR runs in a Docker container on an EC2 instance behind the same ALB at `clinical.myvaultplus.com`. The NestJS API communicates with it over HTTPS via FHIR R4 and OpenEMR's REST API.

### Resource Mapping

| HHA Entity | OpenEMR Resource | Protocol |
|---|---|---|
| Patient | `Patient` (FHIR) | `POST /fhir/Patient` |
| Appointment | Encounter | `POST /api/patient/:uuid/encounter` |
| Clinical Record | `DocumentReference` (FHIR) | `POST /fhir/DocumentReference` |
| Prescription | `MedicationRequest` (FHIR) | `POST /fhir/MedicationRequest` |
| Lab Order | `ServiceRequest` (FHIR) | `POST /fhir/ServiceRequest` |
| Lab Result | `DiagnosticReport` (FHIR, pull) | `GET /fhir/DiagnosticReport` |
| Vitals | `Observation` bundle (FHIR) | `POST /fhir` (transaction bundle) |
| Provider | Practitioner | `POST /api/practitioner` |

### Sync Architecture

```
NestJS service (e.g. patients.service.ts)
  └── openemrService.enqueuePatientSync(patientId)
        └── Bull Queue: openemr-sync  ──stored in──►  Redis
              └── OpenemrProcessor  (Bull worker, concurrency 2)
                    ├── getAccessToken()      (cached in memory, refreshed via Redis)
                    ├── Search by HHA identifier  (deduplication guard)
                    ├── POST/PUT /fhir/Patient
                    └── patient.openemrPatientUuid = uuid  ──saved to──►  PostgreSQL
```

Jobs retry 3 times with exponential back-off (5 s base). On startup, `onModuleInit` re-enqueues any patients where `openemrPatientUuid IS NULL` (recovery for lost jobs).

Vitals LOINC codes used: heart rate `8867-4`, systolic BP `8480-6`, diastolic BP `8462-4`, SpO2 `2708-6`, weight `29463-7`, height `8302-2`, temperature `8310-5`, glucose `2339-0`, HbA1c `4548-4`, haemoglobin `718-7`, WBC `6690-2`, RBC `789-8`, platelets `777-3`.

---

## 6. Authentication & OAuth Flow

### Patient / Provider JWT Auth

```
Registration:
  Client  ──POST /auth/register──►  API
                                     ├── Hash password (bcrypt 12 rounds)
                                     ├── Create User (isVerified=false)  ──►  PostgreSQL
                                     ├── Invalidate old OTP tokens
                                     └── sendEmailOtp()  ──►  Bull notifications queue

  If email already exists + isVerified=false:
    → Refresh password hash, resend OTP  (allows retry without support)
  If email already exists + isVerified=true:
    → 409 Conflict (user should log in)

OTP Verification:
  Client  ──POST /auth/verify-email-otp──►  API
                                             ├── bcrypt.compare(otp, tokenHash)
                                             ├── Set isVerified=true
                                             └── Issue access + refresh tokens  ──►  Client cookies

Login:
  Client  ──POST /auth/login──►  API
                                  ├── Check isVerified, isActive, lockout
                                  ├── bcrypt.compare(password, hash)
                                  ├── Issue tokens (15 min access, 7 day refresh)
                                  └── Tokens set as SameSite=Strict cookies

Token Refresh (automatic):
  Client  ──POST /auth/refresh──►  API
                                    ├── Verify refresh JWT
                                    ├── Revoke old session (rotation)
                                    └── Issue new access + refresh tokens
```

Account lockout: 10 consecutive failed logins → locked for 15 minutes. Successful login resets counter.

### OpenEMR OAuth2 (one-time admin setup)

```
Admin browser
  │
  ├── 1. GET /openemr/auth/init
  │         └── API generates PKCE state, stores in Redis (10 min TTL)
  │         └── Returns authorization URL: clinical.myvaultplus.com/oauth2/default/authorize
  │
  ├── 2. Admin logs into OpenEMR in browser
  │         └── OpenEMR redirects to: api.myvaultplus.com/api/v1/openemr/auth/callback?code=...&state=...
  │
  ├── 3. API validates state (CSRF guard), exchanges code for tokens
  │         └── POST /oauth2/default/token (authorization_code grant)
  │         └── Stores refresh_token in Redis: openemr:refresh_token
  │
  └── 4. Ongoing: access tokens refreshed silently
            └── POST /oauth2/default/token (refresh_token grant)
            └── Cached in memory (expires - 60 s buffer)
            └── New refresh_token saved back to Redis on every rotation
```

---

## 7. Patient Registration & Sync Flow

```
1. User fills Create Account form
   (name, email, phone, password)
         │
2. POST /auth/register
   ├── Unverified duplicate? → refresh creds + resend OTP
   ├── Verified duplicate? → 409
   └── New user → create User (isVerified=false) + send OTP email
         │
3. User enters 6-digit OTP
   POST /auth/verify-email-otp
   └── isVerified=true, issue JWT tokens, set cookies
         │
4. Redirect → /onboarding
   (multi-step form: name, DOB, gender, blood group, medical info,
    emergency contacts, NIN, consents)
         │
5. POST /patients  (onboarding complete)
   ├── Create Patient row in PostgreSQL
   │     ├── Generate hhaPatientId (e.g. HHA-NGA-202606-0001)
   │     └── Link to User.id
   └── openemrService.enqueuePatientSync(patient.id)
         │
6. Bull worker picks up job
   ├── Search OpenEMR: GET /fhir/Patient?identifier=HHA-NGA-202606-0001
   ├── Not found → POST /fhir/Patient  (FHIR resource)
   ├── Extract uuid from response
   └── UPDATE patients SET openemrPatientUuid = uuid, openemrSyncStatus = 'synced'
         │
7. Patient now exists in both PostgreSQL and OpenEMR
   → All subsequent vitals / records / labs sync using openemrPatientUuid
```

---

## 8. Document Management Flow

### Clinical Records

```
Patient uploads document via frontend
  │
  POST /records
  ├── API generates S3 presigned PUT URL  ──►  AWS S3 (bucket: hha-docs)
  ├── Client uploads file directly to S3 (bypasses API)
  ├── POST /records/confirm (client sends S3 key)
  │     ├── Create ClinicalRecord in PostgreSQL (fileUrl = S3 key)
  │     └── Create linked Prescription row (if type = prescription)
  │
  └── openemrService.enqueueRecordSync(patientId, recordId)
        └── Bull worker:
              ├── Prescription → POST /fhir/MedicationRequest
              └── Other records → POST /fhir/DocumentReference

File access:
  GET /records/:id
  └── API generates S3 presigned GET URL (time-limited, returned to client)
```

### Profile Photos

```
GET /patients/me/profile-photo-upload-url
  └── API generates S3 presigned PUT URL  ──►  AWS S3

Client uploads directly to S3.

GET /patients/me  (or any patient profile)
  └── API fetches patient.profilePhotoUrl (S3 key)
        └── Generates presigned GET URL  ──►  returned in response as signed URL
```

---

## 9. Notification Pipeline

```
Any service (auth, appointments, dispatch…)
  └── notificationsService.sendEmail(to, subject, body, userId)
  └── notificationsService.sendSms(to, body, userId)
  └── notificationsService.sendPush(fcmToken, subject, body, userId)
        │
        ├── NotificationRateLimiterService  (Redis — per-recipient per-channel budget)
        │     └── Over budget → silently drop, log warning
        │
        └── Bull Queue: notifications  ──stored in──►  Redis
              └── NotificationsProcessor (Bull worker, concurrency 5)
                    ├── send-email  →  Resend API  (branded HTML template)
                    ├── send-sms    →  Africa's Talking SMS API
                    ├── send-push   →  FCM (Firebase Cloud Messaging)
                    └── send-whatsapp → WhatsApp channel
```

OTP emails receive a dedicated branded HTML template. Message bodies are never logged in production (PHI / OTP codes).

---

## 10. Video Consultation Flow (TeleCare™)

```
Patient books TeleCare session
  └── POST /telecare/sessions
        ├── Create TelecareSession in PostgreSQL (status: scheduled)
        └── Notify provider (email / push)

On session start:
  Patient  ──GET /telecare/sessions/:id/token──►  API
                                                   ├── Verify patient owns session
                                                   ├── AccessToken = new livekit.AccessToken(apiKey, secret)
                                                   ├── token.addGrant({ roomJoin: true, room: sessionId })
                                                   └── Return signed LiveKit JWT

  Provider  ──GET /telecare/sessions/:id/token──►  API
                                                   └── Same flow, different participant identity

  Both participants  ──connect──►  LiveKit Cloud (TURN/WebRTC)
                                   └── Video/audio room (sessionId as room name)

Session ends:
  ├── Update TelecareSession.status = completed
  └── openemrService.enqueueEncounterSync(patientId, appointmentId)
        └── POST /api/patient/:uuid/encounter  in OpenEMR
```

---

## 11. Payment Flow

```
Patient initiates payment (subscription upgrade, service fee)
  └── POST /payments/initiate
        ├── Create Payment row (status: pending, amountKobo, gateway)
        └── gateway = Paystack or Flutterwave (patient's choice)

Paystack path:
  └── POST https://api.paystack.co/transaction/initialize
        ├── idempotency key prevents duplicate charges on retry
        ├── Returns authorization_url  ──►  returned to client
        └── Client redirects to Paystack hosted page

Flutterwave path:
  └── POST https://api.flutterwave.com/v3/payments
        └── Returns hosted payment link  ──►  returned to client

Payment gateway  ──webhook──►  POST /payments/webhook/:gateway
  ├── Verify webhook signature (HMAC)
  ├── Update Payment.status = completed / failed
  └── If payment is for subscription:
        └── Create / extend PatientSubscription record
```

---

## 12. Third-Party Integrations

| Service | Purpose | Outbound from |
|---|---|---|
| **Resend** | Transactional email (OTPs, notifications) | NestJS NotificationsProcessor |
| **Africa's Talking** | SMS delivery (OTPs, alerts) | NestJS NotificationsProcessor |
| **LiveKit Cloud** | WebRTC video rooms for TeleCare™ | NestJS TelecareService (token signing) |
| **Paystack** | Card payments, subscriptions (NGN-primary) | NestJS PaymentsService |
| **Flutterwave** | Alternative payment gateway | NestJS PaymentsService |
| **OpenEMR** | Clinical records store (FHIR R4 + REST) | NestJS OpenemrService / OpenemrProcessor |
| **Sentry** | Runtime error monitoring + alerting | NestJS GlobalExceptionFilter |
| **AWS S3** | Document and profile photo storage | NestJS PatientsService, RecordsService |
| **AWS Secrets Manager** | Secrets injection into ECS task environment | ECS task definition |
| **AWS CloudWatch** | Container log aggregation | ECS stdout → CloudWatch |

---

## 13. Security Controls

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds |
| OTP storage | bcrypt hash in `verification_tokens` table (never plaintext) |
| Access tokens | JWT RS256, 15-minute TTL |
| Refresh tokens | JWT in `SameSite=Strict; Secure` cookie, 7-day TTL, rotated on every use |
| Rate limiting | Redis-backed (100 req/min global, 10 req/min auth endpoints) |
| Account lockout | 10 failed logins → 15-min lockout (silent, same error as wrong password) |
| Role enforcement | `RolesGuard` on every handler via `@Roles()` decorator |
| Input validation | `class-validator` + `ValidationPipe (whitelist, forbidNonWhitelisted)` on all DTOs |
| CSRF on OAuth | PKCE-style state stored in Redis, validated on callback |
| Webhook integrity | HMAC signature verification on Paystack and Flutterwave webhooks |
| PHI in logs | OTP bodies and sensitive fields never logged in production |
| Audit trail | `AuditLogInterceptor` writes every mutating request to `audit_logs` table |
| S3 access | Presigned URLs only (no public bucket); time-limited per request |
| Secret storage | All secrets in AWS Secrets Manager, injected at container start |
| Error masking | `GlobalExceptionFilter` strips stack traces in production responses |

---

## 14. Infrastructure (AWS)

```
Region: af-south-1 (Cape Town)

VPC
├── Public subnets
│     └── Application Load Balancer (ALB)
│           ├── Listener: HTTPS 443
│           ├── Host rule: api.myvaultplus.com  → hha-api-tg (NestJS)
│           ├── Host rule: clinical.myvaultplus.com → OpenEMR EC2
│           └── Priority 3: openemr.myvaultplus.com → 301 → clinical.myvaultplus.com
│
├── Private subnets
│     ├── ECS Fargate  (cluster: hha-cluster, service: hha-api-service)
│     │     └── Task: NestJS API container (image from ECR)
│     │           └── Secrets injected from AWS Secrets Manager at launch
│     │
│     ├── AWS RDS (PostgreSQL)  — primary data store
│     ├── AWS ElastiCache (Redis)  — queues, throttler, tokens
│     └── EC2 (OpenEMR)  — Docker container, Apache httpd
│
└── AWS S3  (global)
      └── Bucket: hha-docs  (profile photos, clinical documents)

DNS (GoDaddy):
  api.myvaultplus.com         CNAME → ALB DNS name
  clinical.myvaultplus.com    CNAME → ALB DNS name
  myvaultplus.com             A → frontend host
```

### Deployment Process

```
git push origin master
  └── (manual trigger or CI)
        └── aws ecs update-service --force-new-deployment
              └── ECS pulls latest image from ECR
              └── New task starts, passes ALB health check
              └── Old task drained (zero-downtime rolling deploy)
```

---

## Where Patient Data Lives

| Data | Primary Store | Mirror / Cache |
|---|---|---|
| Identity (email, password, role) | PostgreSQL `users` | — |
| Clinical profile (name, DOB, blood group…) | PostgreSQL `patients` | OpenEMR Patient resource |
| Vital signs | PostgreSQL `vitals_readings` | OpenEMR Observation (FHIR bundle) |
| Clinical records & prescriptions | PostgreSQL `clinical_records` + S3 (files) | OpenEMR DocumentReference / MedicationRequest |
| Lab orders & results | PostgreSQL `lab_orders` / `lab_results` | OpenEMR ServiceRequest / DiagnosticReport |
| Appointments / encounters | PostgreSQL `appointments` | OpenEMR Encounter |
| Providers | PostgreSQL `providers` | OpenEMR Practitioner |
| Profile photos | AWS S3 (key stored in `patients.profile_photo_url`) | — |
| Payment records | PostgreSQL `payments` | Paystack / Flutterwave gateway records |
| Subscriptions | PostgreSQL `patient_subscriptions` | — |
| Audit trail | PostgreSQL `audit_logs` + CloudWatch | — |
| Auth sessions | PostgreSQL `user_sessions` | Redis (throttle counters) |
| Sync jobs | Redis (Bull queue) + PostgreSQL `openemr_sync_queue` (audit) | — |
