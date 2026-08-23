# Visit Summary / Clinical Note Release — Discovery Report

> Required by the spec itself before any migration: [HHA_MyHealth_Vault_Visit_Summary_Clinical_Note_Release_Implementation.md](./HHA_MyHealth_Vault_Visit_Summary_Clinical_Note_Release_Implementation.md) §6 ("Pre-Implementation Discovery — Mandatory... Deliverable: a short discovery report and proposed reuse plan before database migration"). Done via direct inspection (SSM into `hha-openemr-prod`, live schema + module source), not assumption.
> **Bottom line: extend the existing AVS system. Do not create `hha_patient_visit_publication`.** A working provider workflow, data model, and audit trail already exist and cover ~80% of the spec's ask — the actual gap is narrower and entirely different from what the spec's own proposed schema implies.

## 1. What already exists (verified live)

### Data model — `hha_ai_after_visit_summary`

```
id, pid, encounter, version,
status               varchar(20)  default 'draft'           -- draft | approved
draft_text           longtext
approved_text        longtext
created_by, updated_by, approved_by, published_by   -- full actor trail
created_at, updated_at, approved_at, published_at
publication_status   varchar(20)  default 'not_published'    -- not_published | ready | published
portal_record_id     varchar(100)                             -- slot for the portal's own record id once ingested
```

This already **is** the spec's proposed `hha_patient_visit_publication` table in every way that matters — draft/approved status, an independent publication lifecycle, actor + timestamp tracking on every transition, and versioning (spec §16's "preserve a history/version reference" requirement). 4 rows in production today (3 `approved`/`not_published`, 1 `approved`/`ready`) — early-stage, actively being built (see §3).

### Audit table — `hha_ai_after_visit_summary_audit`

`avs_id, pid, encounter, action, actor_user_id, status, snapshot, created_at`. Four action values already wired: `DRAFT_RETAINED`, `APPROVED`, `PORTAL_READY`, `PUBLISHED`. Matches spec §16's audit requirements exactly — reusable as-is, just needs one new `action` value (`NOTE_SHARED`) for the clinical-note-release piece.

### Provider workflow — `public/after-visit-summary.php` (310 lines, fully read)

A complete, working provider UI, opened from a card injected into the encounter's forms list (`renderAfterVisitAssistant` in `Bootstrap.php`). Full lifecycle, confirmed step by step:

1. **Readiness gate**: requires SOAP subjective/objective + assessment + plan all present (`$ready = ...`) before any generation is allowed — encounter documentation must be real before a summary can even be drafted.
2. **Generate Local Draft** (`action=generate`) — builds draft text from the SOAP fields via simple template concatenation (`hhaBuildLocalDraft()`: Reason for Visit → "What We Discussed" [subjective] → "Clinical Findings" [objective] → Assessment → "Your Care Plan" [plan]). Not persisted yet, shown in an editable textarea. *(Note: despite the "AI-Assisted" naming throughout, this specific generator is plain template logic, not an LLM call — worth knowing before assuming AI-review-workflow requirements apply here.)*
3. **Retain Edited Draft** (`action=review`) — clinician can edit the generated text before saving; persists to `draft_text`, `status='draft'`, increments `version`, explicitly clears any prior approval fields. Audit: `DRAFT_RETAINED`.
4. **Approve & Save** (`action=approve`) — sets `status='approved'`, `approved_text`, `approved_by`, `approved_at`. **Resets `publication_status` to `'not_published'`** — approval does not auto-publish. Audit: `APPROVED`.
5. **"Ready for MyHealth Vault+"** (`action=portal_ready`) — a *separate, explicit* button, only enabled once approved with non-empty `approved_text`. Sets `publication_status='ready'`. Audit: `PORTAL_READY`.

This is steps 1–4 of the spec's own §11 mockup ("Generate/Refresh", "Preview" [the editable textarea], "Finalize & Publish") already built and working, plus a distinct "ready to send" gate the spec didn't even ask for. **The one thing genuinely missing from this screen: no "Share Clinical Note with Patient" checkbox** — confirms §2 below.

### REST API — `Bootstrap.php` (already reviewed in full during the ID-sync work)

```
GET  /api/hha/avs/status
GET  /api/hha/avs/published/encounter/:encounter   -- returns approved_text once publication_status='ready'
POST /api/hha/avs/published/encounter/:encounter/ack  -- portal calls after ingesting; flips ready→published, records portal_record_id
```

Same scoped-security-listener pattern used for the HHA-ID-sync route shipped today. **Confirmed via full-text search: zero references to `avs`/`visit-summary` anywhere in `health-hub-africa-api/src`.** The portal has never called any of these three routes. The `/ack` endpoint's entire purpose — receiving a `portal_record_id` back from the portal — has never been exercised.

## 2. The actual gap (narrower than the spec assumes)

| Spec requirement | Status |
|---|---|
| Clinical documentation → patient-friendly summary, not raw SOAP | ✅ Already true — `approved_text` is the templated narrative, never the raw SOAP fields |
| Explicit provider publish action, never automatic | ✅ Already true — two separate gates (`approve` then `portal_ready`) |
| Full audit trail with actor + timestamp | ✅ Already true |
| Versioning / amendment history | ✅ Already true (`version` column, increments on every re-save) |
| **Independent Clinical Note sharing control** (§4: two controls, not one) | ❌ **Genuine gap** — no `clinical_note_shared` concept anywhere in the schema, UI, or API. Today there is exactly one release gate (the whole `approved_text`); there's no path — deliberate or accidental — to expose the raw SOAP at all, which is safe by omission but means the feature the spec actually wants (clinician can *optionally* also share the full note) doesn't exist yet |
| Patient-facing Visit Summary API/UI | ❌ **Confirmed gap** — nothing in `health-hub-africa-api` or `health-hub-africa` touches AVS at all |
| Notification on publish (`VISIT_SUMMARY_PUBLISHED`) | ❌ Gap, but see §3 — closer than it looks |

## 3. New finding: a dormant OpenEMR→portal notification bridge already exists

`hha_patient_portal_notifications` (a table neither spec document mentions) already has almost exactly the shape the Notifications spec asked for:

```
id, pid, notification_type, source_type, source_id, encounter,
title, message, target_url, is_read, read_at, created_at,
email_requested, email_status, email_sent_at,
sms_requested, sms_status, sms_sent_at,
dedupe_key   UNIQUE
```

Channel-delivery tracking *and* a `dedupe_key` unique constraint (the spec's own §27 idempotency requirement, already enforced at the DB level) — built, but genuinely dormant: 2 rows total, both `notification_type='system'`, `source_type='test'`, from 2026-08-11. Confirmed via grep: **nothing in the OpenEMR module writes to it, and nothing on the portal side reads from it.** Same "built, never wired" pattern as the FCM push sender and the `NotificationPreference` gap found earlier this session.

This changes the recommended architecture for closing the loop: rather than inventing a new webhook mechanism, the portal already has an established convention for exactly this kind of OpenEMR→portal data flow — `OpenemrService`'s existing `pull-lab-results`, `pull-observations`, `pull-medications`, `pull-documents`, `pull-encounters` cron jobs (all on 15-minute Redis-cursor polling, in `onModuleInit()`). A `pull-visit-summaries` job following the identical pattern — poll `GET /api/hha/avs/published/encounter/:encounter`-equivalent (or a new list-scoped variant) for `publication_status='ready'` records, ingest, `POST .../ack` back — fits the codebase's own architecture rather than adding a bespoke integration style.

## 4. Recommended reuse plan

1. **No new table.** Add to `hha_ai_after_visit_summary`: `clinical_note_shared TINYINT(1) DEFAULT 0`, `note_shared_by BIGINT`, `note_shared_at DATETIME` — three columns, not a new table, not a schema redesign.
2. **Provider UI**: add one checkbox + action (`action=share_note`) to `after-visit-summary.php`, mirroring the existing `portal_ready` action's shape exactly. New audit action `NOTE_SHARED`.
3. **New OpenEMR route**: `GET /api/hha/avs/published/encounter/:encounter/clinical-note`, gated on `publication_status='published' AND clinical_note_shared=1` (mirrors the spec's own §13 pseudocode), returning the full SOAP — same security-listener pattern as the other two AVS routes.
4. **Portal side (genuinely new work, not extension)**: `pull-visit-summaries` cron job (matches existing convention, §3), a `hha_visit_summary` Prisma table to mirror ingested records, `GET /api/patient/visits[/:id][/summary][/clinical-note]` per spec §10, and a Visits list/detail UI in `health-hub-africa`.
5. **Notification bridge**: extend `NotificationsService` with a `VISIT_SUMMARY_PUBLISHED` trigger at the point the `pull-visit-summaries` job ingests a newly-published record — same `createPatientAlert()` + `sendEmail()` call shape already used for appointments/labs/payments (per the Notifications reconciliation). The dormant `hha_patient_portal_notifications` table on the OpenEMR side can stay dormant, or be repurposed later if OpenEMR-originated events ever need to reach the portal *before* the next poll cycle — not required for V1.

## 5. Open items for implementation (not resolved by this discovery pass)

- Spec §12 claims the current portal controller truncates Reason for Visit to 20 characters, and §18 references a "SOAP suppression rule" in `PortalPatientReportController` that must not be removed until this replaces it. Both are in OpenEMR **core** (not this custom module) — not inspected in this pass; confirm both exist as described before touching that controller.
- Confirm whether `approved_text`'s template format (plain concatenated text, §1 above) is acceptable as the patient-facing Visit Summary long-term, or whether product wants the richer structured JSON shape from spec §10's example response — the current generator produces one text blob, not the section-by-section structure (vitals, medications, orders, follow-up) the spec's API contract shows.
- PID 60 / Encounter 135 (spec's designated UAT case, §19) — not checked against current data in this pass.
