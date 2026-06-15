# MyHealth Vault+™ — Backend Database Schema

**Product:** MyHealth Vault+™ by Health-Hub Africa® (HHA)  
**Database:** PostgreSQL 16+  
**Last updated:** 2026-05-20

---

## Contents

1. [Conventions](#1-conventions)
2. [Enum Types](#2-enum-types)
3. [Auth & Users](#3-auth--users)
4. [Patients](#4-patients)
5. [Healthcare Providers](#5-healthcare-providers)
6. [Appointments](#6-appointments)
7. [Clinical Records](#7-clinical-records)
8. [Lab Tests & Results](#8-lab-tests--results)
9. [Vitals](#9-vitals)
10. [TeleCare Sessions](#10-telecare-sessions)
11. [Emergency Dispatch](#11-emergency-dispatch)
12. [Subscriptions](#12-subscriptions)
13. [Payments](#13-payments)
14. [Alerts & Notifications](#14-alerts--notifications)
15. [STRIDE™ AI System](#15-stride-ai-system)
16. [Expert Review™](#16-expert-review)
17. [Compliance & Audit](#17-compliance--audit)
18. [Support & Tickets](#18-support--tickets)
19. [OpenEMR Integration](#19-openemr-integration)
20. [Analytics](#20-analytics)
21. [Indexes](#21-indexes)
22. [Row-Level Security](#22-row-level-security)
23. [Entity Relationship Overview](#23-entity-relationship-overview)

---

## 1. Conventions

### Naming
- Tables: `snake_case`, plural (e.g. `patients`, `lab_results`)
- Columns: `snake_case`
- Primary keys: `id UUID DEFAULT gen_random_uuid()`
- Foreign keys: `{table_singular}_id` (e.g. `patient_id`, `provider_id`)
- Timestamps: `created_at`, `updated_at` on every table (via trigger)
- Soft deletes: `deleted_at TIMESTAMPTZ` where data must be retained for compliance

### HHA Patient ID Format
```
HHA-{REGION}-{YYYYMM}-{SEQUENCE}
e.g. HHA-CAN-2605-0004
```
- `REGION` — 3-char region/state code (CAN = Cantonment/Lagos, ABJ = Abuja, PH = Port Harcourt)
- `YYYYMM` — registration year+month
- `SEQUENCE` — zero-padded 4-digit enrollment sequence within that region-month

### Currency
All monetary values stored as `INTEGER` in **kobo** (1 NGN = 100 kobo) unless noted.

### Timestamps
All timestamps stored as `TIMESTAMPTZ` (UTC). Application layer converts to Africa/Lagos (WAT, UTC+1).

---

## 2. Enum Types

```sql
-- User roles
CREATE TYPE user_role AS ENUM (
  'patient',
  'provider',
  'coordinator',
  'admin',
  'super_admin'
);

-- Appointment states
CREATE TYPE appointment_status AS ENUM (
  'requested',
  'confirmed',
  'upcoming',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- HHA service lines
CREATE TYPE service_type AS ENUM (
  'MinuteCare',
  'TeleCare',
  'CareTest',
  'HealthConsult',
  'ExpertReview',
  'NeuroFlex',
  'DispatchCare'
);

-- Clinical record categories
CREATE TYPE record_type AS ENUM (
  'visit',
  'prescription',
  'lab',
  'imaging',
  'document',
  'referral',
  'expert_review'
);

-- Lab result interpretation
CREATE TYPE lab_status AS ENUM (
  'pending',
  'normal',
  'review',
  'critical'
);

-- TeleCare session states
CREATE TYPE session_status AS ENUM (
  'scheduled',
  'waiting',
  'active',
  'completed',
  'missed',
  'cancelled'
);

-- Emergency types (matches PRD DISP04 UI labels)
CREATE TYPE emergency_type AS ENUM (
  'Breathing_Difficulty',
  'Chest_Pain',
  'Accident_Injury',
  'Stroke_Symptoms',
  'Severe_Weakness',
  'Other'
);

-- Dispatch request lifecycle
CREATE TYPE dispatch_status AS ENUM (
  'requested',
  'triaged',
  'unit_assigned',
  'en_route',
  'on_scene',
  'patient_stabilised',
  'transported',
  'closed'
);

-- Payment states
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'disputed'
);

-- Payment gateways
CREATE TYPE payment_gateway AS ENUM (
  'Paystack',
  'Flutterwave',
  'manual'
);

-- Subscription plan tiers (aligned with PRD v2.0 tier matrix)
CREATE TYPE plan_tier AS ENUM (
  'Free',
  'Basic',
  'Mid_Level',
  'Gold',
  'Corporate'
);

-- Expert Review™ case lifecycle
CREATE TYPE expert_review_status AS ENUM (
  'submitted',
  'under_review',
  'specialist_assigned',
  'in_consultation',
  'report_ready',
  'closed',
  'cancelled'
);

-- Expert Review™ urgency classification
CREATE TYPE expert_review_urgency AS ENUM (
  'routine',
  'urgent',
  'emergency'
);

-- Expert Review™ consultation type
CREATE TYPE expert_review_type AS ENUM (
  'second_opinion',
  'multi_specialist',
  'surgical_review',
  'imaging_review',
  'pathology_review'
);

-- Subscription states
CREATE TYPE subscription_status AS ENUM (
  'active',
  'past_due',
  'cancelled',
  'expired',
  'trial'
);

-- Alert severity
CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

-- STRIDE phase deployment status
CREATE TYPE phase_status AS ENUM (
  'planned',
  'beta',
  'active',
  'deprecated'
);

-- Gender
CREATE TYPE gender AS ENUM (
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
);

-- Blood groups
CREATE TYPE blood_group AS ENUM (
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);
```

---

## 3. Auth & Users

### `users`
Core authentication identity. Extended by `patients` and `providers`.

```sql
CREATE TABLE users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL UNIQUE,
  phone             TEXT        UNIQUE,
  password_hash     TEXT        NOT NULL,
  role              user_role   NOT NULL DEFAULT 'patient',
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
```

### `user_sessions`
JWT refresh token tracking and session management.

```sql
CREATE TABLE user_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token     TEXT        NOT NULL UNIQUE,
  ip_address        INET,
  user_agent        TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `verification_tokens`
Email/phone OTP verification and password resets.

```sql
CREATE TABLE verification_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token             TEXT        NOT NULL UNIQUE,
  type              TEXT        NOT NULL CHECK (type IN ('email', 'phone', 'password_reset', 'mfa')),
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Patients

### `patients`
Extends `users` with clinical and demographic data.

```sql
CREATE TABLE patients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- HHA identity
  hha_id            TEXT        NOT NULL UNIQUE,       -- HHA-CAN-2605-0004
  region_code       CHAR(3)     NOT NULL,               -- CAN, ABJ, PHC …

  -- Demographics
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  date_of_birth     DATE        NOT NULL,
  gender            gender      NOT NULL,
  profile_photo_url TEXT,

  -- Contact
  address           TEXT,
  city              TEXT,
  state             TEXT,
  country           TEXT        NOT NULL DEFAULT 'Nigeria',

  -- Clinical identifiers
  blood_group       blood_group,
  genotype          TEXT,                               -- AA, AS, SS …

  -- OpenEMR sync
  openemr_patient_uuid  TEXT    UNIQUE,                -- UUID assigned by OpenEMR upon sync
  openemr_sync_status   TEXT    NOT NULL DEFAULT 'pending'
                                CHECK (openemr_sync_status IN ('pending', 'synced', 'failed', 'not_required')),

  -- Status
  status            TEXT        NOT NULL DEFAULT 'Stable',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
```

### `patient_medical_info`
Mutable clinical summary (one row per patient, updated in place).

```sql
CREATE TABLE patient_medical_info (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID        NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  allergies         TEXT[],                             -- ['Penicillin', 'Sulfa']
  chronic_conditions TEXT[],                            -- ['Hypertension', 'T2DM']
  active_medications TEXT[],                            -- ['Amlodipine 5mg']
  active_care_plan  TEXT,                               -- 'HealthConsult™'
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `emergency_contacts`
One or more emergency contacts per patient.

```sql
CREATE TABLE emergency_contacts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  full_name         TEXT        NOT NULL,
  relationship      TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  email             TEXT,
  is_primary        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Healthcare Providers

### `providers`
Doctors, nurses, specialists, and paramedics.

```sql
CREATE TABLE providers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  title             TEXT        NOT NULL DEFAULT 'Dr.',       -- Dr., Prof., Nurse
  specialty         TEXT        NOT NULL,                     -- 'General Practitioner'
  license_number    TEXT        UNIQUE,
  profile_photo_url TEXT,
  bio               TEXT,
  rating            NUMERIC(3,2) CHECK (rating BETWEEN 0 AND 5),
  total_patients    INTEGER     NOT NULL DEFAULT 0,
  years_experience  INTEGER     NOT NULL DEFAULT 0,
  is_available      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
```

### `provider_availability`
Weekly recurring availability slots.

```sql
CREATE TABLE provider_availability (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week       SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time        TIME        NOT NULL,
  end_time          TIME        NOT NULL,
  service_type      service_type,                             -- NULL = all services
  is_telecare       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `patient_provider_assignments`
Primary care provider relationship.

```sql
CREATE TABLE patient_provider_assignments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  provider_id       UUID        NOT NULL REFERENCES providers(id),
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at     TIMESTAMPTZ,
  notes             TEXT,
  UNIQUE (patient_id, provider_id, unassigned_at)
);
```

---

## 6. Appointments

### `appointments`

```sql
CREATE TABLE appointments (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT              NOT NULL UNIQUE,        -- APT-2605-0001
  patient_id        UUID              NOT NULL REFERENCES patients(id),
  provider_id       UUID              NOT NULL REFERENCES providers(id),
  service_type      service_type      NOT NULL,
  status            appointment_status NOT NULL DEFAULT 'requested',
  scheduled_at      TIMESTAMPTZ       NOT NULL,
  duration_minutes  SMALLINT          NOT NULL DEFAULT 30,
  reason            TEXT,
  is_telecare       BOOLEAN           NOT NULL DEFAULT FALSE,
  meeting_url       TEXT,                                     -- video link for TeleCare
  location          TEXT,                                     -- physical address if in-person
  patient_notes     TEXT,
  provider_notes    TEXT,
  cancelled_by      UUID              REFERENCES users(id),
  cancellation_note TEXT,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);
```

### `appointment_reminders`
Tracks scheduled notifications for upcoming appointments.

```sql
CREATE TABLE appointment_reminders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  remind_at         TIMESTAMPTZ NOT NULL,
  channel           TEXT        NOT NULL CHECK (channel IN ('sms', 'email', 'push', 'whatsapp')),
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Clinical Records

### `clinical_records`
All patient health documents — visits, prescriptions, lab summaries, documents.

```sql
CREATE TABLE clinical_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT        NOT NULL UNIQUE,              -- REC-2605-0001
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  provider_id       UUID        REFERENCES providers(id),
  appointment_id    UUID        REFERENCES appointments(id),
  record_type       record_type NOT NULL,
  title             TEXT        NOT NULL,
  description       TEXT,
  file_url          TEXT,                                     -- S3/Cloudflare R2 URL
  file_mime_type    TEXT,                                     -- 'application/pdf'
  file_size_bytes   INTEGER,
  is_downloadable   BOOLEAN     NOT NULL DEFAULT TRUE,
  recorded_at       DATE        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
```

### `prescriptions`
Detailed prescription data (child of a `clinical_records` row with `record_type = 'prescription'`).

```sql
CREATE TABLE prescriptions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         UUID        NOT NULL UNIQUE REFERENCES clinical_records(id) ON DELETE CASCADE,
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  provider_id       UUID        NOT NULL REFERENCES providers(id),
  drug_name         TEXT        NOT NULL,
  dosage            TEXT        NOT NULL,                     -- '5mg'
  frequency         TEXT        NOT NULL,                     -- 'Once daily'
  route             TEXT        NOT NULL DEFAULT 'oral',      -- 'oral', 'IV', 'topical'
  duration_days     INTEGER,
  refills_remaining INTEGER     NOT NULL DEFAULT 0,
  dispensed_at      TIMESTAMPTZ,
  expires_at        DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Lab Tests & Results

### `lab_orders`
A lab order groups one or more tests ordered in a single request.

```sql
CREATE TABLE lab_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT        NOT NULL UNIQUE,              -- LAB-2605-0001
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  ordered_by        UUID        NOT NULL REFERENCES providers(id),
  appointment_id    UUID        REFERENCES appointments(id),
  clinical_record_id UUID       REFERENCES clinical_records(id),
  ordered_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_at      TIMESTAMPTZ,
  reported_at       TIMESTAMPTZ,
  overall_status    lab_status  NOT NULL DEFAULT 'pending',
  lab_facility      TEXT,                                     -- 'CareTest™ Lagos Victoria'
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `lab_results`
Individual test results within an order.

```sql
CREATE TABLE lab_results (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID        NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  test_name         TEXT        NOT NULL,                     -- 'Complete Blood Count (CBC)'
  test_code         TEXT,                                     -- LOINC code, e.g. '58410-2'
  status            lab_status  NOT NULL DEFAULT 'pending',
  value_display     TEXT,                                     -- 'All panels normal'
  unit              TEXT,                                     -- 'mg/dL', '%', 'g/dL'
  reference_range   TEXT,                                     -- '< 100 mg/dL'
  is_flagged        BOOLEAN     NOT NULL DEFAULT FALSE,
  interpretation_note TEXT,
  is_downloadable   BOOLEAN     NOT NULL DEFAULT TRUE,
  file_url          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `lab_result_items`
Granular sub-items within a result panel (e.g. individual CBC analytes).

```sql
CREATE TABLE lab_result_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id         UUID        NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  analyte_name      TEXT        NOT NULL,                     -- 'WBC'
  analyte_code      TEXT,                                     -- LOINC
  value             TEXT        NOT NULL,                     -- '6.8'
  unit              TEXT,                                     -- '× 10³/μL'
  reference_low     TEXT,
  reference_high    TEXT,
  is_flagged        BOOLEAN     NOT NULL DEFAULT FALSE,
  flag_type         TEXT        CHECK (flag_type IN ('low', 'high', 'critical_low', 'critical_high')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 9. Vitals

### `vitals_readings`
Time-series vital sign readings. Each row is one measurement at a point in time.

```sql
CREATE TABLE vitals_readings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by       UUID        REFERENCES providers(id),     -- NULL = self-reported
  source            TEXT        NOT NULL DEFAULT 'manual',    -- 'manual', 'device', 'stride_ai'

  -- Cardiovascular
  heart_rate        SMALLINT    CHECK (heart_rate BETWEEN 20 AND 300),     -- bpm
  systolic_bp       SMALLINT    CHECK (systolic_bp BETWEEN 50 AND 300),    -- mmHg
  diastolic_bp      SMALLINT    CHECK (diastolic_bp BETWEEN 30 AND 200),   -- mmHg
  spo2              NUMERIC(4,1) CHECK (spo2 BETWEEN 50 AND 100),          -- %

  -- Metabolic
  weight_kg         NUMERIC(5,2),
  height_cm         NUMERIC(5,2),
  temperature_c     NUMERIC(4,1) CHECK (temperature_c BETWEEN 30 AND 45), -- °C
  blood_glucose     NUMERIC(6,2),                                          -- mmol/L
  hba1c             NUMERIC(4,2),                                          -- %

  -- Blood count
  wbc               NUMERIC(8,2),    -- × 10³/μL
  rbc               NUMERIC(8,2),    -- × 10⁶/μL
  haemoglobin       NUMERIC(5,2),    -- g/dL
  platelets         INTEGER,         -- × 10³/μL

  -- Sleep
  sleep_hours       NUMERIC(4,2),

  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. TeleCare Sessions

### `telecare_sessions`
Video consultation sessions, whether standalone or linked to an appointment.

```sql
CREATE TABLE telecare_sessions (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT            NOT NULL UNIQUE,          -- TC-2605-0001
  patient_id        UUID            NOT NULL REFERENCES patients(id),
  provider_id       UUID            NOT NULL REFERENCES providers(id),
  appointment_id    UUID            UNIQUE REFERENCES appointments(id),
  status            session_status  NOT NULL DEFAULT 'scheduled',
  scheduled_at      TIMESTAMPTZ     NOT NULL,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  meeting_url       TEXT,
  recording_url     TEXT,
  platform          TEXT            NOT NULL DEFAULT 'HHA Native',  -- 'HHA Native' (LiveKit), 'Doxy'
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `telecare_session_notes`
Provider notes and patient summary for a completed session.

```sql
CREATE TABLE telecare_session_notes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL UNIQUE REFERENCES telecare_sessions(id) ON DELETE CASCADE,
  chief_complaint   TEXT,
  assessment        TEXT,
  plan              TEXT,
  follow_up_days    INTEGER,
  record_id         UUID        REFERENCES clinical_records(id),   -- linked visit record
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 11. Emergency Dispatch

### `dispatch_requests`
A DispatchCare™ emergency request initiated by a patient or coordinator.

```sql
CREATE TABLE dispatch_requests (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT            NOT NULL UNIQUE,          -- DSP-2605-0001
  patient_id        UUID            NOT NULL REFERENCES patients(id),
  requested_by      UUID            NOT NULL REFERENCES users(id),  -- patient or coordinator
  for_self          BOOLEAN         NOT NULL DEFAULT TRUE,
  emergency_type    emergency_type  NOT NULL,
  description       TEXT,
  status            dispatch_status NOT NULL DEFAULT 'requested',

  -- Location at time of request
  location_text     TEXT,                                     -- 'Victoria Island, Lagos'
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  location_accuracy NUMERIC(8,2),                             -- metres

  -- Assignment
  unit_id           UUID            REFERENCES dispatch_units(id),
  assigned_at       TIMESTAMPTZ,
  eta_minutes       SMALLINT,
  arrived_at        TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,

  -- STRIDE AI triage
  stride_triage_score  SMALLINT     CHECK (stride_triage_score BETWEEN 1 AND 10),
  stride_priority      TEXT         CHECK (stride_priority IN ('P1', 'P2', 'P3', 'P4')),
  hpacs_facility_id    UUID         REFERENCES healthcare_facilities(id),

  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `dispatch_events`
Immutable audit timeline of every state change in a dispatch request.

```sql
CREATE TABLE dispatch_events (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID            NOT NULL REFERENCES dispatch_requests(id) ON DELETE CASCADE,
  status            dispatch_status NOT NULL,
  actor_id          UUID            REFERENCES users(id),
  notes             TEXT,
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  occurred_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `dispatch_units`
Emergency response vehicles/paramedic teams.

```sql
CREATE TABLE dispatch_units (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sign         TEXT        NOT NULL UNIQUE,              -- 'HHA-UNIT-07'
  unit_type         TEXT        NOT NULL,                     -- 'Ambulance', 'Rapid Response', 'Paramedic Bike'
  base_location     TEXT,
  current_latitude  NUMERIC(10,7),
  current_longitude NUMERIC(10,7),
  is_available      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `healthcare_facilities`
Hospitals and clinics for HPACS™ routing.

```sql
CREATE TABLE healthcare_facilities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  facility_type     TEXT        NOT NULL,                     -- 'Hospital', 'Clinic', 'Lab'
  address           TEXT,
  city              TEXT,
  state             TEXT,
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  total_beds        INTEGER,
  available_beds    INTEGER,
  has_icu           BOOLEAN     NOT NULL DEFAULT FALSE,
  has_maternity     BOOLEAN     NOT NULL DEFAULT FALSE,
  has_trauma        BOOLEAN     NOT NULL DEFAULT FALSE,
  capacity_updated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 12. Subscriptions

### `subscription_plans`
Product catalog for HHA subscription tiers.

```sql
CREATE TABLE subscription_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT        NOT NULL UNIQUE,              -- 'gold', 'standard', 'concierge'
  tier              plan_tier   NOT NULL,
  name              TEXT        NOT NULL,
  price_kobo        INTEGER     NOT NULL,                     -- 2500000 = ₦25,000
  billing_period    TEXT        NOT NULL DEFAULT 'monthly'    CHECK (billing_period IN ('monthly', 'quarterly', 'annual')),
  features          JSONB       NOT NULL DEFAULT '[]',        -- ["TeleCare™ (24/7)", ...]
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  display_order     SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Seed data (PRD v2.0 tier matrix):**

| slug | tier | price (₦) | billing |
|---|---|---|---|
| `free` | Free | 0 | monthly |
| `basic` | Basic | 2,500 | monthly |
| `mid_level` | Mid_Level | 10,000 | monthly |
| `gold` | Gold | 25,000 | monthly |
| `corporate` | Corporate | 75,000 | monthly |

### `patient_subscriptions`
Active and historical subscription enrollments per patient.

```sql
CREATE TABLE patient_subscriptions (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID                NOT NULL REFERENCES patients(id),
  plan_id           UUID                NOT NULL REFERENCES subscription_plans(id),
  status            subscription_status NOT NULL DEFAULT 'active',
  started_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ         NOT NULL,
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  auto_renew        BOOLEAN             NOT NULL DEFAULT TRUE,
  payment_id        UUID                REFERENCES payments(id),
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now()
);
```

---

## 13. Payments

### `payments`
Top-level payment record for any billable event.

```sql
CREATE TABLE payments (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT            NOT NULL UNIQUE,          -- PAY-2605-0001
  patient_id        UUID            NOT NULL REFERENCES patients(id),
  amount_kobo       INTEGER         NOT NULL,                 -- total charged
  currency          CHAR(3)         NOT NULL DEFAULT 'NGN',
  status            payment_status  NOT NULL DEFAULT 'pending',
  gateway           payment_gateway NOT NULL,
  gateway_ref       TEXT            UNIQUE,                   -- Paystack/Flutterwave tx ref
  gateway_response  JSONB,                                    -- raw webhook payload
  idempotency_key   TEXT            UNIQUE,                   -- webhook dedup key
  description       TEXT            NOT NULL,
  paid_at           TIMESTAMPTZ,
  refunded_at       TIMESTAMPTZ,
  refund_amount_kobo INTEGER,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `payment_line_items`
Itemized breakdown of a payment (subscription, consultation fee, lab fee, dispatch fee).

```sql
CREATE TABLE payment_line_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID        NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  description       TEXT        NOT NULL,
  quantity          SMALLINT    NOT NULL DEFAULT 1,
  unit_price_kobo   INTEGER     NOT NULL,
  total_kobo        INTEGER     NOT NULL,
  reference_type    TEXT,                                     -- 'subscription', 'appointment', 'lab_order', 'dispatch'
  reference_id      UUID,                                     -- FK to relevant table
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `invoices`
Monthly or per-event invoices generated for patients.

```sql
CREATE TABLE invoices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref           TEXT        NOT NULL UNIQUE,              -- INV-2605-0001
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  payment_id        UUID        REFERENCES payments(id),
  subtotal_kobo     INTEGER     NOT NULL,
  tax_kobo          INTEGER     NOT NULL DEFAULT 0,
  total_kobo        INTEGER     NOT NULL,
  due_at            TIMESTAMPTZ,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 14. Alerts & Notifications

### `patient_alerts`
Health alerts visible in the patient dashboard (medication reminders, lab flags, etc.).

```sql
CREATE TABLE patient_alerts (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID            NOT NULL REFERENCES patients(id),
  severity          alert_severity  NOT NULL DEFAULT 'info',
  title             TEXT            NOT NULL,
  body              TEXT,
  action_label      TEXT,                                     -- 'View Labs'
  action_url        TEXT,                                     -- '/labs'
  reference_type    TEXT,                                     -- 'prescription', 'lab_result', …
  reference_id      UUID,
  is_read           BOOLEAN         NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `notification_deliveries`
Tracks outbound push/SMS/email/WhatsApp notifications.

```sql
CREATE TABLE notification_deliveries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id),
  alert_id          UUID        REFERENCES patient_alerts(id),
  channel           TEXT        NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'whatsapp')),
  recipient         TEXT        NOT NULL,                     -- phone or email
  subject           TEXT,
  body              TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  provider_ref      TEXT,                                     -- Twilio SID, Mailgun ID
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 15. STRIDE™ AI System

### `stride_phases`
Registry of the three STRIDE™ system components and their deployment state.

```sql
CREATE TABLE stride_phases (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT          NOT NULL UNIQUE,            -- 'STRIDE', 'HPACS', 'EFCE'
  name              TEXT          NOT NULL,                   -- 'STRIDE™'
  subtitle          TEXT,                                     -- 'AI Triage Engine'
  description       TEXT,
  version           TEXT          NOT NULL,                   -- 'v2.1'
  status            phase_status  NOT NULL DEFAULT 'planned',
  uptime_pct        NUMERIC(6,4),                             -- 99.9800
  avg_response_ms   INTEGER,
  cases_today       INTEGER       NOT NULL DEFAULT 0,
  active_units      INTEGER       NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

**Seed data:**

| code | name | status | version |
|---|---|---|---|
| `STRIDE` | STRIDE™ | active | v2.1 |
| `HPACS` | HPACS™ | active | v1.4 |
| `EFCE` | EFCE™ | beta | v0.9 |

### `stride_triage_logs`
Immutable record of every STRIDE™ triage evaluation.

```sql
CREATE TABLE stride_triage_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_request_id UUID      NOT NULL REFERENCES dispatch_requests(id),
  patient_id        UUID        NOT NULL REFERENCES patients(id),
  input_payload     JSONB       NOT NULL,                     -- symptoms, vitals, location
  triage_score      SMALLINT    NOT NULL CHECK (triage_score BETWEEN 1 AND 10),
  priority_class    TEXT        NOT NULL CHECK (priority_class IN ('P1','P2','P3','P4')),
  recommended_facility_id UUID  REFERENCES healthcare_facilities(id),
  model_version     TEXT        NOT NULL,
  confidence        NUMERIC(5,4),                             -- 0.0000–1.0000
  latency_ms        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 16. Expert Review™

Expert Review™ is a full digital clinical workflow for second opinions and multi-specialist consultations. Case references follow the format `ER-YYYY-000001`.

### `expert_review_cases`

```sql
CREATE TABLE expert_review_cases (
  id                      UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref                 TEXT                  NOT NULL UNIQUE,            -- ER-2026-000001
  patient_id              UUID                  NOT NULL REFERENCES patients(id),
  coordinator_id          UUID                  REFERENCES users(id),       -- HHA coordinator
  lead_physician_id       UUID                  REFERENCES providers(id),   -- ordering physician
  specialist_id           UUID                  REFERENCES providers(id),   -- assigned specialist
  review_type             expert_review_type    NOT NULL,
  urgency                 expert_review_urgency NOT NULL DEFAULT 'routine',
  status                  expert_review_status  NOT NULL DEFAULT 'submitted',

  -- Clinical context
  clinical_question       TEXT                  NOT NULL,
  primary_diagnosis       TEXT,
  referral_notes          TEXT,
  openemr_encounter_id    TEXT,                                             -- linked OpenEMR encounter
  appointment_id          UUID                  REFERENCES appointments(id),

  -- Payment
  payment_id              UUID                  REFERENCES payments(id),

  -- Lifecycle timestamps
  submitted_at            TIMESTAMPTZ           NOT NULL DEFAULT now(),
  accepted_at             TIMESTAMPTZ,
  specialist_assigned_at  TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancellation_reason     TEXT,

  created_at              TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ           NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);
```

### `expert_review_documents`
Supporting documents uploaded by patient or provider for a case.

```sql
CREATE TABLE expert_review_documents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID        NOT NULL REFERENCES expert_review_cases(id) ON DELETE CASCADE,
  uploaded_by         UUID        NOT NULL REFERENCES users(id),
  document_type       TEXT        NOT NULL CHECK (document_type IN (
                                    'lab_result', 'imaging', 'clinical_note',
                                    'prescription', 'referral_letter', 'other'
                                  )),
  title               TEXT        NOT NULL,
  file_url            TEXT        NOT NULL,                     -- S3/R2 signed-URL path
  file_mime_type      TEXT,
  file_size_bytes     INTEGER,
  clinical_record_id  UUID        REFERENCES clinical_records(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `expert_review_status_events`
Immutable append-only timeline of every status transition.

```sql
CREATE TABLE expert_review_status_events (
  id            UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID                  NOT NULL REFERENCES expert_review_cases(id),
  from_status   expert_review_status,
  to_status     expert_review_status  NOT NULL,
  actor_id      UUID                  REFERENCES users(id),
  notes         TEXT,
  occurred_at   TIMESTAMPTZ           NOT NULL DEFAULT now()
);
```

### `expert_review_specialist_notes`
Clinical notes added by the reviewing specialist during evaluation.

```sql
CREATE TABLE expert_review_specialist_notes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID        NOT NULL REFERENCES expert_review_cases(id) ON DELETE CASCADE,
  specialist_id         UUID        NOT NULL REFERENCES providers(id),
  note_type             TEXT        NOT NULL CHECK (note_type IN (
                                      'initial_assessment', 'interim',
                                      'final_assessment', 'follow_up'
                                    )),
  content               TEXT        NOT NULL,
  is_visible_to_patient BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `expert_review_final_reports`
The authoritative output document issued at case closure. Patient must acknowledge the non-prescriptive disclaimer before download.

```sql
CREATE TABLE expert_review_final_reports (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID        NOT NULL UNIQUE REFERENCES expert_review_cases(id),
  authored_by               UUID        NOT NULL REFERENCES providers(id),
  summary                   TEXT        NOT NULL,
  clinical_opinion          TEXT        NOT NULL,
  recommendations           TEXT        NOT NULL,
  follow_up_required        BOOLEAN     NOT NULL DEFAULT FALSE,
  follow_up_appointment_id  UUID        REFERENCES appointments(id),
  disclaimer_accepted       BOOLEAN     NOT NULL DEFAULT FALSE,
  disclaimer_accepted_at    TIMESTAMPTZ,
  pdf_url                   TEXT,                               -- generated PDF on S3/R2
  clinical_record_id        UUID        REFERENCES clinical_records(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 17. Compliance & Audit

### `patient_consents`
Explicit patient consent records for data processing, legal notices, and clinical workflows.

```sql
CREATE TABLE patient_consents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID        NOT NULL REFERENCES patients(id),
  consent_type  TEXT        NOT NULL CHECK (consent_type IN (
                              'terms_of_service', 'privacy_policy',
                              'data_processing', 'clinical_data_sharing',
                              'expert_review_disclaimer', 'marketing',
                              'telemedicine_consent'
                            )),
  version       TEXT        NOT NULL,                           -- '2.0', '1.3'
  accepted      BOOLEAN     NOT NULL DEFAULT TRUE,
  accepted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `audit_logs`
Immutable, append-only record of all security-relevant and compliance-relevant actions across the platform.

```sql
CREATE TABLE audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID        REFERENCES users(id),               -- NULL = system action
  patient_id    UUID        REFERENCES patients(id),            -- NULL = non-patient action
  action        TEXT        NOT NULL,                           -- 'record.viewed', 'payment.initiated'
  resource_type TEXT        NOT NULL,                           -- 'clinical_records', 'payments'
  resource_id   UUID,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,                                          -- diff, reason, extra context
  severity      TEXT        NOT NULL DEFAULT 'info'
                            CHECK (severity IN ('info', 'warning', 'critical')),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `notification_preferences`
Per-user opt-in/opt-out settings for each notification channel and category.

```sql
CREATE TABLE notification_preferences (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled           BOOLEAN     NOT NULL DEFAULT TRUE,
  sms_enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
  push_enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  whatsapp_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
  appointment_reminders   BOOLEAN     NOT NULL DEFAULT TRUE,
  lab_result_alerts       BOOLEAN     NOT NULL DEFAULT TRUE,
  payment_receipts        BOOLEAN     NOT NULL DEFAULT TRUE,
  dispatch_updates        BOOLEAN     NOT NULL DEFAULT TRUE,
  expert_review_updates   BOOLEAN     NOT NULL DEFAULT TRUE,
  marketing_comms         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 18. Support & Tickets

### `support_tickets`
Patient or provider support requests routed to the HHA CX team. Reference format: `TKT-YYYY-000001`.

```sql
CREATE TABLE support_tickets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hha_ref         TEXT        NOT NULL UNIQUE,                  -- TKT-2026-000001
  submitted_by    UUID        NOT NULL REFERENCES users(id),
  patient_id      UUID        REFERENCES patients(id),          -- NULL if submitted by provider/admin
  category        TEXT        NOT NULL CHECK (category IN (
                                'billing', 'technical', 'clinical',
                                'dispatch', 'expert_review', 'account', 'other'
                              )),
  subject         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open' CHECK (status IN (
                                'open', 'in_progress', 'waiting_on_patient',
                                'escalated', 'resolved', 'closed'
                              )),
  priority        TEXT        NOT NULL DEFAULT 'normal'
                              CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to     UUID        REFERENCES users(id),             -- HHA staff/admin
  reference_type  TEXT,                                         -- 'payment', 'appointment', 'dispatch'
  reference_id    UUID,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `support_messages`
Thread messages within a support ticket.

```sql
CREATE TABLE support_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES users(id),
  body          TEXT        NOT NULL,
  attachment_url TEXT,
  is_internal   BOOLEAN     NOT NULL DEFAULT FALSE,             -- staff-only notes, hidden from patient
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 19. OpenEMR Integration

### `integration_errors`
Persistent log of failed calls to external services (OpenEMR, FHIR, payment gateways). Used by the retry worker and ops dashboard.

```sql
CREATE TABLE integration_errors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service           TEXT        NOT NULL,                       -- 'openemr', 'fhir', 'paystack'
  endpoint          TEXT        NOT NULL,                       -- '/api/patient/{id}'
  method            TEXT        NOT NULL DEFAULT 'GET',
  request_id        TEXT,                                       -- correlation / trace ID
  request_payload   JSONB,
  error_code        TEXT,                                       -- HTTP status or service code
  error_message     TEXT,
  patient_id        UUID        REFERENCES patients(id),
  retry_count       SMALLINT    NOT NULL DEFAULT 0,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `openemr_sync_queue`
Queue of pending patient/encounter sync operations between HHA Middleware and OpenEMR.

```sql
CREATE TABLE openemr_sync_queue (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patients(id),
  operation           TEXT        NOT NULL CHECK (operation IN (
                                    'create_patient', 'update_patient',
                                    'create_encounter', 'update_encounter',
                                    'push_vitals', 'push_prescription'
                                  )),
  payload             JSONB       NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN (
                                    'pending', 'processing', 'completed', 'failed', 'skipped'
                                  )),
  attempts            SMALLINT    NOT NULL DEFAULT 0,
  max_attempts        SMALLINT    NOT NULL DEFAULT 3,
  last_attempted_at   TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  error_message       TEXT,
  scheduled_for       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 20. Analytics

All analytics tables are append-only or insert-then-update aggregates. Raw events land in `patient_activity_events`; background jobs roll them up into summary tables. No PHI is stored in aggregate rows — only counts and opaque UUIDs.

### `patient_activity_events`
Granular event stream for patient interactions (page views, feature clicks, form completions).

```sql
CREATE TABLE patient_activity_events (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID            NOT NULL REFERENCES patients(id),
  session_id    UUID            REFERENCES user_sessions(id),
  event_name    TEXT            NOT NULL,                       -- 'appointment.booked', 'lab.viewed'
  service_type  service_type,
  properties    JSONB,                                          -- non-PHI properties only
  ip_address    INET,
  user_agent    TEXT,
  occurred_at   TIMESTAMPTZ     NOT NULL DEFAULT now()
);
```

### `service_usage_daily`
Daily aggregated counts per service line (for cohort and engagement analytics).

```sql
CREATE TABLE service_usage_daily (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date           DATE            NOT NULL,
  service_type          service_type    NOT NULL,
  total_sessions        INTEGER         NOT NULL DEFAULT 0,
  unique_patients       INTEGER         NOT NULL DEFAULT 0,
  completed_count       INTEGER         NOT NULL DEFAULT 0,
  cancelled_count       INTEGER         NOT NULL DEFAULT 0,
  avg_duration_seconds  INTEGER,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (report_date, service_type)
);
```

### `revenue_summaries`
Daily revenue rollup by payment gateway and service type.

```sql
CREATE TABLE revenue_summaries (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date           DATE            NOT NULL,
  service_type          service_type,                           -- NULL = all services
  gateway               payment_gateway,                        -- NULL = all gateways
  total_transactions    INTEGER         NOT NULL DEFAULT 0,
  gross_revenue_kobo    BIGINT          NOT NULL DEFAULT 0,
  refunds_kobo          BIGINT          NOT NULL DEFAULT 0,
  net_revenue_kobo      BIGINT          NOT NULL DEFAULT 0,
  failed_count          INTEGER         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (report_date, service_type, gateway)
);
```

### `expert_review_funnel_metrics`
Daily snapshot of Expert Review™ conversion funnel stages.

```sql
CREATE TABLE expert_review_funnel_metrics (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date             DATE        NOT NULL UNIQUE,
  cases_submitted         INTEGER     NOT NULL DEFAULT 0,
  cases_accepted          INTEGER     NOT NULL DEFAULT 0,
  specialist_assigned     INTEGER     NOT NULL DEFAULT 0,
  reports_issued          INTEGER     NOT NULL DEFAULT 0,
  avg_turnaround_hours    NUMERIC(8,2),
  p90_turnaround_hours    NUMERIC(8,2),
  cancellation_rate       NUMERIC(5,4),                         -- 0.0000–1.0000
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `operational_kpis`
System-wide operational KPI snapshots pushed by background jobs.

```sql
CREATE TABLE operational_kpis (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_subscriptions    INTEGER     NOT NULL DEFAULT 0,
  mrr_kobo                BIGINT      NOT NULL DEFAULT 0,        -- monthly recurring revenue
  active_dispatch_units   INTEGER     NOT NULL DEFAULT 0,
  open_dispatch_requests  INTEGER     NOT NULL DEFAULT 0,
  telecare_sessions_today INTEGER     NOT NULL DEFAULT 0,
  expert_cases_open       INTEGER     NOT NULL DEFAULT 0,
  avg_stride_latency_ms   INTEGER,
  openemr_sync_pending    INTEGER     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 21. Indexes

```sql
-- Users
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_role           ON users(role);

-- Patients
CREATE INDEX idx_patients_user_id     ON patients(user_id);
CREATE INDEX idx_patients_hha_id      ON patients(hha_id);
CREATE INDEX idx_patients_region      ON patients(region_code);

-- Appointments
CREATE INDEX idx_appointments_patient       ON appointments(patient_id);
CREATE INDEX idx_appointments_provider      ON appointments(provider_id);
CREATE INDEX idx_appointments_scheduled_at  ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status        ON appointments(status);

-- Clinical Records
CREATE INDEX idx_records_patient            ON clinical_records(patient_id);
CREATE INDEX idx_records_type               ON clinical_records(record_type);
CREATE INDEX idx_records_recorded_at        ON clinical_records(recorded_at DESC);

-- Lab
CREATE INDEX idx_lab_orders_patient         ON lab_orders(patient_id);
CREATE INDEX idx_lab_results_order          ON lab_results(order_id);
CREATE INDEX idx_lab_results_patient        ON lab_results(patient_id);

-- Vitals (time-series — partial to exclude NULLs)
CREATE INDEX idx_vitals_patient_time        ON vitals_readings(patient_id, recorded_at DESC);

-- Dispatch
CREATE INDEX idx_dispatch_patient           ON dispatch_requests(patient_id);
CREATE INDEX idx_dispatch_status            ON dispatch_requests(status);
CREATE INDEX idx_dispatch_events_request    ON dispatch_events(request_id, occurred_at DESC);

-- Payments
CREATE INDEX idx_payments_patient           ON payments(patient_id);
CREATE INDEX idx_payments_gateway_ref       ON payments(gateway_ref);
CREATE INDEX idx_payments_status            ON payments(status);

-- Subscriptions
CREATE INDEX idx_subscriptions_patient      ON patient_subscriptions(patient_id);
CREATE INDEX idx_subscriptions_status       ON patient_subscriptions(status);
CREATE INDEX idx_subscriptions_expires      ON patient_subscriptions(expires_at);

-- Alerts
CREATE INDEX idx_alerts_patient_unread      ON patient_alerts(patient_id) WHERE is_read = FALSE;

-- Sessions
CREATE INDEX idx_sessions_user              ON user_sessions(user_id);
CREATE INDEX idx_sessions_token             ON user_sessions(refresh_token);

-- STRIDE logs
CREATE INDEX idx_stride_logs_request        ON stride_triage_logs(dispatch_request_id);
CREATE INDEX idx_stride_logs_patient        ON stride_triage_logs(patient_id);

-- Patients — OpenEMR sync
CREATE INDEX idx_patients_openemr_uuid      ON patients(openemr_patient_uuid);
CREATE INDEX idx_patients_openemr_status    ON patients(openemr_sync_status) WHERE openemr_sync_status IN ('pending', 'failed');

-- Expert Review™
CREATE INDEX idx_er_cases_patient           ON expert_review_cases(patient_id);
CREATE INDEX idx_er_cases_status            ON expert_review_cases(status);
CREATE INDEX idx_er_cases_specialist        ON expert_review_cases(specialist_id);
CREATE INDEX idx_er_cases_submitted_at      ON expert_review_cases(submitted_at DESC);
CREATE INDEX idx_er_documents_case          ON expert_review_documents(case_id);
CREATE INDEX idx_er_status_events_case      ON expert_review_status_events(case_id, occurred_at DESC);
CREATE INDEX idx_er_specialist_notes_case   ON expert_review_specialist_notes(case_id);

-- Compliance & Audit
CREATE INDEX idx_consents_patient           ON patient_consents(patient_id);
CREATE INDEX idx_audit_logs_actor           ON audit_logs(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_patient         ON audit_logs(patient_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_resource        ON audit_logs(resource_type, resource_id);

-- Support
CREATE INDEX idx_tickets_patient            ON support_tickets(patient_id);
CREATE INDEX idx_tickets_status             ON support_tickets(status);
CREATE INDEX idx_messages_ticket            ON support_messages(ticket_id, created_at ASC);

-- OpenEMR integration
CREATE INDEX idx_integration_errors_service ON integration_errors(service, occurred_at DESC);
CREATE INDEX idx_integration_errors_patient ON integration_errors(patient_id);
CREATE INDEX idx_sync_queue_status          ON openemr_sync_queue(status, scheduled_for ASC) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_sync_queue_patient         ON openemr_sync_queue(patient_id);

-- Analytics
CREATE INDEX idx_activity_events_patient    ON patient_activity_events(patient_id, occurred_at DESC);
CREATE INDEX idx_activity_events_name       ON patient_activity_events(event_name, occurred_at DESC);
CREATE INDEX idx_service_usage_date         ON service_usage_daily(report_date DESC);
CREATE INDEX idx_revenue_summaries_date     ON revenue_summaries(report_date DESC);
```

---

## 22. Row-Level Security

RLS is enabled on all patient-data tables. The application connects using a service role for admin operations; patient-facing API calls use a `patient_jwt` role where `current_setting('app.patient_id')` is set per request.

```sql
-- Enable RLS
ALTER TABLE patients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_info  ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_readings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecare_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;

-- Example policy: patients can only read their own records
CREATE POLICY patient_own_records ON clinical_records
  FOR SELECT
  USING (patient_id = current_setting('app.patient_id')::UUID);

-- Providers can read records for their assigned patients
CREATE POLICY provider_assigned_records ON clinical_records
  FOR SELECT
  USING (
    provider_id = current_setting('app.provider_id')::UUID
    OR EXISTS (
      SELECT 1 FROM patient_provider_assignments ppa
      WHERE ppa.patient_id = clinical_records.patient_id
        AND ppa.provider_id = current_setting('app.provider_id')::UUID
        AND ppa.unassigned_at IS NULL
    )
  );

-- Enable RLS on new tables
ALTER TABLE expert_review_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_review_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_review_specialist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_review_final_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets             ENABLE ROW LEVEL SECURITY;

-- Patients see only their own Expert Review cases
CREATE POLICY er_cases_patient_select ON expert_review_cases
  FOR SELECT
  USING (patient_id = current_setting('app.patient_id')::UUID);

-- Patients see only their own consents
CREATE POLICY consents_patient_own ON patient_consents
  FOR SELECT
  USING (patient_id = current_setting('app.patient_id')::UUID);

-- Patients see only their own support tickets
CREATE POLICY tickets_patient_own ON support_tickets
  FOR SELECT
  USING (patient_id = current_setting('app.patient_id')::UUID);

-- Patients see non-internal support messages on their tickets
CREATE POLICY messages_patient_own ON support_messages
  FOR SELECT
  USING (
    is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.patient_id = current_setting('app.patient_id')::UUID
    )
  );

-- Patients see final reports for their own cases, only after disclaimer accepted
CREATE POLICY er_reports_patient ON expert_review_final_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_review_cases erc
      WHERE erc.id = expert_review_final_reports.case_id
        AND erc.patient_id = current_setting('app.patient_id')::UUID
    )
    AND disclaimer_accepted = TRUE
  );
```

---

## 23. Entity Relationship Overview

```
users ─────────────────────────────────────────────────────────────────────────┐
  │                                                                             │
  ├── patients ──────────────────────────────────────────────────────────────┐  │
  │     ├── patient_medical_info (1:1)                                       │  │
  │     ├── emergency_contacts (1:N)                                         │  │
  │     ├── vitals_readings (1:N, time-series)                               │  │
  │     ├── patient_alerts (1:N)                                             │  │
  │     ├── patient_consents (1:N, compliance)                               │  │
  │     ├── patient_subscriptions ──► subscription_plans                     │  │
  │     ├── payments ──► payment_line_items                                  │  │
  │     │               └──► invoices                                        │  │
  │     ├── appointments ──► provider_availability                           │  │
  │     │     └── appointment_reminders                                      │  │
  │     ├── clinical_records                                                 │  │
  │     │     └── prescriptions (1:1, for prescription type)                 │  │
  │     ├── lab_orders                                                       │  │
  │     │     └── lab_results                                                │  │
  │     │           └── lab_result_items                                     │  │
  │     ├── telecare_sessions                                                │  │
  │     │     └── telecare_session_notes                                     │  │
  │     ├── dispatch_requests                                                │  │
  │     │     ├── dispatch_events (timeline)                                 │  │
  │     │     ├── dispatch_units (assigned unit)                             │  │
  │     │     ├── healthcare_facilities (HPACS routing)                      │  │
  │     │     └── stride_triage_logs                                         │  │
  │     ├── expert_review_cases                                              │  │
  │     │     ├── expert_review_documents (1:N)                              │  │
  │     │     ├── expert_review_status_events (1:N, append-only)             │  │
  │     │     ├── expert_review_specialist_notes (1:N)                       │  │
  │     │     └── expert_review_final_reports (1:1) ──► appointments         │  │
  │     ├── support_tickets (1:N)                                            │  │
  │     │     └── support_messages (1:N)                                     │  │
  │     └── patient_activity_events (analytics, 1:N)                        │  │
  │                                                                          │  │
  └── providers ─────────────────────────────────────────────────────────────┘  │
        ├── provider_availability (1:N)                                          │
        ├── patient_provider_assignments (M:N via patients)                      │
        └── [linked to appointments, records, labs, telecare, ER as provider_id] │
                                                                                 │
user_sessions ──────────────────────────────────────────────────────────────────┘
verification_tokens
notification_deliveries
notification_preferences (1:1 per user)
audit_logs (system-wide, append-only)

stride_phases (system registry — not patient-linked)

-- Integration & Analytics (not patient-linked per row)
openemr_sync_queue
integration_errors
service_usage_daily
revenue_summaries
expert_review_funnel_metrics
operational_kpis
```

### Key cardinalities

| Relationship | Type |
|---|---|
| user → patient / provider | 1:1 |
| patient → subscriptions | 1:N (one active, many historical) |
| patient → appointments | 1:N |
| appointment → telecare_session | 1:0..1 |
| appointment → clinical_record | 1:0..N |
| lab_order → lab_results | 1:N |
| lab_result → lab_result_items | 1:N |
| dispatch_request → dispatch_events | 1:N (append-only log) |
| dispatch_request → stride_triage_log | 1:1 |
| payment → payment_line_items | 1:N |
| patient ↔ provider | M:N via `patient_provider_assignments` |
| patient → expert_review_cases | 1:N |
| expert_review_case → documents | 1:N |
| expert_review_case → status_events | 1:N (append-only) |
| expert_review_case → specialist_notes | 1:N |
| expert_review_case → final_report | 1:0..1 |
| final_report → follow_up_appointment | 0..1:1 |
| patient → consents | 1:N (versioned per type) |
| user → notification_preferences | 1:1 |
| patient → support_tickets | 1:N |
| support_ticket → support_messages | 1:N |

---

*Schema version 2.0 — Health-Hub Africa® Engineering*
