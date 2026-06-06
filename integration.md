# Health Hub Africa — OpenEMR Integration Guide

**Version:** 1.0 | **Target:** `health-hub-africa-api` on NestJS 10 + OpenEMR 7.x on AWS

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [OpenEMR AWS Setup Requirements](#2-openemr-aws-setup-requirements)
3. [Environment Variables](#3-environment-variables)
4. [Token Management](#4-token-management)
5. [Integration Points by Domain](#5-integration-points-by-domain)
   - [5.1 Patients](#51-patients)
   - [5.2 Appointments / Encounters](#52-appointments--encounters)
   - [5.3 Clinical Records / Documents](#53-clinical-records--documents)
   - [5.4 Lab Orders & Results](#54-lab-orders--results)
   - [5.5 Medications / Prescriptions](#55-medications--prescriptions)
   - [5.6 Vitals](#56-vitals)
   - [5.7 Telecare / Encounter Notes](#57-telecare--encounter-notes)
6. [Shared Helper: callOpenemr](#6-shared-helper-callopenemr)
7. [Async Sync Queue — Complete Operation Map](#7-async-sync-queue--complete-operation-map)
8. [Error Handling & Retry Strategy](#8-error-handling--retry-strategy)
9. [OpenEMR Provider (Practitioner) Sync](#9-openemr-provider-practitioner-sync)
10. [Pending Prisma Migrations](#10-pending-prisma-migrations)
11. [AWS Security Checklist](#11-aws-security-checklist)
12. [Testing the Integration](#12-testing-the-integration)
13. [Implementation Priority Order](#13-implementation-priority-order)

---

## 1. Architecture Overview

```text
[Frontend (Next.js)]
        │  JWT Bearer token only
        ▼
[HHA API (NestJS) — AWS ECS/EC2]
        │  OAuth2 client_credentials
        │  Bearer token (cached, auto-refreshed)
        ▼
[OpenEMR 7.x — AWS EC2 / RDS]
        │
        ├── /apis/default/api/*       ← OpenEMR REST API (non-FHIR)
        └── /apis/default/fhir/*      ← FHIR R4 API
```

### Hard Constraints (must never be violated)

- **Frontend never calls OpenEMR directly** — all PHI routing goes through the HHA API
- **No PHI stored on client devices** under any circumstances
- **OpenEMR credentials** (`OPENEMR_CLIENT_ID`, `OPENEMR_CLIENT_SECRET`) live only in backend environment variables
- **All OpenEMR calls are server-to-server** over a private VPC or VPC peering — OpenEMR must not be publicly exposed

---

## 2. OpenEMR AWS Setup Requirements

### 2.1 Network Topology

OpenEMR must be in the **same VPC** as the HHA API, or connected via VPC peering. Its security group should allow inbound 443 (HTTPS) only from the HHA API's security group ID — not from `0.0.0.0/0`.

```text
HHA API Security Group  →  OpenEMR Security Group   : TCP 443
OpenEMR Security Group  →  RDS Security Group        : TCP 5432 (PostgreSQL) or 3306 (MySQL)
```

If OpenEMR is on a private subnet, set `OPENEMR_BASE_URL` to its **private DNS name** (e.g., `https://openemr.internal` or `https://10.0.1.45`).

### 2.2 OAuth2 API Client Registration

In the OpenEMR admin panel:

1. Navigate to **Administration → System → API Clients**
2. Create a new client with the following settings:

| Field | Value |
| ----- | ----- |
| Client Name | `Health Hub Africa API` |
| Redirect URI | `https://api.healthhubafrica.com/openemr/oauth-callback` |
| Grant Types | `client_credentials` |
| Scopes | `openid api:oemr api:fhir` |

1. Copy the generated `client_id` and `client_secret` into the HHA API environment.

> **Note:** The redirect URI is required by OpenEMR's registration form but is not used in the `client_credentials` flow. It still must be a valid HTTPS URL.

### 2.3 Required OAuth2 Scopes

| Scope | Purpose |
| ----- | ------- |
| `openid` | Base token validation |
| `api:oemr` | OpenEMR REST API (patient CRUD, appointments, encounters) |
| `api:fhir` | FHIR R4 API (Observation, MedicationRequest, DiagnosticReport) |

### 2.4 TLS / SSL

OpenEMR must serve over HTTPS with a valid certificate.

**Production:** Use a certificate issued by a trusted CA — either AWS ACM (if behind an ALB) or Let's Encrypt. Never disable TLS verification in any environment.

**Development (private VPC with a self-signed cert):** Add the CA certificate to Node.js's trust store rather than disabling verification:

```bash
# Export your OpenEMR self-signed CA cert, then point Node.js at it
export NODE_EXTRA_CA_CERTS=/path/to/openemr-ca.crt
```

Or bundle it into the NestJS app startup:

```typescript
// main.ts — before NestFactory.create()
import { readFileSync } from 'fs';
import * as tls from 'tls';

if (process.env.OPENEMR_CA_CERT_PATH) {
  const ca = readFileSync(process.env.OPENEMR_CA_CERT_PATH);
  // Append to Node's built-in CA list rather than replacing it
  tls.createSecureContext({ ca });
  process.env.NODE_EXTRA_CA_CERTS = process.env.OPENEMR_CA_CERT_PATH;
}
```

> **Never set `NODE_TLS_REJECT_UNAUTHORIZED=0`.** This disables all certificate validation and makes every HTTPS call vulnerable to man-in-the-middle attacks — including the token fetch that sends `OPENEMR_CLIENT_SECRET`.

---

## 3. Environment Variables

Add these to `health-hub-africa-api/.env` (and to AWS Secrets Manager / Parameter Store for production):

```env
# OpenEMR — all three are validated as required strings at startup (env.validation.ts)
OPENEMR_BASE_URL=https://openemr.internal          # Private DNS or IP, must be HTTPS
OPENEMR_CLIENT_ID=your_client_id_from_openemr
OPENEMR_CLIENT_SECRET=your_client_secret_from_openemr
```

The `src/config/env.validation.ts` enforces all three as `@IsString() @IsNotEmpty()` and will throw at startup if any are missing or empty.

### Production Secret Rotation

In production, retrieve `OPENEMR_CLIENT_SECRET` from AWS Secrets Manager at startup rather than from a `.env` file:

```typescript
// src/config/secrets.ts — call once in main.ts before NestFactory.create()
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function loadSecrets() {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const cmd = new GetSecretValueCommand({ SecretId: 'hha/openemr-credentials' });
  const result = await client.send(cmd);
  const secrets = JSON.parse(result.SecretString!);
  process.env.OPENEMR_CLIENT_ID = secrets.client_id;
  process.env.OPENEMR_CLIENT_SECRET = secrets.client_secret;
}
```

---

## 4. Token Management

`openemr.service.ts` already implements in-memory token caching with a 30-second safety buffer before expiry:

```typescript
private cachedToken: { value: string; expiresAt: number } | null = null;

private async getAccessToken(): Promise<string> {
  if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 30_000) {
    return this.cachedToken.value;
  }
  // Fetches new token via POST /oauth2/default/token
  // ...
}
```

OpenEMR `client_credentials` tokens typically expire in **3600 seconds (1 hour)**. The current implementation is correct for a single-instance deployment.

### Multi-Instance Token Cache (Redis)

When running more than one HHA API instance (multiple ECS tasks), move the token cache to Redis to prevent redundant token fetches and potential rate-limiting:

```typescript
private async getAccessToken(): Promise<string> {
  const cached = await this.redis.get('openemr:access_token');
  if (cached) return cached;

  const token = await this.fetchNewToken();
  // Store with a TTL 30 seconds shorter than actual expiry
  await this.redis.setex('openemr:access_token', token.expires_in - 30, token.access_token);
  return token.access_token;
}
```

---

## 5. Integration Points by Domain

### 5.1 Patients

**Direction:** HHA → OpenEMR

**Trigger:** `PatientsService.create()` calls `openemrService.enqueuePatientSync(patientId)`

**OpenEMR endpoints:**

- `POST /apis/default/api/patient` — create new patient
- `PUT /apis/default/api/patient/{uuid}` — update existing patient

**Current status:** The `handleSyncPatient` job in `openemr.processor.ts` enqueues correctly but the actual POST/PUT to OpenEMR is not yet implemented. This is **the first and most critical gap** — all other sync operations require a valid `openemrPatientUuid`.

#### Complete the processor

```typescript
// openemr.processor.ts → handleSyncPatient (replace the placeholder comment)

const token = await this.openemrService.getAccessToken();

const openemrPatient = patient.openemrPatientUuid
  ? await this.openemrService.callOpenemr(token, 'GET', `/api/patient/${patient.openemrPatientUuid}`, undefined, patientId).catch(() => null)
  : null;

const body = {
  fname:        patient.firstName,
  lname:        patient.lastName,
  DOB:          patient.dateOfBirth.toISOString().split('T')[0],  // YYYY-MM-DD
  sex:          mapGender(patient.gender),
  phone_cell:   patient.user.phone ?? '',
  email:        patient.user.email,
  street:       patient.address ?? '',
  city:         patient.city ?? '',
  state:        patient.state ?? '',
  country_code: patient.country,
};

let openemrUuid: string;
if (!openemrPatient) {
  const created = await this.openemrService.callOpenemr(token, 'POST', '/api/patient', body, patientId);
  openemrUuid = (created as any).data.uuid;
} else {
  await this.openemrService.callOpenemr(token, 'PUT', `/api/patient/${patient.openemrPatientUuid}`, body, patientId);
  openemrUuid = patient.openemrPatientUuid!;
}

await this.prisma.patient.update({
  where: { id: patientId },
  data: { openemrPatientUuid: openemrUuid, openemrSyncStatus: 'synced' },
});
```

#### Gender mapping helper

```typescript
function mapGender(g: Gender): string {
  const map: Record<string, string> = {
    Male:              'Male',
    Female:            'Female',
    Other:             'Unknown',
    Prefer_not_to_say: 'Unknown',
  };
  return map[g] ?? 'Unknown';
}
```

#### Field mapping: HHA Patient → OpenEMR

| HHA `Patient` field | OpenEMR field | Notes |
| ------------------- | ------------- | ----- |
| `firstName` | `fname` | |
| `lastName` | `lname` | |
| `dateOfBirth` | `DOB` | ISO date string `YYYY-MM-DD` |
| `gender` | `sex` | Use `mapGender()` helper |
| `user.phone` | `phone_cell` | |
| `user.email` | `email` | |
| `address` | `street` | |
| `city` | `city` | |
| `state` | `state` | |
| `country` | `country_code` | |
| `bloodGroup` | `blood_type` | OpenEMR list field value |
| `openemrPatientUuid` | `uuid` (response) | Store on first create |

---

### 5.2 Appointments / Encounters

**Direction:** HHA → OpenEMR

**Trigger:** `AppointmentsService` when appointment status transitions to `in_progress`

**OpenEMR endpoint:** `POST /apis/default/api/patient/{patient_uuid}/encounter`

**Prerequisite:** Patient must already have `openemrPatientUuid` set (i.e., patient sync must have run first).

#### Enqueue method (add to `openemr.service.ts`)

```typescript
async enqueueEncounterSync(patientId: string, appointmentId: string) {
  await this.syncQueue.add(
    'sync-encounter',
    { patientId, operation: 'sync_record', payload: { appointmentId } },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  );
}
```

#### Processor handler (add to `openemr.processor.ts`)

```typescript
@Process({ name: 'sync-encounter' })
async handleSyncEncounter(job: Job<SyncJobData>) {
  const { patientId, payload } = job.data;
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: payload!.appointmentId as string },
    include: { patient: true, provider: true },
  });

  if (!appointment || !appointment.patient.openemrPatientUuid) {
    this.logger.warn(`Skipping encounter sync — patient ${patientId} not yet synced to OpenEMR`);
    return;
  }

  const token = await this.openemrService.getAccessToken();
  const encounter = await this.openemrService.callOpenemr(
    token, 'POST',
    `/api/patient/${appointment.patient.openemrPatientUuid}/encounter`,
    {
      date:        appointment.scheduledAt.toISOString().split('T')[0],
      onset_date:  appointment.scheduledAt.toISOString().split('T')[0],
      reason:      appointment.reason ?? 'Scheduled Visit',
      facility_id: '1',                                           // Your OpenEMR facility ID
      provider_id: appointment.provider.licenseNumber ?? '',
      pc_catid:    mapServiceType(appointment.serviceType),
    },
    patientId,
  );

  this.logger.log(`OpenEMR encounter created: eid=${(encounter as any).data.eid}`);
}
```

#### Service type → OpenEMR `pc_catid` mapping

> Configure these IDs to match your specific OpenEMR setup. The values below are common defaults.

| HHA `ServiceType` | OpenEMR `pc_catid` | Label |
| ----------------- | ------------------ | ----- |
| `TeleCare` | `5` | Telemedicine Visit |
| `MinuteCare` | `2` | Established Patient Visit |
| `HealthConsult` | `3` | Consultation |
| `ExpertReview` | `6` | Specialist Review |
| `CareTest` | `8` | Lab / Diagnostic |
| `DispatchCare` | `9` | Emergency |
| `NeuroFlex` | `6` | Specialist Review |

---

### 5.3 Clinical Records / Documents

**Direction:** HHA → OpenEMR FHIR

**Trigger:** `RecordsService.create()` after a clinical record is persisted (file uploaded to S3)

**OpenEMR endpoint:** `POST /apis/default/fhir/DocumentReference`

#### FHIR payload

```typescript
const fhirPayload = {
  resourceType: 'DocumentReference',
  status: 'current',
  type: {
    coding: [{ system: 'http://loinc.org', code: mapRecordTypeToLoinc(record.recordType) }],
  },
  subject: {
    reference: `Patient/${patient.openemrPatientUuid}`,
  },
  date: record.recordedAt.toISOString(),
  content: [{
    attachment: {
      url:         record.fileUrl,
      contentType: record.fileMimeType ?? 'application/octet-stream',
      title:       record.title,
    },
  }],
  context: {
    encounter: appointment?.openemrEncounterId
      ? [{ reference: `Encounter/${appointment.openemrEncounterId}` }]
      : [],
  },
};
```

#### Record type → LOINC code mapping

| HHA `RecordType` | LOINC code | Description |
| ---------------- | ---------- | ----------- |
| `visit` | `11488-4` | Consultation Note |
| `prescription` | `57833-6` | Prescription for Medication |
| `lab` | `11502-2` | Laboratory Report |
| `imaging` | `18748-4` | Diagnostic Imaging Study |
| `document` | `34133-9` | Summarization of Episode Note |
| `referral` | `57133-1` | Referral Note |
| `expert_review` | `11488-4` | Consultation Note |

---

### 5.4 Lab Orders & Results

#### Creating a lab order in OpenEMR

**Direction:** HHA → OpenEMR FHIR

**Trigger:** `LabsService.createOrder()`

**OpenEMR endpoint:** `POST /apis/default/fhir/ServiceRequest`

```typescript
const fhirPayload = {
  resourceType: 'ServiceRequest',
  status: 'active',
  intent: 'order',
  code: {
    coding: [{ system: 'http://loinc.org', code: labOrder.testCode }],
    text: labOrder.testName,
  },
  subject:    { reference: `Patient/${patient.openemrPatientUuid}` },
  requester:  { reference: `Practitioner/${provider.openemrProviderUuid}` },
  authoredOn: labOrder.orderedAt.toISOString(),
  note:       labOrder.notes ? [{ text: labOrder.notes }] : [],
};
```

#### Pulling lab results from OpenEMR

**Direction:** OpenEMR → HHA (periodic poll)

**OpenEMR endpoint:** `GET /apis/default/fhir/DiagnosticReport?patient={openemrUuid}&status=final`

**Trigger:** BullMQ repeatable job every 15 minutes (see [Section 7](#7-async-sync-queue--complete-operation-map))

```typescript
@Process({ name: 'pull-lab-results' })
async handlePullLabResults() {
  const patientsWithPendingLabs = await this.prisma.patient.findMany({
    where: { openemrPatientUuid: { not: null }, labOrders: { some: { overallStatus: 'pending' } } },
  });

  for (const patient of patientsWithPendingLabs) {
    const token = await this.openemrService.getAccessToken();
    const bundle = await this.openemrService.callOpenemr(
      token, 'GET',
      `/fhir/DiagnosticReport?patient=${patient.openemrPatientUuid}&status=final`,
    );

    for (const entry of (bundle as any).entry ?? []) {
      const report = entry.resource;
      await this.upsertLabResultFromFhir(report, patient.id);
    }
  }
}
```

#### FHIR DiagnosticReport → HHA `LabResult` field mapping

| FHIR field | HHA `LabResult` field | Notes |
| ---------- | --------------------- | ----- |
| `result[].display` | `testName` | |
| Observation `valueQuantity.value` | `valueDisplay` | Fetch referenced Observation |
| Observation `valueQuantity.unit` | `unit` | |
| Observation `referenceRange[0].text` | `referenceRange` | |
| Observation `interpretation[].code` | `isFlagged` | `A` (Abnormal) → `true` |
| Observation `status` | `status` | `final` → `normal` or `review` |
| `issued` | `updatedAt` | |

---

### 5.5 Medications / Prescriptions

**Direction:** HHA → OpenEMR FHIR

**Trigger:** `RecordsService.create()` when `recordType === 'prescription'`

**OpenEMR endpoint:** `POST /apis/default/fhir/MedicationRequest`

```typescript
const fhirPayload = {
  resourceType: 'MedicationRequest',
  status: 'active',
  intent: 'order',
  medicationCodeableConcept: {
    text: prescription.drugName,
  },
  subject:    { reference: `Patient/${patient.openemrPatientUuid}` },
  requester:  { reference: `Practitioner/${provider.openemrProviderUuid}` },
  authoredOn: prescription.createdAt.toISOString(),
  dosageInstruction: [{
    text: `${prescription.dosage} ${prescription.frequency} via ${prescription.route}`,
    timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
    route: { text: prescription.route },
    doseAndRate: [{
      doseQuantity: { value: 1, unit: prescription.dosage },
    }],
  }],
  dispenseRequest: {
    numberOfRepeatsAllowed: prescription.refillsRemaining,
    validityPeriod: prescription.expiresAt
      ? { end: prescription.expiresAt.toISOString() }
      : undefined,
  },
  note: prescription.notes ? [{ text: prescription.notes }] : [],
};
```

---

### 5.6 Vitals

**Direction:** HHA → OpenEMR FHIR

**Trigger:** `VitalsService.create()` after saving vitals to HHA DB

**OpenEMR endpoint:** `POST /apis/default/fhir` (FHIR Bundle transaction — batches all vitals in one request)

#### LOINC code mapping

| HHA `VitalsReading` field | LOINC code | UCUM unit |
| ------------------------- | ---------- | --------- |
| `heartRate` | `8867-4` | `/min` |
| `systolicBp` | `8480-6` | `mm[Hg]` |
| `diastolicBp` | `8462-4` | `mm[Hg]` |
| `spo2` | `2708-6` | `%` |
| `weightKg` | `29463-7` | `kg` |
| `heightCm` | `8302-2` | `cm` |
| `temperatureC` | `8310-5` | `Cel` |
| `bloodGlucose` | `2339-0` | `mg/dL` |
| `hba1c` | `4548-4` | `%` |
| `haemoglobin` | `718-7` | `g/dL` |
| `wbc` | `6690-2` | `10*3/uL` |
| `rbc` | `789-8` | `10*6/uL` |
| `platelets` | `777-3` | `10*3/uL` |

#### FHIR Bundle payload

```typescript
const entries = vitalsToSync.map(v => ({
  resource: {
    resourceType: 'Observation',
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
      }],
    }],
    code: {
      coding: [{ system: 'http://loinc.org', code: v.loincCode }],
    },
    subject: { reference: `Patient/${openemrPatientUuid}` },
    effectiveDateTime: reading.recordedAt.toISOString(),
    valueQuantity: {
      value:  v.value,
      unit:   v.unit,
      system: 'http://unitsofmeasure.org',
      code:   v.unit,
    },
  },
  request: { method: 'POST', url: 'Observation' },
}));

const bundle = {
  resourceType: 'Bundle',
  type: 'transaction',
  entry: entries,
};
```

---

### 5.7 Telecare / Encounter Notes

**Direction:** HHA → OpenEMR

**Trigger:** `TelecareService` when session moves to `completed` and `TelecareSessionNote` is saved

**OpenEMR endpoint:** `PATCH /apis/default/api/patient/{uuid}/encounter/{eid}`

```typescript
const body = {
  reason:           sessionNote.chiefComplaint ?? '',
  additional_notes: [
    sessionNote.assessment ? `Assessment: ${sessionNote.assessment}` : '',
    sessionNote.plan        ? `Plan: ${sessionNote.plan}`             : '',
  ].filter(Boolean).join('\n'),
};

await this.openemrService.callOpenemr(
  token, 'PATCH',
  `/api/patient/${patient.openemrPatientUuid}/encounter/${openemrEncounterId}`,
  body,
  patientId,
);
```

---

## 6. Shared Helper: `callOpenemr`

Add this `protected` method to `OpenemrService` to centralise HTTP calls, error logging, and the integration error audit trail. Change `getPatientFromOpenemr` to use it as well.

```typescript
// openemr.service.ts — add as a protected method

protected async callOpenemr(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
  patientId?: string,
): Promise<Record<string, unknown>> {
  const isFhir = path.startsWith('/fhir');
  const url = `${this.openemrBase}/apis/default${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': isFhir ? 'application/fhir+json' : 'application/json',
      Accept:         isFhir ? 'application/fhir+json' : 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    this.logger.error(`OpenEMR ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);

    await this.prisma.integrationError.create({
      data: {
        service:      'OpenEMR',
        endpoint:     path,
        method,
        errorCode:    String(res.status),
        errorMessage: text.slice(0, 500),   // Never store full PHI in error logs
        patientId:    patientId ?? null,
      },
    });

    throw new Error(`OpenEMR ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}
```

> Make `getAccessToken()` `protected` (not `private`) so `openemr.processor.ts` can call it directly without going through a public method.

---

## 7. Async Sync Queue — Complete Operation Map

| BullMQ job name | Operation | HHA trigger point | OpenEMR call |
| --------------- | --------- | ----------------- | ------------ |
| `sync-patient` | Create / update patient | `PatientsService.create()` + `update()` | `POST /api/patient` or `PUT /api/patient/{uuid}` |
| `sync-encounter` | Create encounter | Appointment status → `in_progress` | `POST /api/patient/{uuid}/encounter` |
| `sync-record` | Push clinical document | `RecordsService.create()` | `POST /fhir/DocumentReference` |
| `sync-labs` | Push lab order | `LabsService.createOrder()` | `POST /fhir/ServiceRequest` |
| `sync-prescription` | Push medication order | `RecordsService.create()` (type=prescription) | `POST /fhir/MedicationRequest` |
| `sync-vitals` | Push vitals bundle | `VitalsService.create()` | `POST /fhir` (Bundle transaction) |
| `pull-lab-results` | Poll for finalised results | BullMQ repeatable (every 15 min) | `GET /fhir/DiagnosticReport` |
| `sync-provider` | Create / update practitioner | `ProvidersService.create()` + `update()` | `POST /api/practitioner` |

### Register the repeatable pull job

Add `OnModuleInit` to `OpenemrService` to register the repeatable job once at startup:

```typescript
// openemr.service.ts

import { OnModuleInit } from '@nestjs/common';

export class OpenemrService implements OnModuleInit {
  async onModuleInit() {
    // Remove stale repeatable jobs before re-registering to avoid duplicates
    const repeatables = await this.syncQueue.getRepeatableJobs();
    for (const r of repeatables.filter(j => j.name === 'pull-lab-results')) {
      await this.syncQueue.removeRepeatableByKey(r.key);
    }

    await this.syncQueue.add(
      'pull-lab-results',
      {},
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );
  }
}
```

---

## 8. Error Handling & Retry Strategy

### 8.1 Exponential Backoff (already configured)

```typescript
{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
// Retry timeline: +5s, +25s, +125s after failure
```

### 8.2 Dead Letter Handling

After 3 failures the `openemr_sync_queue` row is set to `status = 'failed'`. Admins can:

- **View failed jobs:** `GET /openemr/queue` (admin only)
- **Retry a job:** `POST /openemr/queue/:id/retry`

### 8.3 Idempotency

Before POSTing a new resource to OpenEMR, always check whether the HHA record already has an OpenEMR UUID:

```text
openemrPatientUuid present  → PUT /api/patient/{uuid}    (update)
openemrPatientUuid absent   → POST /api/patient           (create)
```

This prevents duplicate records in OpenEMR when a BullMQ job is retried after a partial success (e.g., OpenEMR created the record but the HHA DB update timed out).

### 8.4 Circuit Breaker (add for production)

If OpenEMR returns 5xx five consecutive times, pause the sync queue for 5 minutes to avoid hammering a degraded service:

```typescript
// Track in Redis; reset counter on any 2xx response
const failures = await this.redis.incr('openemr:consecutive_failures');
await this.redis.expire('openemr:consecutive_failures', 600); // auto-reset after 10 min

if (failures >= 5) {
  this.logger.error('OpenEMR circuit breaker triggered — pausing sync queue for 5 minutes');
  await this.syncQueue.pause();
  setTimeout(async () => {
    await this.syncQueue.resume();
    await this.redis.del('openemr:consecutive_failures');
    this.logger.log('OpenEMR circuit breaker reset — sync queue resumed');
  }, 5 * 60 * 1000);
}
```

---

## 9. OpenEMR Provider (Practitioner) Sync

Providers must exist in OpenEMR before they can be referenced in encounter and prescription payloads.

### 9.1 Schema change required

Add `openemrProviderUuid` to the `Provider` model in `prisma/schema.prisma`:

```prisma
model Provider {
  // ... existing fields ...
  openemrProviderUuid String? @unique @map("openemr_provider_uuid")
}
```

Then run: `npx prisma migrate dev --name "add_openemr_provider_uuid"`

### 9.2 Sync method (add to `openemr.service.ts`)

```typescript
async enqueueProviderSync(providerId: string) {
  await this.syncQueue.add(
    'sync-provider',
    { patientId: providerId, operation: 'create_patient' }, // reuses SyncJobData shape
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  );
}
```

### 9.3 Processor handler

```typescript
@Process({ name: 'sync-provider' })
async handleSyncProvider(job: Job<SyncJobData>) {
  const { patientId: providerId } = job.data; // field reuse
  const provider = await this.prisma.provider.findUnique({
    where: { id: providerId },
    include: { user: { select: { email: true } } },
  });
  if (!provider) return;

  const token = await this.openemrService.getAccessToken();
  const body = {
    fname:    provider.firstName,
    lname:    provider.lastName,
    title:    provider.title,
    specialty: provider.specialty,
    npi:      provider.licenseNumber ?? '',
    email:    provider.user.email,
  };

  let openemrUuid: string;
  if (!provider.openemrProviderUuid) {
    const result = await this.openemrService.callOpenemr(token, 'POST', '/api/practitioner', body);
    openemrUuid = (result as any).data.uuid;
  } else {
    await this.openemrService.callOpenemr(token, 'PUT', `/api/practitioner/${provider.openemrProviderUuid}`, body);
    openemrUuid = provider.openemrProviderUuid;
  }

  await this.prisma.provider.update({
    where: { id: providerId },
    data: { openemrProviderUuid: openemrUuid },
  });
}
```

### 9.4 Field mapping: HHA Provider → OpenEMR Practitioner

| HHA `Provider` field | OpenEMR field | Notes |
| -------------------- | ------------- | ----- |
| `firstName` | `fname` | |
| `lastName` | `lname` | |
| `title` | `title` | e.g., `Dr.` |
| `specialty` | `specialty` | |
| `licenseNumber` | `npi` | Closest OpenEMR equivalent |
| `user.email` | `email` | |
| `openemrProviderUuid` | `uuid` (response) | Store on first create |

---

## 10. Pending Prisma Migrations

Run these migrations in order after `docker compose up -d` starts PostgreSQL:

```bash
cd health-hub-africa-api

# Migration 1: PatientConsent renamed columns + unique constraint + twoFactorEnabled on User
npx prisma migrate dev --name "add_two_factor_consent_unique"

# Migration 2: openemrProviderUuid on Provider (required before provider sync can run)
# First add the field to schema.prisma (see Section 9.1), then:
npx prisma migrate dev --name "add_openemr_provider_uuid"
```

---

## 11. AWS Security Checklist

Complete this checklist before go-live:

### Network & Access

- [ ] OpenEMR EC2 instance is in a **private subnet** — no public IP or Elastic IP assigned
- [ ] OpenEMR security group allows inbound **TCP 443 only from HHA API security group** — not `0.0.0.0/0`
- [ ] VPC Flow Logs enabled to audit all traffic between HHA API and OpenEMR

### Credentials & Secrets

- [ ] `OPENEMR_CLIENT_SECRET` stored in **AWS Secrets Manager** — not in a committed `.env` file
- [ ] HHA API retrieves secrets from Secrets Manager at startup (see Section 3)
- [ ] OpenEMR admin username/password rotated from factory defaults
- [ ] No OpenEMR credentials in git history (`git log --all -p | grep -i openemr_client`)

### TLS & Transport

- [ ] TLS 1.2+ enforced on the OpenEMR ALB/nginx — TLS 1.0 and 1.1 disabled
- [ ] OpenEMR certificate is from a trusted CA (ACM or Let's Encrypt) — not self-signed in production

### Data Protection

- [ ] OpenEMR RDS/database has **encryption at rest** enabled (AWS RDS encryption)
- [ ] S3 bucket for clinical documents has **SSE-S3 or SSE-KMS** encryption enabled
- [ ] S3 bucket has public access blocked — files only accessible via signed URLs
- [ ] `IntegrationError.errorMessage` never stores full PHI — truncated at 500 chars in `callOpenemr()`

### Monitoring & Audit

- [ ] OpenEMR access logs ship to **CloudWatch Logs**
- [ ] HHA API `IntegrationError` table reviewed weekly for repeated failures
- [ ] CloudWatch alarm on `openemr_sync_queue` where `status = 'failed'` count > 10

---

## 12. Testing the Integration

### 12.1 Manual Smoke Test

```bash
# Step 1 — Authenticate with HHA API
TOKEN=$(curl -s -X POST https://api.healthhubafrica.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"your-password"}' \
  | jq -r '.data.accessToken')

# Step 2 — Create a patient (triggers enqueuePatientSync)
curl -X POST https://api.healthhubafrica.com/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Test",
    "lastName":  "Patient",
    "dateOfBirth": "1990-01-15",
    "gender": "Male",
    "regionCode": "LAG"
  }'

# Step 3 — Check the sync queue (requires admin token)
curl https://api.healthhubafrica.com/openemr/queue \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 4 — Verify in OpenEMR admin UI that the patient was created under
#           Administration → Patients, or via API:
curl "${OPENEMR_BASE_URL}/apis/default/api/patient?fname=Test&lname=Patient" \
  -H "Authorization: Bearer $OPENEMR_TOKEN"
```

### 12.2 Unit Tests (Jest)

```typescript
// src/openemr/openemr.service.spec.ts

describe('OpenemrService.callOpenemr', () => {
  it('fetches a new token and calls the endpoint', async () => {
    // Mock token fetch
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test-token', expires_in: 3600 }),
      } as Response)
      // Mock actual endpoint call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { pid: '42', uuid: 'abc-123-def' } }),
      } as Response);

    const result = await service['callOpenemr']('test-token', 'POST', '/api/patient', { fname: 'Test' });
    expect((result as any).data.uuid).toBe('abc-123-def');
  });

  it('creates an IntegrationError record on non-2xx response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false, status: 422,
      text: async () => 'Validation error',
    } as Response);

    const createSpy = jest.spyOn(prisma.integrationError, 'create').mockResolvedValue({} as any);
    await expect(service['callOpenemr']('token', 'POST', '/api/patient', {})).rejects.toThrow('OpenEMR 422');
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ errorCode: '422' }) }));
  });
});
```

### 12.3 Queue Integration Tests

```typescript
// src/openemr/openemr.service.spec.ts

describe('enqueuePatientSync', () => {
  it('adds a sync-patient job with correct data and retry config', async () => {
    const addSpy = jest.spyOn(syncQueue, 'add').mockResolvedValue({} as any);
    await service.enqueuePatientSync('patient-uuid-123');

    expect(addSpy).toHaveBeenCalledWith(
      'sync-patient',
      { patientId: 'patient-uuid-123', operation: 'create_patient' },
      expect.objectContaining({ attempts: 3 }),
    );
  });
});
```

---

## 13. Implementation Priority Order

Given what is already built, implement in this sequence to unblock each subsequent step:

| Priority | Task | Why first |
| -------- | ---- | --------- |
| **1** | Complete `handleSyncPatient` in `openemr.processor.ts` — POST/PUT patient and store `openemrPatientUuid` | All other sync operations require a valid OpenEMR patient UUID |
| **2** | Add `callOpenemr` protected helper to `OpenemrService` | Needed by all processors; eliminates code duplication |
| **3** | Provider sync (`sync-provider` job + `openemrProviderUuid` migration) | Encounters, prescriptions, and lab orders reference the practitioner UUID |
| **4** | Encounter sync — wire `AppointmentsService` status transitions to `enqueueEncounterSync` | Provides encounter context for clinical documents and telecare notes |
| **5** | Vitals sync — wire `VitalsService.create()` to enqueue FHIR Bundle POST | Independent; no encounter dependency for vitals-only readings |
| **6** | Lab order sync — wire `LabsService.createOrder()` to push FHIR `ServiceRequest` | Provides the OpenEMR order reference needed to match incoming results |
| **7** | Lab result pull — register repeatable BullMQ job; upsert into HHA `LabResult` | Closes the loop: orders go out, results come back |
| **8** | Prescription sync — wire `RecordsService` (type=prescription) to push FHIR `MedicationRequest` | Completes the medication record in OpenEMR |
| **9** | Clinical document sync — wire `RecordsService` file records to push FHIR `DocumentReference` | Final piece; attaches uploaded documents to OpenEMR patient chart |
