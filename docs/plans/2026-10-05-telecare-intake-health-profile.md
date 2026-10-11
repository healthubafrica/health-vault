# MyVault+ TeleCare Intake & Health Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reusable, versioned Health Profile plus a per-visit TeleCare Intake (Save & Resume, conditional logic, document sharing, clinician pre-visit summary, clinician reconciliation) that reaches OpenEMR only after explicit clinician verification.

**Architecture:** Three new NestJS modules (`questionnaire` = pure rules engine and definitions, `health-profile` = normalized longitudinal records with provenance, `intake` = draft → immutable hashed submission → clinician review → reconciliation). Patient UI lives in the existing Next.js portal; clinician UI lives in the existing admin app under `provider/telecare`. OpenEMR sync is a new processor on the **existing** `openemr-sync` Bull queue (shared 5 req/s limiter), driven by a mapper registry that is gated by Phase 0 capability probes. Everything is additive, flag-gated, and ships DEV → QA → PROD.

**Tech Stack:** NestJS 10 + Prisma 5 (PostgreSQL) + class-validator + Bull/Redis + Jest (API) · Next.js App Router + Vitest + Playwright (portal) · Next.js (admin, no unit-test runner) · Expo (mobile, Release 1D only).

**Spec:**
- Requirements: `HHA_MyVaultPlus_TeleCare_Intake_Questionnaire_Requirements.md` (supplied in the request; sections cited below as **REQ §n**)
- Architecture draft: [docs/MYVAULT-TELECARE-INTAKE-HEALTH-PROFILE-ARCHITECTURE.md](../MYVAULT-TELECARE-INTAKE-HEALTH-PROFILE-ARCHITECTURE.md) (cited as **ARCH §n**; it owns the field dictionary and stable field keys, which this plan does not repeat)

## Global Constraints

- **No production changes during discovery** (REQ §21.10). Development follows DEV → QA → PROD; PROD only after documented approval and integration validation (REQ §22).
- **Branching/PRs** (`.claude/rules/git-workflow.md`): branch off `development` as `feature/<slug>`; every merge to `development` or `master` is a PR; commits are Conventional Commits (`type(scope): description`, ≤72 chars). Never push to `development`/`master` directly.
- **Merge gates** (`.claude/rules/merge-gates.md`): `tsc --noEmit`, `build`, and tests green in every changed workspace; no secrets in the diff.
- **Migrations** (`.claude/rules/deployment.md`): applied by the API container's `CMD` (`prisma migrate deploy`) on boot, not by GitHub Actions. Folder name `YYYYMMDDHHMMSS_description` (latest existing: `20260929120000_analytics_pipeline_runs`). **Additive only**: no `DROP`, no column type change, no `NOT NULL` without a `DEFAULT`. Never edit an applied migration.
- **Patient-entered data never silently overwrites clinician-verified data** (REQ §1, §18, §20). A submitted intake is immutable (REQ §14, §20).
- **No PHI** in URLs, logs, analytics payloads, exception messages, alert emails, browser storage, or `audit_logs.metadata` (ARCH §25).
- **Stable field keys** from ARCH §6–18 are the contract; labels may change, keys and codes may not (ARCH §5).
- **`unknown` ≠ `prefer_not_to_answer` ≠ missing** (ARCH §5).
- **Urgent access is never blocked** by an incomplete intake (REQ §15, §20; ARCH §24).
- **Partial dates** are stored as ISO prefix strings (`2019`, `2019-04`, `2019-04-12`) so entered precision survives.
- Soft-delete / supersede clinical facts; never hard-delete (ARCH §25).
- Global coding rules (`~/.claude/rules/ecc`): immutability, files < 800 lines, functions < 50 lines, ≥ 80% coverage on new modules, TDD.

## Review Focus

Input classes the spec implies but a straight reading of the tasks would not exercise. Each has a pinned test in the owning task.

1. **Trigger flipped after dependents were filled** (e.g. patient answers "smokes" → fills amount → changes to "never"; or "surgery: yes" → entries → "no"). Stale dependent answers must not be validated, submitted, snapshotted, or synced. → Task A5 (engine), B3 (draft prune), B4 (submit).
2. **Two devices/tabs on one draft, and double-tap / retried Submit.** Must produce a recoverable conflict (never last-write-wins loss) and exactly one submission. → B3, B4.
3. **Patient edits an item a clinician already verified** (e.g. an allergy). It must drop to `pending_review` with the verified value preserved in history, never stay "verified" with new content. → A6.
4. **OpenEMR down, slow, missing a resource, or clinician edited the same item in OpenEMR after portal reconciliation.** The MyVault+ submission stays intact; retries are idempotent; the conflict is surfaced for review, never overwritten. → C2.
5. **Urgent answers on an incomplete intake or outside service hours** (face/tongue swelling, chest pain). Emergency guidance shows, submission is not blocked, the ops alert contains no PHI, and unapproved (test) safety copy can never run in production. → B2, B4.

---

## 1. Codebase findings that change the plan

Verified against the repo on 2026-10-05. Each row is a place where building the spec literally would have been wrong.

| # | Finding | Evidence | Consequence in this plan |
|---|---------|----------|--------------------------|
| F1 | **`AuditLogInterceptor` copies the whole request body into `audit_logs.metadata`** (only `password`/`token`-style keys stripped). Any intake or profile `PATCH` would write clinical answers into the audit table. | `health-hub-africa-api/src/common/interceptors/audit-log.interceptor.ts:57`; registered globally at `app.module.ts:133` | **Task A1 is first**: opt-out decorator + explicit key-only audit events. Nothing PHI-bearing ships before it. |
| F2 | `PatientConsent` is `@@unique([patientId, consentType])` and `upsert`s in place, so history is overwritten. Per-submission consent evidence cannot live there. | `schema.prisma:1425-1443`, `consents.service.ts:16-37` | New immutable `IntakeConsentEvidence` rows (B1/B4). `PatientConsent` is still upserted so current-state checks keep working. |
| F3 | **`RecordShare` is a token link for external viewers**, not a provider access grant. Providers read records via `PatientProviderAssignment` (SEC-006) plus `providerVisibility`. | `schema.prisma:1583`, `records.service.ts:353-381` | "Share with provider for this consultation" is a new join `TelecareIntakeDocument` plus an extension to `assertReadAccess` (B5). We do **not** reuse `RecordShare` for this. |
| F4 | `ClinicalRecord.providerVisibility` defaults to `true`, so patient uploads are visible to assigned providers by default. ARCH §16 says uploads must not auto-expose. | `schema.prisma:703`; `records.service.ts:188-191` | **Not changed in Release 1** (behavior change to live data). Clinician UI labels intake-shared vs. otherwise-visible documents accurately. Open decision D9. |
| F5 | `openemr.processor.ts` is 2,398 lines; `openemr.service.ts` 1,223. `callOpenemr` is `protected` and the processor reaches it via `this.openemrService['callOpenemr']`. | processor `:507`, service `:719` | New `intake-sync.processor.ts` in its own file; add one **public** `OpenemrService.fhirRequest()` wrapper instead of copying the bracket-access hack. |
| F6 | The `openemr-sync` queue has a shared limiter (5 req/s) because OpenEMR is the slowest upstream. | `openemr.module.ts:16-19` | Reuse that queue with new, distinctly named jobs. A second queue would double the upstream rate. A spike test (C2-1) confirms two `@Processor` classes can share one queue. |
| F7 | `OpenemrSyncQueue` + `IntegrationError` tables and Bull jobs already provide retry and error visibility. Existing pulls: `pull-allergies`, `pull-medications`, `pull-observations`. Existing pushes: `sync-record` (MedicationRequest, DocumentReference), `sync-vitals`, `sync-encounter`. | processor `:487-1570` | Reuse for status/error UI. Patient-reported items must **not** go through `sync-record`'s `MedicationRequest` path (ARCH §10, §22). |
| F8 | Feature flags are Redis-backed `DEFAULT_FLAGS` in `AdminService`; the portal hook **fails open** (`!loaded \|\| flags[key] !== false`). | `admin.service.ts:45-55`, `useFeatureFlags.ts:36` | The flag key `telecare_intake_enabled` is enforced **server-side** by a guard; the UI flag is cosmetic. Default `false`. |
| F9 | `AlertsService.raise({ type, severity, title, body, metadata })` exists, emails admin recipients, dedupes by `type` over 2 h. | `alerts.service.ts:86-92` | Safety escalations reuse it with a per-intake `type` and **no PHI** in title/body/metadata (only ids and rule keys). |
| F10 | Admin app has no unit-test runner (only the portal has Vitest/Playwright; API has Jest). | `health-hub-africa-admin/package.json` | All clinician-side logic (summary, reconciliation, access) lives in the API with Jest tests. Admin UI is verified by `tsc`, `build`, and the manual QA script in §8. |
| F11 | Provider app surfaces already exist at `health-hub-africa-admin/app/(dashboard)/provider/telecare` (with `components/`), plus `operations/telecare`. | directory listing | Clinician intake UI extends these; no new app. |
| F12 | `VitalsReading` stores normalized units with a free-text `source` (default `manual`); `bloodGlucose` has no unit column. | `schema.prisma:820-848` | Intake vitals are normalized then written as `VitalsReading` with `source = 'telecare_intake'`. B4 step 1 resolves the glucose unit before writing. |
| F13 | There is no workspace root `package.json`; each app is independent, so code cannot be imported across API ↔ portal. | repo root listing | The questionnaire **definition** is served by the API at runtime (single source). Only the ~40-line visibility evaluator is duplicated, pinned by shared JSON contract fixtures plus a CI diff check (A5). |
| F14 | `Patient` has `gender` (enum Male/Female/Other/Prefer_not_to_say) and no sex-at-birth, preferred name, marital status, occupation, postal code. `address` is a single string. | `schema.prisma:309-361` | Additive columns only; `address` is kept and `addressLine2`/`postalCode` are added (ARCH §6 allows splitting later). |

## 2. Decisions taken as defaults (need sign-off, none block Phase 0 or 1A)

These resolve ARCH §28. Each default is the lowest-risk option; changing one later is cheap unless noted.

| ID | Decision | Default taken | Cost to change later |
|----|----------|---------------|----------------------|
| D1 | Populations | **Adults (≥18) only.** Under-18 sees "a guardian flow isn't available yet; contact support" and clinician-assisted completion remains possible. | Medium (new proxy model) |
| D2 | Jurisdiction / consent text | Nigeria (NDPA) text, `locale: en`. Statements live in `QuestionnaireVersion.consentStatements`, supplied by clinical/legal. | Low (new version) |
| D3 | Terminology | Free text plus local pick-lists in Release 1. Every item table carries nullable `codeSystem` + `code` so SNOMED/RxNorm/LOINC can be added without a migration. | Low |
| D4 | Summary generation | Deterministic template only. No AI narrative in Release 1. | n/a |
| D5 | Mobile | Release 1 = responsive **web** (portal), satisfying "mobile and desktop" (REQ §22). Native Expo parity is Release 1D. | Scoped separately |
| D6 | Source of truth | MyVault+ owns patient-reported items until verified; after verification OpenEMR is authoritative for clinician-authored items; conflicts are surfaced, never auto-resolved (ARCH §4.1). | Medium |
| D7 | Draft retention | No auto-expiry job in Release 1 (YAGNI). Submitted records are never deleted. Retention periods need policy approval before any purge job. | Low |
| D8 | Safety copy | The engine and rule keys are built; **production patient-message copy must come from clinical + legal.** Rules carry `approvedAt`; in production an unapproved rule disables the intake feature (B2 test). | Gate, not code |
| D9 | `providerVisibility` default | Unchanged in Release 1 (see F4); revisit after Phase 0 privacy review. | Medium (data migration) |
| D10 | Legacy arrays | `allergies`, `chronicConditions`, `activeMedications` on `PatientMedicalInfo` stay as **read-optimized projections** regenerated from the new tables; existing rows are backfilled once (A4). | Low |

## 3. File structure

All paths relative to `Health Hub Africa/`.

```
health-hub-africa-api/
  prisma/migrations/
    20261006100000_health_profile_foundation/migration.sql     (A2)
    20261006110000_health_profile_extended/migration.sql       (A3)
    20261007100000_telecare_intake/migration.sql               (B1: tables + immutability triggers + partial unique index)
    20261010100000_clinical_reconciliation/migration.sql       (C1)
  src/
    common/decorators/audit-redact-body.decorator.ts           (A1)
    common/interceptors/audit-log.interceptor.ts               (A1, modify)
    common/guards/telecare-intake-enabled.guard.ts             (A1)
    questionnaire/                                             (pure, no Nest/Prisma imports)
      types.ts                                                 (A5)
      visibility.ts            + visibility.spec.ts            (A5)
      validate.ts              + validate.spec.ts              (A5)
      safety.ts                + safety.spec.ts                (B2)
      definitions/profile.v1.ts                                (A5)
      definitions/intake.v1.ts + intake.v1.spec.ts             (B2)
      __fixtures__/visibility-cases.json                       (A5, mirrored to portal)
      __fixtures__/expected-keys.json                          (A5/B2, keys transcribed from ARCH §6-18)
    health-profile/
      health-profile.module.ts / .controller.ts / .service.ts / .service.spec.ts   (A6)
      summary-projection.ts    + summary-projection.spec.ts    (A4)
      backfill-legacy-arrays.ts + backfill.spec.ts             (A4)
      dto/*.ts                                                 (A6)
    intake/
      intake.module.ts                                         (B3)
      intake.controller.ts     (patient)                       (B3)
      intake.service.ts        + intake.service.spec.ts        (B3/B4)
      snapshot/canonical.ts    + canonical.spec.ts             (B4)
      snapshot/explode.ts      + explode.spec.ts               (B4)
      vitals-normalize.ts      + vitals-normalize.spec.ts      (B4)
      intake-documents.service.ts + .spec.ts                   (B5)
      summary.builder.ts       + summary.builder.spec.ts       (B6)
      intake-review.controller.ts (clinician)                  (B6)
      reconciliation/reconciliation.service.ts + .spec.ts      (C1)
      dto/*.ts
    openemr/
      intake-sync.processor.ts + .spec.ts                      (C2)
      intake-mappers/index.ts, condition.ts, allergy.ts, medication.ts, ... + specs   (C2)
      openemr.service.ts       (modify: add public fhirRequest)  (C2)
    records/records.service.ts (modify: assertReadAccess)      (B5)
    admin/admin.service.ts     (modify: DEFAULT_FLAGS)         (A1)
    app.module.ts              (register modules)              (A6, B3)

health-hub-africa/                                             (patient portal)
  lib/intake/visibility.ts + visibility.spec.ts + __fixtures__/visibility-cases.json   (A5, mirror of API engine)
  lib/healthProfile/freshness.ts + freshness.spec.ts           (A7)
  lib/intake/useIntakeDraft.ts + useIntakeDraft.spec.ts        (B7)
  lib/api.ts                  (modify: healthProfile, intake namespaces)   (A7, B7)
  components/health-profile/*                                  (A7)
  components/intake/{IntakeWizard,SectionNav,QuestionRenderer,RepeatableGroup,SafetyBanner,DocumentPicker}.tsx   (B7)
  app/(protected)/profile/health/page.tsx                      (A7)
  app/(protected)/telecare/intake/[intakeId]/page.tsx          (B7)
  components/screens/TeleCareScreen.tsx   (modify: intake status card)     (B9)
  tests/e2e/telecare-intake.spec.ts                            (B7/B9)

health-hub-africa-admin/                                       (clinician UI)
  app/(dashboard)/provider/telecare/components/{IntakeSummaryPanel,IntakeResponsesDrawer,ReconciliationTable,SyncStatusBadge}.tsx   (B8, C3)
  app/(dashboard)/provider/telecare/page.tsx   (modify)        (B8)
  lib/api.ts                                   (modify)        (B8, C3)

mobile/                                                        (Release 1D only)
scripts/check-intake-fixtures.mjs                              (A5: asserts API and portal fixtures are byte-identical)
docs/openemr/INTAKE-CAPABILITY-MATRIX.md                       (P0-1 output)
```

## 4. Phase 0: Discovery (2–3 weeks, no PROD changes)

Phase 0 produces evidence, not features. Tasks P0-1 and P0-2 can run in parallel with Release 1A. **C2 cannot start until P0-1 is signed off.**

### Task P0-1: OpenEMR capability matrix (DEV only)

**Files:**
- Create: `health-hub-africa-api/scripts/probe-openemr-capabilities.ts`
- Create: `docs/openemr/INTAKE-CAPABILITY-MATRIX.md` (probe output, committed)

**Interfaces:**
- Produces: a table with one row per resource in `{Patient, Condition, AllergyIntolerance, MedicationStatement, MedicationRequest, Procedure, FamilyMemberHistory, Observation, QuestionnaireResponse, Consent, DocumentReference, Encounter}` and columns `search / create / update / idempotent-update-id / preserves reaction+severity / preserves effective date / preserves patient-reported status / scope granted`. C2's mapper registry reads this verdict per resource.

- [ ] **Step 1: Write the probe script (read-only first, writes only against a DEV synthetic patient)**

```ts
// health-hub-africa-api/scripts/probe-openemr-capabilities.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OpenemrService } from '../src/openemr/openemr.service';

const RESOURCES = [
  'Patient', 'Condition', 'AllergyIntolerance', 'MedicationStatement', 'MedicationRequest',
  'Procedure', 'FamilyMemberHistory', 'Observation', 'QuestionnaireResponse', 'Consent',
  'DocumentReference', 'Encounter',
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run against production');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const emr = app.get(OpenemrService);
  const token = await emr.getAccessToken();
  const rows: string[] = ['| Resource | GET search | Notes |', '|---|---|---|'];
  for (const r of RESOURCES) {
    try {
      await emr.fhirRequest(token, 'GET', `/fhir/${r}?_count=1`);
      rows.push(`| ${r} | ok | |`);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status ?? 'n/a';
      rows.push(`| ${r} | ${status} | not searchable with current scopes or route absent |`);
    }
  }
  console.log(rows.join('\n'));
  await app.close();
}
void main();
```

This step depends on `fhirRequest` (added in C2 step 3). For Phase 0, temporarily call the existing `emr['callOpenemr'](token, 'GET', path)` in the script only; the script is never imported by app code.

- [ ] **Step 2: Run against DEV and save the output**

Run: `cd health-hub-africa-api && NODE_ENV=development npx ts-node scripts/probe-openemr-capabilities.ts > ../docs/openemr/INTAKE-CAPABILITY-MATRIX.md`
Expected: a markdown table with a status per resource.

- [ ] **Step 3: Probe write behavior manually for each resource marked searchable**

For each of Condition, AllergyIntolerance, MedicationStatement, Procedure, FamilyMemberHistory, QuestionnaireResponse, Consent: `POST` a synthetic-patient fixture, record the returned id, `PUT` an edit, `GET` it back, and record whether reaction, severity, effective date, and patient-reported status survived. Add a column to the matrix per finding. Also record: deployed OpenEMR version, the OAuth scopes the existing client holds, and what happens when a clinician edits the same item in the OpenEMR UI after an API write (does `meta.lastUpdated`/`versionId` change?).

- [ ] **Step 4: Declare a fallback per unsupported resource**

For every resource without verified create+update, write one line in the matrix naming the approved fallback (OpenEMR history form, or a versioned PDF/document via `DocumentReference`). The clinical lead signs the matrix in the PR description.

- [ ] **Step 5: Commit**

```bash
git add health-hub-africa-api/scripts/probe-openemr-capabilities.ts docs/openemr/INTAKE-CAPABILITY-MATRIX.md
git commit -m "docs(openemr): add intake capability matrix and DEV probe script"
```

### Task P0-2: Field-by-field mapping inventory and sign-off packet

**Files:**
- Create: `docs/openemr/INTAKE-FIELD-MAPPING.md`

- [ ] **Step 1:** For every key in ARCH §6–18 produce one row: `field key | MyVault+ destination (table.column from this plan's schema) | OpenEMR destination (from P0-1 verdicts) | reconciliation rule | new-development needed?`. Existing columns are named exactly as in `schema.prisma` (e.g. `dateOfBirth → patients.date_of_birth`). Unmapped keys are listed in a final "needs new API/DB" section (REQ §21.2–21.4).
- [ ] **Step 2:** Attach the §2 decision table (D1–D10) and the open ARCH §28 questions to the packet. Obtain written clinical, privacy, and OpenEMR-owner approval (PR approvals are not sufficient; link the sign-off in the PR description).
- [ ] **Step 3: Commit** `docs(intake): add field mapping inventory and sign-off packet`.

**Exit criteria for Phase 0:** signed capability matrix, signed mapping, answered D1–D10 (or defaults accepted in writing), approved consent text, approved urgent-response rules and copy (D8) ahead of PROD enablement.

---

## 5. Release 1A: Longitudinal Health Profile foundation (3–5 weeks)

### Task A1: Security prerequisites: audit PHI redaction and the feature flag

**Files:**
- Create: `health-hub-africa-api/src/common/decorators/audit-redact-body.decorator.ts`
- Create: `health-hub-africa-api/src/common/guards/telecare-intake-enabled.guard.ts`
- Modify: `health-hub-africa-api/src/common/interceptors/audit-log.interceptor.ts:28-60`
- Modify: `health-hub-africa-api/src/admin/admin.service.ts:45-53` (add flag)
- Test: `health-hub-africa-api/src/common/interceptors/audit-log.interceptor.spec.ts`
- Test: `health-hub-africa-api/src/common/guards/telecare-intake-enabled.guard.spec.ts`

**Interfaces:**
- Produces: `@AuditRedactBody()` method/class decorator (key `AUDIT_REDACT_BODY`); `TelecareIntakeEnabledGuard` (`CanActivate`, throws `NotFoundException` when the flag is off); flag key `telecare_intake_enabled` (default `false`).
- Consumes: `AdminService.getFeatureFlags(): Promise<{ key; label; description; enabled }[]>` (`admin.service.ts:2468`).

- [ ] **Step 1: Write the failing interceptor test**

```ts
// audit-log.interceptor.spec.ts
import { of, firstValueFrom } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AUDIT_REDACT_BODY } from '../decorators/audit-redact-body.decorator';

function run(opts: { method?: string; body?: Record<string, unknown>; redact?: boolean }) {
  const create = jest.fn().mockResolvedValue({});
  const prisma = { auditLog: { create } };
  const reflector = { getAllAndOverride: jest.fn((key: string) => (key === AUDIT_REDACT_BODY ? !!opts.redact : undefined)) };
  const interceptor = new AuditLogInterceptor(prisma as any, reflector as any);
  const req = {
    method: opts.method ?? 'PATCH', path: '/api/v1/telecare-intakes/abc/answers', ip: '1.2.3.4',
    headers: { 'user-agent': 'jest' }, params: { id: 'abc' }, body: opts.body ?? {}, user: { sub: 'u1', patientId: 'p1' },
  };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({}), getClass: () => ({}) };
  return { create, observe: () => firstValueFrom(interceptor.intercept(ctx as any, { handle: () => of({ data: { id: 'abc' } }) } as any)).then(() => new Promise((r) => setImmediate(r))) };
}

describe('AuditLogInterceptor body redaction', () => {
  it('records only top-level keys, never values, when @AuditRedactBody is present', async () => {
    const t = run({ redact: true, body: { answers: { reasonForVisit: 'chest pain for 3 days' }, baseRevision: 2 } });
    await t.observe();
    const meta = t.create.mock.calls[0][0].data.metadata;
    expect(meta).toEqual({ changedKeys: ['answers', 'baseRevision'] });
    expect(JSON.stringify(meta)).not.toContain('chest pain');
  });

  it('keeps existing behavior (body minus credentials) when not redacted', async () => {
    const t = run({ redact: false, body: { note: 'x', password: 'secret' } });
    await t.observe();
    expect(t.create.mock.calls[0][0].data.metadata).toEqual({ note: 'x' });
  });

  it('does not audit GET requests', async () => {
    const t = run({ method: 'GET' });
    await t.observe();
    expect(t.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd health-hub-africa-api && npx jest src/common/interceptors/audit-log.interceptor.spec.ts`
Expected: FAIL (`AUDIT_REDACT_BODY` / constructor arity not defined).

- [ ] **Step 3: Implement the decorator and interceptor change**

```ts
// audit-redact-body.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AUDIT_REDACT_BODY = 'audit:redact-body';

/** Keeps request-body values (PHI) out of audit_logs.metadata; only top-level keys are recorded. */
export const AuditRedactBody = () => SetMetadata(AUDIT_REDACT_BODY, true);
```

In `audit-log.interceptor.ts`: import `Reflector` from `@nestjs/core` and the decorator constant; change the constructor to `constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}`; inside `intercept`, before `return next.handle()`, add:

```ts
const redact = this.reflector.getAllAndOverride<boolean>(AUDIT_REDACT_BODY, [context.getHandler(), context.getClass()]);
const body = (req.body ?? {}) as Record<string, unknown>;
const metadata = (redact ? { changedKeys: Object.keys(body) } : stripPhi(body)) as Prisma.InputJsonValue;
```

and replace `metadata: stripPhi(req.body ?? {}) as Prisma.InputJsonValue` with `metadata`. `Reflector` is globally available, so the existing `{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }` needs no change.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/common/interceptors/audit-log.interceptor.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the flag and guard (test first)**

```ts
// telecare-intake-enabled.guard.spec.ts
import { NotFoundException } from '@nestjs/common';
import { TelecareIntakeEnabledGuard } from './telecare-intake-enabled.guard';

const guardWith = (flags: { key: string; enabled: boolean }[]) =>
  new TelecareIntakeEnabledGuard({ getFeatureFlags: jest.fn().mockResolvedValue(flags) } as any);

describe('TelecareIntakeEnabledGuard', () => {
  it('allows when the flag is on', async () => {
    await expect(guardWith([{ key: 'telecare_intake_enabled', enabled: true }]).canActivate({} as any)).resolves.toBe(true);
  });
  it('404s (feature does not exist) when the flag is off', async () => {
    await expect(guardWith([{ key: 'telecare_intake_enabled', enabled: false }]).canActivate({} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('fails CLOSED when the flag is missing, unlike the portal hook', async () => {
    await expect(guardWith([]).canActivate({} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

```ts
// telecare-intake-enabled.guard.ts
import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { AdminService } from '../../admin/admin.service';

export const TELECARE_INTAKE_FLAG = 'telecare_intake_enabled';

@Injectable()
export class TelecareIntakeEnabledGuard implements CanActivate {
  constructor(private readonly admin: AdminService) {}

  async canActivate(): Promise<boolean> {
    const flags = await this.admin.getFeatureFlags();
    if (!flags.find((f) => f.key === TELECARE_INTAKE_FLAG)?.enabled) throw new NotFoundException();
    return true;
  }
}
```

Add to `DEFAULT_FLAGS` in `admin.service.ts`:
`telecare_intake_enabled: { label: 'TeleCare Intake', description: 'Health Profile and TeleCare intake questionnaire', defaultValue: false },`

- [ ] **Step 6: Run both specs and the type-check**

Run: `npx jest src/common && npx tsc --noEmit`
Expected: PASS, no type errors. (If `AdminService` is not importable from `common` without a module cycle, export the guard from the intake module's providers instead and keep the file where it is; do not duplicate flag logic.)

- [ ] **Step 7: Commit**

```bash
git add health-hub-africa-api/src/common health-hub-africa-api/src/admin/admin.service.ts
git commit -m "feat(audit): opt-out body redaction and fail-closed intake feature flag"
```

### Task A2: Schema, shared provenance, tier-1 clinical models

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma` (enums, `Patient` columns and relations, new models)
- Create: `health-hub-africa-api/prisma/migrations/20261006100000_health_profile_foundation/migration.sql` (generated, then reviewed)

**Interfaces:**
- Produces (Prisma delegates used by A4/A6): `patientCondition`, `patientMedication`, `patientAllergy`, `healthItemRevision`, `profileSectionReview`; enums `ClinicalSourceType`, `VerificationStatus`.

- [ ] **Step 1: Add enums and `Patient` columns**

```prisma
enum ClinicalSourceType {
  patient
  clinician
  openemr
  system
  external_document
}

enum VerificationStatus {
  patient_reported
  pending_review
  verified
  amended
  rejected
  entered_in_error
}
```

Add to `model Patient` (all nullable/defaulted, so the migration is additive): `preferredName String? @map("preferred_name")`, `sexAtBirth String? @map("sex_at_birth")`, `genderSelfDescribed String? @map("gender_self_described")`, `maritalStatus String? @map("marital_status")`, `addressLine2 String? @map("address_line2")`, `postalCode String? @map("postal_code")`, `occupation String? @map("occupation")`, `employmentStatus String? @map("employment_status")`, `employer String? @map("employer")`; plus back-relations `conditions PatientCondition[]`, `medications PatientMedication[]`, `allergies PatientAllergy[]`, `sectionReviews ProfileSectionReview[]`.

- [ ] **Step 2: Add the three tier-1 models (identical provenance block) and the shared history/review models**

```prisma
model PatientCondition {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId           String             @map("patient_id") @db.Uuid
  conditionText       String             @map("condition_text")
  codeSystem          String?            @map("code_system")
  code                String?
  diagnosedDate       String?            @map("diagnosed_date") @db.VarChar(10)
  clinicalStatus      String             @default("unknown") @map("clinical_status")
  treatmentSummary    String?            @map("treatment_summary")
  comments            String?
  sourceType          ClinicalSourceType @default(patient) @map("source_type")
  sourceReferenceId   String?            @map("source_reference_id") @db.Uuid
  verificationStatus  VerificationStatus @default(patient_reported) @map("verification_status")
  recordedByUserId    String?            @map("recorded_by_user_id") @db.Uuid
  verifiedByUserId    String?            @map("verified_by_user_id") @db.Uuid
  verifiedAt          DateTime?          @map("verified_at")
  openemrResourceType String?            @map("openemr_resource_type")
  openemrResourceId   String?            @map("openemr_resource_id")
  version             Int                @default(1)
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")
  deletedAt           DateTime?          @map("deleted_at")

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([patientId, deletedAt])
  @@map("patient_conditions")
}

model PatientMedication {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId           String             @map("patient_id") @db.Uuid
  category            String             @default("prescription")
  medicationName      String             @map("medication_name")
  codeSystem          String?            @map("code_system")
  code                String?
  strength            String?
  dose                String?
  frequencyText       String?            @map("frequency_text")
  isAsNeeded          Boolean            @default(false) @map("is_as_needed")
  route               String?
  reason              String?
  prescriberName      String?            @map("prescriber_name")
  startDate           String?            @map("start_date") @db.VarChar(10)
  endDate             String?            @map("end_date") @db.VarChar(10)
  status              String             @default("active")
  sourceType          ClinicalSourceType @default(patient) @map("source_type")
  sourceReferenceId   String?            @map("source_reference_id") @db.Uuid
  verificationStatus  VerificationStatus @default(patient_reported) @map("verification_status")
  recordedByUserId    String?            @map("recorded_by_user_id") @db.Uuid
  verifiedByUserId    String?            @map("verified_by_user_id") @db.Uuid
  verifiedAt          DateTime?          @map("verified_at")
  openemrResourceType String?            @map("openemr_resource_type")
  openemrResourceId   String?            @map("openemr_resource_id")
  version             Int                @default(1)
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")
  deletedAt           DateTime?          @map("deleted_at")

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([patientId, deletedAt])
  @@map("patient_medications")
}

model PatientAllergy {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId           String             @map("patient_id") @db.Uuid
  category            String             @default("medication")
  allergenText        String             @map("allergen_text")
  codeSystem          String?            @map("code_system")
  code                String?
  reactionText        String?            @map("reaction_text")
  severity            String             @default("unknown")
  firstIdentified     String?            @map("first_identified")
  clinicalStatus      String             @default("active") @map("clinical_status")
  sourceType          ClinicalSourceType @default(patient) @map("source_type")
  sourceReferenceId   String?            @map("source_reference_id") @db.Uuid
  verificationStatus  VerificationStatus @default(patient_reported) @map("verification_status")
  recordedByUserId    String?            @map("recorded_by_user_id") @db.Uuid
  verifiedByUserId    String?            @map("verified_by_user_id") @db.Uuid
  verifiedAt          DateTime?          @map("verified_at")
  openemrResourceType String?            @map("openemr_resource_type")
  openemrResourceId   String?            @map("openemr_resource_id")
  version             Int                @default(1)
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("updated_at")
  deletedAt           DateTime?          @map("deleted_at")

  patient Patient @relation(fields: [patientId], references: [id])

  @@index([patientId, deletedAt])
  @@map("patient_allergies")
}

// One history table for every profile item kind. Snapshots are history, not the
// source of truth, so JSON is acceptable here (ARCH §19 forbids JSON-only for the facts themselves).
model HealthItemRevision {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId       String   @map("patient_id") @db.Uuid
  itemKind        String   @map("item_kind")
  itemId          String   @map("item_id") @db.Uuid
  version         Int
  snapshot        Json
  changedByUserId String?  @map("changed_by_user_id") @db.Uuid
  reason          String?
  changedAt       DateTime @default(now()) @map("changed_at")

  @@unique([itemKind, itemId, version])
  @@index([patientId, changedAt(sort: Desc)])
  @@map("health_item_revisions")
}

// Per-section attestation: "I reviewed this section; nothing changed", and the gating
// answer ("Have you had surgery?" → no) that has no item row to hang on.
model ProfileSectionReview {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId  String   @map("patient_id") @db.Uuid
  sectionKey String   @map("section_key")
  gate       String?  // 'yes' | 'no' | 'unknown' | 'prefer_not_to_answer' | null
  reviewedAt DateTime @default(now()) @map("reviewed_at")
  version    Int      @default(1)

  patient Patient @relation(fields: [patientId], references: [id])

  @@unique([patientId, sectionKey])
  @@map("profile_section_reviews")
}
```

- [ ] **Step 3: Generate the migration, inspect, and apply to a scratch DB**

Run: `cd health-hub-africa-api && npx prisma migrate dev --name health_profile_foundation --create-only`
Rename the generated folder to `20261006100000_health_profile_foundation` if the timestamp differs. Open `migration.sql` and confirm: only `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE patients ADD COLUMN ...` (all nullable). Any `DROP`/`ALTER COLUMN TYPE` is a blocker.
Then: `npx prisma migrate dev` (local DB) and `npx prisma generate`.
Expected: migration applies; `npx tsc --noEmit` passes.

- [ ] **Step 4: Commit**

```bash
git add health-hub-africa-api/prisma
git commit -m "feat(health-profile): add provenance enums and tier-1 clinical tables"
```

### Task A3: Tier-2 clinical models

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma`
- Create: `health-hub-africa-api/prisma/migrations/20261006110000_health_profile_extended/migration.sql`

**Interfaces:**
- Produces delegates: `patientProcedure`, `patientHospitalization`, `familyHistoryItem`, `socialHistoryItem`, `patientAccessNeed`, `patientInvestigation`. Each carries the **same provenance block** as A2 (`sourceType` … `deletedAt`), omitted below for brevity only in this document; copy it verbatim into each model.

- [ ] **Step 1: Add the models (fields beyond the shared provenance block)**

| Model (`@@map`) | Fields (Prisma `String?` unless noted) | Source |
|---|---|---|
| `PatientProcedure` (`patient_procedures`) | `procedureText String`, `codeSystem`, `code`, `performedDate` (`VarChar(10)`), `facilityName`, `reason`, `hadComplications Boolean?`, `complicationDetails` | ARCH §9.1 |
| `PatientHospitalization` (`patient_hospitalizations`) | `reason String`, `admissionDate`, `dischargeDate` (`VarChar(10)`), `facilityName`, `outcome` | ARCH §9.2 |
| `FamilyHistoryItem` (`family_history_items`) | `relationship String`, `side String?` (maternal/paternal/not_applicable/unknown), `conditionText String`, `codeSystem`, `code`, `ageAtDiagnosis String?`, `deceased Boolean?`, `ageAtDeath Int?`, `comments` | ARCH §12 |
| `SocialHistoryItem` (`social_history_items`) | `fieldKey String` (a key from ARCH §13), `value Json`, `effectiveFrom DateTime @default(now())`. Current value = newest non-deleted row per `(patientId, fieldKey)` | ARCH §13 |
| `PatientAccessNeed` (`patient_access_needs`) | `needType String` (disability/functional/assistive_device/communication/accommodation), `description String`, `code?` | ARCH §7 |
| `PatientInvestigation` (`patient_investigations`) | `investigationType String`, `performedDate`, `facilityName`, `reason`, `patientReportedResult`, `intakeId String? @db.Uuid` (FK added in B1) | ARCH §16 |

Add `@@index([patientId, deletedAt])` to each (for `SocialHistoryItem` use `@@index([patientId, fieldKey, effectiveFrom(sort: Desc)])`) and the corresponding back-relations on `Patient`.

- [ ] **Step 2:** `npx prisma migrate dev --name health_profile_extended --create-only`, rename folder to the timestamped name above, inspect as in A2 step 3, apply, `npx prisma generate`, `npx tsc --noEmit`.
- [ ] **Step 3: Commit** `feat(health-profile): add tier-2 clinical history tables`.

### Task A4: Summary projection, one-time backfill, legacy-writer audit

**Files:**
- Create: `health-hub-africa-api/src/health-profile/summary-projection.ts` + `summary-projection.spec.ts`
- Create: `health-hub-africa-api/src/health-profile/backfill-legacy-arrays.ts` + `backfill.spec.ts`
- Possibly modify: whichever writers step 1 finds

**Interfaces:**
- Produces: `projectSummaryArrays(input: { conditions: Pick<PatientCondition,'conditionText'|'clinicalStatus'|'verificationStatus'|'deletedAt'>[]; medications: Pick<PatientMedication,'medicationName'|'status'|'verificationStatus'|'deletedAt'>[]; allergies: Pick<PatientAllergy,'allergenText'|'clinicalStatus'|'verificationStatus'|'deletedAt'>[] }): { chronicConditions: string[]; activeMedications: string[]; allergies: string[] }`
- Produces: `backfillLegacyArrays(prisma, patientId): Promise<{ created: number }>`

- [ ] **Step 1: Inventory every existing writer of the legacy arrays**

Run: `cd health-hub-africa-api && grep -rn "chronicConditions\|activeMedications\|allergies:" src --include=*.ts | grep -v "spec.ts"`
Also inspect `openemr.processor.ts` `pull-allergies` (≈ line 1566) and `pull-medications` (≈ line 1325). For each writer record in the PR description: *route through `HealthProfileService`* (A6) or *leave and re-project afterwards*. A writer that is left alone **must** call `HealthProfileService.reproject(patientId)` after its write, otherwise projection and arrays diverge.

- [ ] **Step 2: Write the failing projection test**

```ts
// summary-projection.spec.ts
import { projectSummaryArrays } from './summary-projection';

describe('projectSummaryArrays', () => {
  it('lists active, non-deleted, non-rejected items only', () => {
    const out = projectSummaryArrays({
      conditions: [
        { conditionText: 'Hypertension', clinicalStatus: 'active', verificationStatus: 'verified', deletedAt: null },
        { conditionText: 'Asthma', clinicalStatus: 'resolved', verificationStatus: 'patient_reported', deletedAt: null },
        { conditionText: 'Typo', clinicalStatus: 'active', verificationStatus: 'entered_in_error', deletedAt: null },
        { conditionText: 'Gone', clinicalStatus: 'active', verificationStatus: 'patient_reported', deletedAt: new Date() },
      ],
      medications: [{ medicationName: 'Amlodipine', status: 'active', verificationStatus: 'patient_reported', deletedAt: null }],
      allergies: [{ allergenText: 'Penicillin', clinicalStatus: 'active', verificationStatus: 'pending_review', deletedAt: null }],
    });
    expect(out).toEqual({ chronicConditions: ['Hypertension'], activeMedications: ['Amlodipine'], allergies: ['Penicillin'] });
  });
});
```

- [ ] **Step 3: Run (FAIL), implement, run (PASS)**

```ts
// summary-projection.ts
const EXCLUDED = new Set(['rejected', 'entered_in_error']);
const live = (i: { deletedAt: Date | null; verificationStatus: string }) => !i.deletedAt && !EXCLUDED.has(i.verificationStatus);

export function projectSummaryArrays(input: {
  conditions: { conditionText: string; clinicalStatus: string; verificationStatus: string; deletedAt: Date | null }[];
  medications: { medicationName: string; status: string; verificationStatus: string; deletedAt: Date | null }[];
  allergies: { allergenText: string; clinicalStatus: string; verificationStatus: string; deletedAt: Date | null }[];
}) {
  return {
    chronicConditions: input.conditions.filter((c) => live(c) && ['active', 'recurrence', 'relapse'].includes(c.clinicalStatus)).map((c) => c.conditionText),
    activeMedications: input.medications.filter((m) => live(m) && m.status === 'active').map((m) => m.medicationName),
    allergies: input.allergies.filter((a) => live(a) && a.clinicalStatus === 'active').map((a) => a.allergenText),
  };
}
```

Run: `npx jest src/health-profile/summary-projection.spec.ts` → PASS.

- [ ] **Step 4: Write and pass the idempotent backfill test**

Test cases: (a) a `PatientMedicalInfo` with `allergies: ['Penicillin']` creates one `PatientAllergy` with `sourceType: 'system'`, `verificationStatus: 'patient_reported'`; (b) running it twice creates no duplicates (case-insensitive match on `allergenText`/`conditionText`/`medicationName`); (c) empty arrays create nothing; (d) the legacy arrays are **not** modified by the backfill. Implement with `findMany` of existing rows per patient and `createMany` of the missing ones. Do **not** run it from a migration; expose it as `npm run profile:backfill` (a `scripts/` ts-node entry) executed manually in DEV/QA then PROD after approval.

- [ ] **Step 5: Commit** `feat(health-profile): summary projection and idempotent legacy backfill`.

### Task A5: Questionnaire engine (visibility, validation) and profile definition

This is the correctness core. It is pure TypeScript with no Nest or Prisma imports, so it is trivially unit-testable and is mirrored in the portal.

**Files:**
- Create: `health-hub-africa-api/src/questionnaire/types.ts`, `visibility.ts`, `visibility.spec.ts`, `validate.ts`, `validate.spec.ts`
- Create: `health-hub-africa-api/src/questionnaire/definitions/profile.v1.ts`
- Create: `health-hub-africa-api/src/questionnaire/__fixtures__/visibility-cases.json`, `expected-keys.json`
- Create: `health-hub-africa/lib/intake/visibility.ts`, `visibility.spec.ts`, `__fixtures__/visibility-cases.json` (byte-identical copy)
- Create: `scripts/check-intake-fixtures.mjs`

**Interfaces:**
- Produces (used by A6, B2–B4, B7):

```ts
// types.ts
export type Answers = Record<string, unknown>;
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { q: string; op: 'eq' | 'neq' | 'in' | 'includes' | 'gte' | 'lte' | 'answered'; v?: unknown };
export type QuestionType =
  | 'text' | 'longText' | 'triState' | 'singleSelect' | 'multiSelect' | 'number' | 'scale'
  | 'partialDate' | 'repeatable' | 'documents' | 'ack';
export type Requirement = 'required' | 'recommended' | 'optional';
export interface QuestionDef {
  key: string; section: string; type: QuestionType; label: string; requirement: Requirement;
  options?: { value: string; label: string }[];
  min?: number; max?: number;
  showIf?: Condition;
  fields?: QuestionDef[]; // repeatable items: per-item fields, no showIf inside (Release 1)
}
export interface ValidationIssue { key: string; code: 'required' | 'type' | 'range' | 'option' | 'exclusive'; message: string }
// visibility.ts
export function evaluate(cond: Condition | undefined, answers: Answers): boolean;
export function visibleKeys(questions: QuestionDef[], answers: Answers): Set<string>;
export function pruneHidden(questions: QuestionDef[], answers: Answers): Answers;
// validate.ts
export function validateAnswers(questions: QuestionDef[], answers: Answers): ValidationIssue[];
```

- [ ] **Step 1: Write the failing visibility tests (REQ §16 table plus the Review Focus #1 chain)**

```ts
// visibility.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { evaluate, visibleKeys, pruneHidden } from './visibility';
import type { QuestionDef } from './types';

const q = (key: string, extra: Partial<QuestionDef> = {}): QuestionDef =>
  ({ key, section: 's', type: 'text', label: key, requirement: 'optional', ...extra });

describe('evaluate', () => {
  it('treats a missing condition as visible', () => expect(evaluate(undefined, {})).toBe(true));
  it('supports eq/in/includes/answered', () => {
    expect(evaluate({ q: 'a', op: 'eq', v: 'x' }, { a: 'x' })).toBe(true);
    expect(evaluate({ q: 'a', op: 'in', v: ['current', 'former'] }, { a: 'former' })).toBe(true);
    expect(evaluate({ q: 'a', op: 'includes', v: 'pain' }, { a: ['pain', 'swelling'] })).toBe(true);
    expect(evaluate({ q: 'a', op: 'answered' }, { a: '' })).toBe(false);
    expect(evaluate({ q: 'a', op: 'answered' }, { a: [] })).toBe(false);
  });
  it('an unanswered trigger never satisfies eq/in (no accidental reveal)', () => {
    expect(evaluate({ q: 'a', op: 'eq', v: 'yes' }, {})).toBe(false);
    expect(evaluate({ q: 'a', op: 'in', v: ['yes'] }, {})).toBe(false);
  });
});

describe('visibleKeys / pruneHidden', () => {
  const smoking: QuestionDef[] = [
    q('nicotineUseStatus', { type: 'singleSelect' }),
    q('nicotineProducts', { showIf: { q: 'nicotineUseStatus', op: 'in', v: ['current', 'former'] } }),
    q('nicotineQuitDate', { showIf: { q: 'nicotineUseStatus', op: 'eq', v: 'former' } }),
  ];

  it('REQ §16: "No" smoking hides product, amount and quit-date questions', () => {
    expect([...visibleKeys(smoking, { nicotineUseStatus: 'never' })]).toEqual(['nicotineUseStatus']);
  });

  it('Review Focus #1: flipping the trigger drops stale dependent answers', () => {
    const answers = { nicotineUseStatus: 'never', nicotineProducts: ['cigarettes'], nicotineQuitDate: '2019' };
    expect(pruneHidden(smoking, answers)).toEqual({ nicotineUseStatus: 'never' });
  });

  it('a dependent of a hidden question is hidden even if its own trigger value is stale-true', () => {
    const chain: QuestionDef[] = [
      q('hasSurgery', { type: 'triState' }),
      q('surgeryList', { showIf: { q: 'hasSurgery', op: 'eq', v: 'yes' } }),
      q('anyComplication', { showIf: { q: 'surgeryList', op: 'answered' } }),
    ];
    // hasSurgery flipped to "no" but the old surgeryList answer is still in the draft
    const out = pruneHidden(chain, { hasSurgery: 'no', surgeryList: [{ x: 1 }], anyComplication: 'yes' });
    expect(out).toEqual({ hasSurgery: 'no' });
  });
});

describe('shared contract fixtures (mirrored in the portal)', () => {
  const cases = JSON.parse(readFileSync(join(__dirname, '__fixtures__/visibility-cases.json'), 'utf8')) as Array<{
    name: string; questions: QuestionDef[]; answers: Record<string, unknown>; expectVisible: string[]; expectPruned: Record<string, unknown>;
  }>;
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_n, c) => {
    expect([...visibleKeys(c.questions, c.answers)].sort()).toEqual([...c.expectVisible].sort());
    expect(pruneHidden(c.questions, c.answers)).toEqual(c.expectPruned);
  });
});
```

Create `__fixtures__/visibility-cases.json` with one case for each remaining REQ §16 row (surgery=yes opens `surgeryEntries`; prescription=yes opens `medicationEntries`; recent-tests=yes shows `investigationEntries` and `investigationDocuments`; angioedema=yes shows `swellingFrequency`, `swellingTriggers`, `swellingBreathing`, `swellingEmergencyTreatment`, `swellingFamilyHistory`; `ros.musculoskeletal` includes `joint_pain` shows `msk.location`, `msk.duration`, `msk.morningStiffness`, `msk.severity`, `msk.functionalImpact`). Each case lists `questions`, `answers`, `expectVisible`, `expectPruned`.

- [ ] **Step 2: Run to verify it fails**

Run: `cd health-hub-africa-api && npx jest src/questionnaire/visibility.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `types.ts` (above) and `visibility.ts`**

```ts
// visibility.ts
import type { Answers, Condition, QuestionDef } from './types';

const isAnswered = (a: unknown) =>
  a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);

export function evaluate(cond: Condition | undefined, answers: Answers): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => evaluate(c, answers));
  if ('any' in cond) return cond.any.some((c) => evaluate(c, answers));
  if ('not' in cond) return !evaluate(cond.not, answers);
  const a = answers[cond.q];
  switch (cond.op) {
    case 'eq': return isAnswered(a) && a === cond.v;
    case 'neq': return isAnswered(a) && a !== cond.v;
    case 'in': return isAnswered(a) && Array.isArray(cond.v) && cond.v.includes(a);
    case 'includes': return Array.isArray(a) && a.includes(cond.v);
    case 'gte': return typeof a === 'number' && typeof cond.v === 'number' && a >= cond.v;
    case 'lte': return typeof a === 'number' && typeof cond.v === 'number' && a <= cond.v;
    case 'answered': return isAnswered(a);
  }
}

/** Definition order guarantees triggers precede dependents. A hidden question's answer is invisible to later conditions. */
export function visibleKeys(questions: QuestionDef[], answers: Answers): Set<string> {
  const effective: Answers = {};
  const visible = new Set<string>();
  for (const q of questions) {
    if (!evaluate(q.showIf, effective)) continue;
    visible.add(q.key);
    if (q.key in answers) effective[q.key] = answers[q.key];
  }
  return visible;
}

export function pruneHidden(questions: QuestionDef[], answers: Answers): Answers {
  const visible = visibleKeys(questions, answers);
  return Object.fromEntries(Object.entries(answers).filter(([k]) => visible.has(k)));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/questionnaire/visibility.spec.ts` → PASS.

- [ ] **Step 5: Write the failing validation tests**

```ts
// validate.spec.ts
import { validateAnswers } from './validate';
import type { QuestionDef } from './types';

const base = { section: 's', label: 'L' } as const;
const qs: QuestionDef[] = [
  { ...base, key: 'reason', type: 'longText', requirement: 'required', label: 'Reason' },
  { ...base, key: 'smokes', type: 'triState', requirement: 'optional' },
  { ...base, key: 'quitDate', type: 'partialDate', requirement: 'required', showIf: { q: 'smokes', op: 'eq', v: 'yes' } },
  { ...base, key: 'pain', type: 'scale', requirement: 'optional' },
  { ...base, key: 'ros.cardio', type: 'multiSelect', requirement: 'optional',
    options: [{ value: 'none', label: 'None' }, { value: 'chest_pain', label: 'Chest pain' }] },
  { ...base, key: 'meds', type: 'repeatable', requirement: 'optional',
    fields: [{ ...base, key: 'name', type: 'text', requirement: 'required', label: 'Medication name' }] },
];

describe('validateAnswers', () => {
  it('flags a missing required question', () => {
    expect(validateAnswers(qs, {})).toContainEqual(expect.objectContaining({ key: 'reason', code: 'required' }));
  });
  it('does not require a hidden question', () => {
    const issues = validateAnswers(qs, { reason: 'x', smokes: 'no' });
    expect(issues.find((i) => i.key === 'quitDate')).toBeUndefined();
  });
  it('requires a conditional question once its trigger is met', () => {
    expect(validateAnswers(qs, { reason: 'x', smokes: 'yes' })).toContainEqual(expect.objectContaining({ key: 'quitDate', code: 'required' }));
  });
  it('rejects scale values outside 0-10', () => {
    expect(validateAnswers(qs, { reason: 'x', pain: 11 })).toContainEqual(expect.objectContaining({ key: 'pain', code: 'range' }));
  });
  it('rejects malformed partial dates but accepts year, month and day precision', () => {
    const bad = validateAnswers(qs, { reason: 'x', smokes: 'yes', quitDate: '2019-4' });
    expect(bad).toContainEqual(expect.objectContaining({ key: 'quitDate', code: 'type' }));
    for (const ok of ['2019', '2019-04', '2019-04-12']) {
      expect(validateAnswers(qs, { reason: 'x', smokes: 'yes', quitDate: ok })).toEqual([]);
    }
  });
  it('treats "none" as exclusive with positive symptoms', () => {
    expect(validateAnswers(qs, { reason: 'x', 'ros.cardio': ['none', 'chest_pain'] }))
      .toContainEqual(expect.objectContaining({ key: 'ros.cardio', code: 'exclusive' }));
  });
  it('rejects option values that are not in the definition', () => {
    expect(validateAnswers(qs, { reason: 'x', 'ros.cardio': ['bogus'] })).toContainEqual(expect.objectContaining({ code: 'option' }));
  });
  it('validates each repeatable item and reports an indexed key', () => {
    expect(validateAnswers(qs, { reason: 'x', meds: [{ name: 'A' }, {}] })).toContainEqual(expect.objectContaining({ key: 'meds[1].name', code: 'required' }));
  });
  it('unknown and prefer_not_to_answer are valid answers, not missing', () => {
    const t: QuestionDef[] = [{ ...base, key: 't', type: 'triState', requirement: 'required' }];
    expect(validateAnswers(t, { t: 'unknown' })).toEqual([]);
  });
});
```

- [ ] **Step 6: Run (FAIL), implement, run (PASS)**

```ts
// validate.ts
import { visibleKeys } from './visibility';
import type { Answers, QuestionDef, ValidationIssue } from './types';

const PARTIAL_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const TRI = ['yes', 'no', 'unknown', 'prefer_not_to_answer'];
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function checkValue(q: QuestionDef, v: unknown, key: string): ValidationIssue[] {
  const issue = (code: ValidationIssue['code'], message: string): ValidationIssue[] => [{ key, code, message }];
  switch (q.type) {
    case 'text': case 'longText':
      return typeof v === 'string' ? [] : issue('type', `${q.label} must be text`);
    case 'triState':
      return TRI.includes(v as string) ? [] : issue('option', `${q.label} has an invalid answer`);
    case 'singleSelect':
      return q.options?.some((o) => o.value === v) ? [] : issue('option', `${q.label} has an invalid choice`);
    case 'multiSelect': {
      const arr = Array.isArray(v) ? (v as string[]) : null;
      if (!arr) return issue('type', `${q.label} must be a list`);
      if (arr.some((x) => !q.options?.some((o) => o.value === x))) return issue('option', `${q.label} has an invalid choice`);
      if (arr.includes('none') && arr.length > 1) return issue('exclusive', `${q.label}: "None" cannot be combined with other choices`);
      return [];
    }
    case 'number': case 'scale': {
      const [min, max] = q.type === 'scale' ? [q.min ?? 0, q.max ?? 10] : [q.min ?? -Infinity, q.max ?? Infinity];
      if (typeof v !== 'number' || Number.isNaN(v)) return issue('type', `${q.label} must be a number`);
      return v < min || v > max ? issue('range', `${q.label} must be between ${min} and ${max}`) : [];
    }
    case 'partialDate':
      return typeof v === 'string' && PARTIAL_DATE.test(v) ? [] : issue('type', `${q.label} must be a year, year-month, or full date`);
    case 'ack':
      return v === true ? [] : issue('required', `${q.label} must be acknowledged`);
    case 'repeatable': {
      if (!Array.isArray(v)) return issue('type', `${q.label} must be a list`);
      return v.flatMap((item, i) =>
        validateAnswers(q.fields ?? [], item as Answers).map((x) => ({ ...x, key: `${q.key}[${i}].${x.key}` })));
    }
    case 'documents':
      return Array.isArray(v) && v.every((x) => typeof x === 'string') ? [] : issue('type', `${q.label} must be a list of document ids`);
  }
}

export function validateAnswers(questions: QuestionDef[], answers: Answers): ValidationIssue[] {
  const visible = visibleKeys(questions, answers);
  const issues: ValidationIssue[] = [];
  for (const q of questions) {
    if (!visible.has(q.key)) continue;
    const v = answers[q.key];
    if (isEmpty(v)) {
      if (q.requirement === 'required') issues.push({ key: q.key, code: 'required', message: `${q.label} is required` });
      continue;
    }
    issues.push(...checkValue(q, v, q.key));
  }
  return issues;
}
```

Run: `npx jest src/questionnaire` → PASS.

- [ ] **Step 7: Author `definitions/profile.v1.ts`**

Export `PROFILE_SECTIONS` and `PROFILE_QUESTIONS: QuestionDef[]` for sections ARCH §6–13 (demographics, core health, conditions, procedures, hospitalizations, medications, allergies + swelling, family, social). **Transcribe every field key exactly from ARCH §6–13**; use `requirement` from the Required column (Y→`required`, R→`recommended`, C→`required` with the `showIf` that makes it conditional, N→`optional`). Conditional triggers from the ARCH tables become `showIf` (`nicotineProducts|Amount|Duration` shown when `nicotineUseStatus ∈ {current, former}`; `nicotineQuitDate` when `former`; `employer` when `employmentStatus = employed`; swelling follow-ups when `unexplainedAngioedemaHistory = yes`; etc.). `expected-keys.json` lists every ARCH §6–13 key; the next step's test fails if any is missing.

- [ ] **Step 8: Add the coverage test for the definition**

```ts
// definitions/profile.v1.spec.ts
import expected from '../__fixtures__/expected-keys.json';
import { PROFILE_QUESTIONS } from './profile.v1';
import { visibleKeys } from '../visibility';

const flatKeys = (qs: { key: string; fields?: unknown[] }[]): string[] => qs.flatMap((q) => [q.key, ...flatKeys((q.fields as any) ?? [])]);

describe('profile.v1 definition', () => {
  it('contains every ARCH §6-13 field key (no silent drops)', () => {
    const have = new Set(flatKeys(PROFILE_QUESTIONS as any));
    expect((expected as { profile: string[] }).profile.filter((k) => !have.has(k))).toEqual([]);
  });
  it('has unique keys', () => {
    const keys = PROFILE_QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('every showIf references an earlier question (engine relies on definition order)', () => {
    const seen = new Set<string>();
    const refs = (c: any): string[] => (c.all ?? c.any ?? (c.not ? [c.not] : null))?.flatMap(refs) ?? [c.q];
    for (const q of PROFILE_QUESTIONS) {
      if (q.showIf) for (const r of refs(q.showIf)) expect(seen.has(r)).toBe(true);
      seen.add(q.key);
    }
  });
  it('a fresh patient sees no conditional follow-ups', () => {
    const v = visibleKeys(PROFILE_QUESTIONS, {});
    expect(v.has('nicotineQuitDate')).toBe(false);
  });
});
```

(`resolveJsonModule` must be on in `tsconfig.json`; if it is not, read the JSON with `fs` as in `visibility.spec.ts`.)

- [ ] **Step 9: Mirror the evaluator into the portal and pin it**

Copy `evaluate/visibleKeys/pruneHidden` and `types.ts` (only `Answers`, `Condition`, `QuestionDef`) into `health-hub-africa/lib/intake/visibility.ts` with a header comment: *"Mirror of health-hub-africa-api/src/questionnaire/visibility.ts. Do not edit independently; contract fixtures enforce parity."* Copy `__fixtures__/visibility-cases.json` byte-for-byte and write `visibility.spec.ts` (Vitest) running the same `it.each` loop. Add:

```js
// scripts/check-intake-fixtures.mjs  (run in CI for both workspaces)
import { readFileSync } from 'node:fs';
const a = readFileSync('health-hub-africa-api/src/questionnaire/__fixtures__/visibility-cases.json');
const b = readFileSync('health-hub-africa/lib/intake/__fixtures__/visibility-cases.json');
if (!a.equals(b)) { console.error('Intake visibility fixtures have drifted between API and portal'); process.exit(1); }
```

Run: `node scripts/check-intake-fixtures.mjs && cd health-hub-africa && npx vitest run lib/intake`
Expected: exit 0, PASS.

- [ ] **Step 10: Commit** `feat(questionnaire): visibility and validation engine with contract fixtures`.

### Task A6: Health Profile service and API

**Files:**
- Create: `health-hub-africa-api/src/health-profile/health-profile.module.ts`, `health-profile.controller.ts`, `health-profile.service.ts`, `dto/*.ts`
- Test: `health-hub-africa-api/src/health-profile/health-profile.service.spec.ts`
- Modify: `health-hub-africa-api/src/app.module.ts` (import `HealthProfileModule`)

**Interfaces:**
- Consumes: `projectSummaryArrays` (A4), `validateAnswers` (A5), `TelecareIntakeEnabledGuard` + `@AuditRedactBody()` (A1), delegates from A2/A3.
- Produces:

```ts
export type ProfileKind =
  | 'conditions' | 'medications' | 'allergies' | 'procedures'
  | 'hospitalizations' | 'family-history' | 'social-history' | 'access-needs';

class HealthProfileService {
  getProfile(user: JwtPayload): Promise<{ items: Record<ProfileKind, unknown[]>; sections: { sectionKey: string; gate: string | null; reviewedAt: Date }[] }>;
  addItem(kind: ProfileKind, dto: Record<string, unknown>, user: JwtPayload): Promise<{ id: string; version: number }>;
  updateItem(kind: ProfileKind, id: string, dto: { baseVersion: number } & Record<string, unknown>, user: JwtPayload): Promise<{ id: string; version: number; verificationStatus: string }>;
  removeItem(kind: ProfileKind, id: string, user: JwtPayload): Promise<void>; // soft delete
  reviewSection(sectionKey: string, dto: { gate?: string | null }, user: JwtPayload): Promise<void>;
  reproject(patientId: string): Promise<void>; // regenerates PatientMedicalInfo arrays
}
```

Routes (resourceType for audit = `health-profile`): `GET /health-profile`, `POST /health-profile/:kind`, `PATCH /health-profile/:kind/:id`, `DELETE /health-profile/:kind/:id`, `POST /health-profile/sections/:sectionKey/review`. Controller class carries `@UseGuards(TelecareIntakeEnabledGuard)` and `@AuditRedactBody()`. The patient id is **always** derived from `user.sub` (as `ConsentsService` does), never from the request.

- [ ] **Step 1: Write the failing service tests (mocked Prisma, no Nest `TestingModule`, matching `records.service.spec.ts`)**

Cases (each is one `it`):
1. `updateItem` for another patient's item id → `NotFoundException` (ownership comes from `{ id, patientId }` in the `where`).
2. `updateItem` with a stale `baseVersion` → `ConflictException` whose body includes `currentVersion`.
3. **Review Focus #3:** updating an item whose `verificationStatus` is `verified` sets it to `pending_review`, clears `verifiedAt/verifiedByUserId`, increments `version`, and writes a `HealthItemRevision` containing the **prior verified snapshot** (assert the revision `snapshot.verificationStatus === 'verified'` and `snapshot.allergenText` is the old value).
4. `updateItem` on a `patient_reported` item keeps it `patient_reported` and still writes a revision.
5. `addItem` forces `sourceType: 'patient'`, `verificationStatus: 'patient_reported'`, `recordedByUserId: user.sub` regardless of what the DTO contains (mass-assignment guard).
6. `removeItem` sets `deletedAt` and never calls `delete`.
7. Every mutating call ends by running `reproject` in the same transaction (assert `patientMedicalInfo.upsert` called with the projected arrays).
8. `reviewSection` upserts on `(patientId, sectionKey)`.

- [ ] **Step 2: Run to verify FAIL**, then **Step 3: implement** `health-profile.service.ts`. Core of `updateItem` (the rest follows the same transaction shape):

```ts
const KIND_TO_DELEGATE = {
  conditions: 'patientCondition', medications: 'patientMedication', allergies: 'patientAllergy',
  procedures: 'patientProcedure', hospitalizations: 'patientHospitalization',
  'family-history': 'familyHistoryItem', 'social-history': 'socialHistoryItem', 'access-needs': 'patientAccessNeed',
} as const;

async updateItem(kind: ProfileKind, id: string, dto: { baseVersion: number } & Record<string, unknown>, user: JwtPayload) {
  const patientId = await this.patientIdFor(user);
  const { baseVersion, ...patch } = dto;
  return this.prisma.$transaction(async (tx) => {
    const delegate = (tx as any)[KIND_TO_DELEGATE[kind]];
    const current = await delegate.findFirst({ where: { id, patientId, deletedAt: null } });
    if (!current) throw new NotFoundException();
    if (current.version !== baseVersion) throw new ConflictException({ code: 'VERSION_CONFLICT', currentVersion: current.version });

    await tx.healthItemRevision.create({
      data: { patientId, itemKind: kind, itemId: id, version: current.version, snapshot: current, changedByUserId: user.sub },
    });
    const wasVerified = current.verificationStatus === 'verified' || current.verificationStatus === 'amended';
    const updated = await delegate.update({
      where: { id },
      data: {
        ...pickEditable(kind, patch), // whitelist per kind; provenance columns are never client-writable
        version: { increment: 1 },
        recordedByUserId: user.sub,
        ...(wasVerified ? { verificationStatus: 'pending_review', verifiedAt: null, verifiedByUserId: null } : {}),
      },
    });
    await this.reprojectTx(tx, patientId);
    return { id, version: updated.version, verificationStatus: updated.verificationStatus };
  });
}
```

`pickEditable(kind, patch)` is a per-kind allow-list of the clinical content fields from A2/A3 (never `sourceType`, `verificationStatus`, `verifiedBy*`, `openemr*`, `patientId`). DTO classes use `class-validator` (`@IsOptional() @IsString() @MaxLength(...)`, `@Matches(/^\d{4}(-\d{2}(-\d{2})?)?$/)` for partial dates) under the global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).

- [ ] **Step 4: Run** `npx jest src/health-profile` → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Authorization check:** add one e2e-style test (supertest, existing `test/jest-e2e.json` harness if present; otherwise a controller-level unit test) proving a `provider` role JWT receives 403 on `POST /health-profile/conditions` and that an unauthenticated call is 401.
- [ ] **Step 6: Commit** `feat(health-profile): versioned patient-reported items with verification downgrade`.

### Task A7: Portal Health Profile (returning-patient review/update)

**Files:**
- Create: `health-hub-africa/lib/healthProfile/freshness.ts` + `freshness.spec.ts`
- Create: `health-hub-africa/components/health-profile/{ProfileSectionCard,ProfileItemForm,ProfileSectionList}.tsx`
- Create: `health-hub-africa/app/(protected)/profile/health/page.tsx`
- Modify: `health-hub-africa/lib/api.ts` (add `healthProfile` namespace)
- Modify: `health-hub-africa/components/screens/ProfileScreen.tsx` (link "Health Profile")

**Interfaces:**
- Produces: `sectionStatus(lastReviewedAt: string | null, now: Date, maxAgeDays?: number): 'never' | 'current' | 'stale'` (default 180 days; value to be set by clinical lead).
- Consumes: A6 routes; `useApi(fetcher, deps)`: **pass `deps`** (`[]` is the default and silently freezes the closure; see the stale-closure bug found 2026-10-05 in `RecordsScreen`).

- [ ] **Step 1: Failing Vitest for `sectionStatus`** (never reviewed → `'never'`; 10 days ago → `'current'`; 400 days ago → `'stale'`; exactly at the boundary is `'current'`), implement, pass.
- [ ] **Step 2:** Add `healthProfile` to `lib/api.ts` following the existing `request<...>()` pattern (see the `records` namespace at `lib/api.ts:621`): `get()`, `add(kind, body)`, `update(kind, id, body)`, `remove(kind, id)`, `reviewSection(key, gate?)`. Types mirror A6 outputs.
- [ ] **Step 3:** Build the page: one `ProfileSectionCard` per `PROFILE_SECTIONS` entry (fetched from the API definition endpoint added in B3, or imported as a typed constant until then), showing freshness chip, the item list with verification badges (`Patient-reported` / `Under clinician review` / `Verified`), "Nothing has changed" (calls `reviewSection`), and add/edit via `ProfileItemForm` driven by `visibleKeys` from `lib/intake/visibility.ts`. Version conflicts (HTTP 409) show "This was changed elsewhere. Reload to continue" and refetch; they never overwrite.
- [ ] **Step 4: Verify.** `cd health-hub-africa && npx vitest run && npx tsc --noEmit && npm run build`. Playwright: add `tests/e2e/health-profile.spec.ts` covering (a) add allergy → appears with "Patient-reported"; (b) "Nothing has changed" sets the chip to "Reviewed today"; (c) the page is usable at 320 px width (no horizontal scroll) and keyboard-navigable.
- [ ] **Step 5: Commit** `feat(portal): health profile review and update`.

**Release 1A exit:** returning patients can review and update a structured profile; every change is versioned; verified items drop to review on edit; the flag is off in PROD.

---

## 6. Release 1B: TeleCare intake workflow (4–6 weeks; backend can start after A2)

### Task B1: Intake schema, immutability triggers, partial unique index

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma`
- Create: `health-hub-africa-api/prisma/migrations/20261007100000_telecare_intake/migration.sql`

**Interfaces:**
- Produces delegates: `questionnaireVersion`, `telecareIntake`, `telecareIntakeSnapshot`, `telecareIntakeAnswer`, `intakeConsentEvidence`, `telecareIntakeDocument`, `intakeSafetyEvent`; enum `IntakeStatus`.

- [ ] **Step 1: Add models**

```prisma
enum IntakeStatus {
  draft
  submitted
  under_review
  reconciled
  superseded
  cancelled
}

model QuestionnaireVersion {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key               String
  version           Int
  definition        Json
  definitionHash    String    @map("definition_hash")
  consentStatements Json      @map("consent_statements")
  publishedAt       DateTime? @map("published_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  intakes           TelecareIntake[]

  @@unique([key, version])
  @@map("questionnaire_versions")
}

model TelecareIntake {
  id                     String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId              String       @map("patient_id") @db.Uuid
  appointmentId          String?      @map("appointment_id") @db.Uuid
  sessionId              String?      @map("session_id") @db.Uuid
  questionnaireVersionId String       @map("questionnaire_version_id") @db.Uuid
  status                 IntakeStatus @default(draft)
  revision               Int          @default(1)
  draftAnswers           Json         @default("{}") @map("draft_answers")
  submittedAt            DateTime?    @map("submitted_at")
  submitIdempotencyKey   String?      @map("submit_idempotency_key")
  supersedesId           String?      @unique @map("supersedes_id") @db.Uuid
  createdAt              DateTime     @default(now()) @map("created_at")
  updatedAt              DateTime     @updatedAt @map("updated_at")

  patient              Patient              @relation(fields: [patientId], references: [id])
  appointment          Appointment?         @relation(fields: [appointmentId], references: [id])
  questionnaireVersion QuestionnaireVersion @relation(fields: [questionnaireVersionId], references: [id])
  snapshots            TelecareIntakeSnapshot[]
  answers              TelecareIntakeAnswer[]
  consents             IntakeConsentEvidence[]
  documents            TelecareIntakeDocument[]
  safetyEvents         IntakeSafetyEvent[]

  @@index([patientId, status])
  @@index([appointmentId])
  @@map("telecare_intakes")
}

model TelecareIntakeSnapshot {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intakeId        String   @map("intake_id") @db.Uuid
  revisionNo      Int      @map("revision_no")
  payload         Json
  sha256          String
  createdByUserId String?  @map("created_by_user_id") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at")

  intake  TelecareIntake         @relation(fields: [intakeId], references: [id])
  answers TelecareIntakeAnswer[]

  @@unique([intakeId, revisionNo])
  @@map("telecare_intake_snapshots")
}

model TelecareIntakeAnswer {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intakeId     String   @map("intake_id") @db.Uuid
  snapshotId   String   @map("snapshot_id") @db.Uuid
  questionKey  String   @map("question_key")
  repeatIndex  Int?     @map("repeat_index")
  stringValue  String?  @map("string_value")
  numberValue  Decimal? @map("number_value") @db.Decimal(12, 4)
  booleanValue Boolean? @map("boolean_value")
  jsonValue    Json?    @map("json_value")
  createdAt    DateTime @default(now()) @map("created_at")

  intake   TelecareIntake         @relation(fields: [intakeId], references: [id])
  snapshot TelecareIntakeSnapshot @relation(fields: [snapshotId], references: [id])

  @@index([intakeId, questionKey])
  @@map("telecare_intake_answers")
}

model IntakeConsentEvidence {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intakeId          String   @map("intake_id") @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  statementId       String   @map("statement_id")
  statementVersion  String   @map("statement_version")
  statementTextHash String   @map("statement_text_hash")
  locale            String
  acknowledgedName  String   @map("acknowledged_name")
  grantedAt         DateTime @default(now()) @map("granted_at")
  ipAddress         String?  @map("ip_address")
  userAgent         String?  @map("user_agent")

  intake TelecareIntake @relation(fields: [intakeId], references: [id])

  @@index([intakeId])
  @@map("intake_consent_evidence")
}

model TelecareIntakeDocument {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intakeId         String    @map("intake_id") @db.Uuid
  clinicalRecordId String    @map("clinical_record_id") @db.Uuid
  sharedAt         DateTime  @default(now()) @map("shared_at")
  revokedAt        DateTime? @map("revoked_at")

  intake         TelecareIntake @relation(fields: [intakeId], references: [id])
  clinicalRecord ClinicalRecord @relation(fields: [clinicalRecordId], references: [id])

  @@unique([intakeId, clinicalRecordId])
  @@index([clinicalRecordId, revokedAt])
  @@map("telecare_intake_documents")
}

model IntakeSafetyEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intakeId    String   @map("intake_id") @db.Uuid
  ruleKey     String   @map("rule_key")
  alertRaised Boolean  @default(false) @map("alert_raised")
  triggeredAt DateTime @default(now()) @map("triggered_at")

  intake TelecareIntake @relation(fields: [intakeId], references: [id])

  @@index([intakeId])
  @@map("intake_safety_events")
}
```

Add back-relations (`telecareIntakes TelecareIntake[]` on `Patient` and `Appointment`; `intakeDocuments TelecareIntakeDocument[]` on `ClinicalRecord`) and the FK on `PatientInvestigation.intakeId` from A3. **Do not** add `onDelete: Cascade` to any intake relation.

- [ ] **Step 2: Generate with `--create-only`, then append the DB-level guarantees to `migration.sql`**

```sql
-- One live intake per appointment. Supersession creates a new row only after the old one is marked superseded.
CREATE UNIQUE INDEX "telecare_intakes_one_live_per_appointment"
  ON "telecare_intakes" ("appointment_id")
  WHERE "appointment_id" IS NOT NULL AND "status" IN ('draft', 'submitted', 'under_review');

-- Submitted content is immutable at the database level (REQ §14, §20).
CREATE OR REPLACE FUNCTION forbid_intake_content_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'telecare intake snapshots/answers/consent evidence are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER telecare_intake_snapshots_immutable
  BEFORE UPDATE OR DELETE ON "telecare_intake_snapshots"
  FOR EACH ROW EXECUTE FUNCTION forbid_intake_content_change();
CREATE TRIGGER telecare_intake_answers_immutable
  BEFORE UPDATE OR DELETE ON "telecare_intake_answers"
  FOR EACH ROW EXECUTE FUNCTION forbid_intake_content_change();
CREATE TRIGGER intake_consent_evidence_immutable
  BEFORE UPDATE OR DELETE ON "intake_consent_evidence"
  FOR EACH ROW EXECUTE FUNCTION forbid_intake_content_change();
```

Because these triggers block `DELETE`, a hard delete of a patient or user that has submitted intakes will fail. That is intended (clinical records are soft-deleted). Record this in the PR description for the data-retention owner.

- [ ] **Step 3: Verify the guarantees in a scratch database** with a throwaway script or `psql`: insert a snapshot, then `UPDATE` it → expect `ERROR: ... immutable`; insert two `draft` intakes for one appointment → expect a unique violation; insert a `superseded` plus a `draft` for one appointment → succeeds.
- [ ] **Step 4:** `npx prisma migrate dev`, `npx prisma generate`, `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(intake): intake schema with DB-enforced immutability`.

### Task B2: Intake definition v1, safety rules, approval gate (pure)

**Files:**
- Create: `health-hub-africa-api/src/questionnaire/definitions/intake.v1.ts` + `intake.v1.spec.ts`
- Create: `health-hub-africa-api/src/questionnaire/safety.ts` + `safety.spec.ts`
- Modify: `health-hub-africa-api/src/questionnaire/__fixtures__/expected-keys.json` (add an `intake` array: keys from ARCH §14–18)

**Interfaces:**
- Produces:

```ts
// safety.ts
import type { Answers, Condition } from './types';
export interface SafetyRule { key: string; when: Condition; messageId: string; raiseAlert: boolean; allowContinue: true; approvedAt: string | null }
export interface SafetyHit { ruleKey: string; messageId: string; raiseAlert: boolean }
export function evaluateSafety(rules: SafetyRule[], answers: Answers): SafetyHit[];
export function assertSafetyRulesApproved(rules: SafetyRule[], nodeEnv: string | undefined): void; // throws in production if any rule.approvedAt is null
// intake.v1.ts
export const INTAKE_DEFINITION: QuestionnaireDefinition; // { key:'telecare-intake', version:1, sections, questions, safetyRules, consentStatements, messages }
```

- [ ] **Step 1: Failing tests for safety**

```ts
// safety.spec.ts
import { evaluateSafety, assertSafetyRulesApproved, type SafetyRule } from './safety';

const rules: SafetyRule[] = [
  { key: 'airway_swelling', when: { q: 'ros.allergy_immune', op: 'includes', v: 'facial_swelling' }, messageId: 'emergency_airway', raiseAlert: true, allowContinue: true, approvedAt: null },
  { key: 'chest_pain', when: { all: [{ q: 'ros.cardiovascular', op: 'includes', v: 'chest_pain' }, { q: 'severity', op: 'gte', v: 8 }] }, messageId: 'emergency_cardiac', raiseAlert: true, allowContinue: true, approvedAt: null },
];

describe('evaluateSafety', () => {
  it('fires on a matching answer and never blocks (allowContinue is always true)', () => {
    const hits = evaluateSafety(rules, { 'ros.allergy_immune': ['facial_swelling'] });
    expect(hits).toEqual([{ ruleKey: 'airway_swelling', messageId: 'emergency_airway', raiseAlert: true }]);
  });
  it('requires every clause of an "all" rule', () => {
    expect(evaluateSafety(rules, { 'ros.cardiovascular': ['chest_pain'], severity: 5 })).toEqual([]);
    expect(evaluateSafety(rules, { 'ros.cardiovascular': ['chest_pain'], severity: 9 })).toHaveLength(1);
  });
  it('returns nothing for an empty intake', () => expect(evaluateSafety(rules, {})).toEqual([]));
});

describe('assertSafetyRulesApproved (Review Focus #5)', () => {
  it('throws in production when any rule lacks approvedAt', () => {
    expect(() => assertSafetyRulesApproved(rules, 'production')).toThrow(/unapproved safety rule/i);
  });
  it('allows unapproved rules in development and test', () => {
    expect(() => assertSafetyRulesApproved(rules, 'development')).not.toThrow();
  });
  it('passes in production when all rules are approved', () => {
    expect(() => assertSafetyRulesApproved(rules.map((r) => ({ ...r, approvedAt: '2026-11-01' })), 'production')).not.toThrow();
  });
});
```

- [ ] **Step 2: Implement `safety.ts`**

```ts
import { evaluate } from './visibility';
import type { Answers, Condition } from './types';

export interface SafetyRule { key: string; when: Condition; messageId: string; raiseAlert: boolean; allowContinue: true; approvedAt: string | null }
export interface SafetyHit { ruleKey: string; messageId: string; raiseAlert: boolean }

export const evaluateSafety = (rules: SafetyRule[], answers: Answers): SafetyHit[] =>
  rules.filter((r) => evaluate(r.when, answers)).map((r) => ({ ruleKey: r.key, messageId: r.messageId, raiseAlert: r.raiseAlert }));

export function assertSafetyRulesApproved(rules: SafetyRule[], nodeEnv: string | undefined): void {
  if (nodeEnv !== 'production') return;
  const bad = rules.filter((r) => !r.approvedAt).map((r) => r.key);
  if (bad.length) throw new Error(`Unapproved safety rule(s) cannot run in production: ${bad.join(', ')}`);
}
```

Run both tests → PASS.

- [ ] **Step 3: Author `intake.v1.ts`.** Sections and keys come verbatim from ARCH §14 (visit-specific HPI), §15 (ROS: one `multiSelect` per `systemCode`, key `ros.<systemCode>`, options = symptom codes plus `none`), §16 (investigations; `investigationDocuments` of type `documents`), §17 (vitals as a `repeatable` group), §18 (goals and acknowledgements; `consultationGoal` required). Include the REQ §16 follow-ups as `showIf`, the MSK follow-ups (`msk.location`, `msk.duration`, `msk.morningStiffness`, `msk.severity`, `msk.functionalImpact`) when `ros.musculoskeletal` is non-empty and not exactly `['none']`, and `safetyRules` for the ARCH §24 trigger list **with `approvedAt: null` and placeholder test copy keys only** (no invented clinical wording). `consentStatements` carries the four REQ §14 acknowledgements with `text` marked `"[PENDING APPROVED COPY]"` in DEV; the B4 submit path refuses to run in production while any statement text contains that marker (asserted in the test below).
- [ ] **Step 4: Definition tests** (same three structural tests as A5 step 8 against `INTAKE_DEFINITION.questions`, plus): `expected-keys.json#intake` fully covered; a test that `INTAKE_DEFINITION.consentStatements.some(s => s.text.includes('[PENDING'))` is `true` (so the production gate in B4 is exercised) and that `assertSafetyRulesApproved(INTAKE_DEFINITION.safetyRules, 'production')` throws until copy is approved; and a REQ §16 row test: `visibleKeys(INTAKE_DEFINITION.questions, { hasRecentInvestigations: 'yes' })` includes `investigationDocuments`.
- [ ] **Step 5: Commit** `feat(questionnaire): intake definition v1 and safety rule engine`.

### Task B3: Draft lifecycle: create/resume, read, Save & Resume with optimistic concurrency

**Files:**
- Create: `health-hub-africa-api/src/intake/intake.module.ts`, `intake.controller.ts`, `intake.service.ts`, `dto/{create-intake,save-answers,submit-intake}.dto.ts`
- Test: `health-hub-africa-api/src/intake/intake.service.spec.ts`
- Create: a seed step publishing `INTAKE_DEFINITION` into `questionnaire_versions` (extend `prisma/seed.ts` and add an idempotent `ensureQuestionnaireVersion()` called at module init)
- Modify: `health-hub-africa-api/src/app.module.ts`

**Interfaces:**
- Consumes: `visibleKeys`, `pruneHidden` (A5), `INTAKE_DEFINITION` (B2), `TelecareIntakeEnabledGuard`, `@AuditRedactBody()`.
- Produces:

```ts
class IntakeService {
  createOrResume(dto: { appointmentId?: string }, user: JwtPayload): Promise<IntakeView>; // idempotent per live (patient, appointment)
  getForPatient(id: string, user: JwtPayload): Promise<IntakeView>;
  saveAnswers(id: string, dto: { baseRevision: number; answers: Record<string, unknown | null> }, user: JwtPayload): Promise<{ revision: number; visibleKeys: string[] }>;
}
interface IntakeView { id: string; status: IntakeStatus; revision: number; answers: Answers; visibleKeys: string[]; definitionVersion: number }
```

Routes (audit `resourceType` = `telecare-intakes`): `GET /telecare-intakes/questionnaire/current`, `POST /telecare-intakes`, `GET /telecare-intakes/:id`, `PATCH /telecare-intakes/:id/answers`. Controller carries `@UseGuards(TelecareIntakeEnabledGuard)` and `@AuditRedactBody()`. Throttle the PATCH route (`@Throttle`) consistently with other write routes.

- [ ] **Step 1: Failing tests**

1. `createOrResume` called twice for the same appointment returns the **same** intake id (second call finds the live draft).
2. `createOrResume` with an `appointmentId` belonging to another patient → `ForbiddenException`/`NotFoundException`; with a non-TeleCare appointment → `BadRequestException`.
3. `getForPatient` for another patient's intake → `NotFoundException`.
4. `saveAnswers` merges, prunes hidden keys, increments `revision`, and returns `visibleKeys` (assert the persisted `draftAnswers` argument has no stale dependent keys; **Review Focus #1**).
5. `saveAnswers` with `{ key: null }` deletes that key from the draft.
6. **Review Focus #2:** `saveAnswers` with a stale `baseRevision` → `ConflictException` with `{ code: 'REVISION_CONFLICT', currentRevision }`, and `draftAnswers` is not written (assert `updateMany` returned `{ count: 0 }` path never overwrites).
7. `saveAnswers` with an unknown question key → `BadRequestException`.
8. `saveAnswers` on a submitted intake → `ConflictException('Intake already submitted')`.
9. The error body for every exception contains no answer values (assert `JSON.stringify(err.getResponse())` lacks a sentinel string put in the answers).

- [ ] **Step 2: Run (FAIL). Step 3: Implement `saveAnswers`**

```ts
async saveAnswers(id: string, dto: SaveAnswersDto, user: JwtPayload) {
  const patientId = await this.patientIdFor(user);
  const intake = await this.prisma.telecareIntake.findFirst({ where: { id, patientId }, include: { questionnaireVersion: true } });
  if (!intake) throw new NotFoundException();
  if (intake.status !== 'draft') throw new ConflictException('Intake already submitted');

  const questions = (intake.questionnaireVersion.definition as unknown as QuestionnaireDefinition).questions;
  const known = new Set(questions.map((q) => q.key));
  const unknownKeys = Object.keys(dto.answers).filter((k) => !known.has(k));
  if (unknownKeys.length) throw new BadRequestException({ code: 'UNKNOWN_QUESTION', keys: unknownKeys });

  const merged: Answers = { ...(intake.draftAnswers as Answers) };
  for (const [k, v] of Object.entries(dto.answers)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  const pruned = pruneHidden(questions, merged);

  const { count } = await this.prisma.telecareIntake.updateMany({
    where: { id, patientId, status: 'draft', revision: dto.baseRevision },
    data: { draftAnswers: pruned as Prisma.InputJsonValue, revision: { increment: 1 } },
  });
  if (count === 0) {
    const cur = await this.prisma.telecareIntake.findUnique({ where: { id }, select: { revision: true } });
    throw new ConflictException({ code: 'REVISION_CONFLICT', currentRevision: cur?.revision });
  }
  await this.recordAudit(user.sub, patientId, 'intake.answers_saved', id, { changedQuestionKeys: Object.keys(dto.answers) });
  return { revision: dto.baseRevision + 1, visibleKeys: [...visibleKeys(questions, pruned)] };
}
```

`recordAudit` writes one `auditLog` row containing **keys only** (no values), plus `intakeId`; the interceptor's own row is already redacted by `@AuditRedactBody()`.

- [ ] **Step 4: Run** `npx jest src/intake` → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat(intake): draft lifecycle with revision-checked Save & Resume`.

### Task B4: Submit: validation, consent evidence, hashed immutable snapshot, vitals, safety

**Files:**
- Create: `health-hub-africa-api/src/intake/snapshot/canonical.ts` + `canonical.spec.ts`
- Create: `health-hub-africa-api/src/intake/snapshot/explode.ts` + `explode.spec.ts`
- Create: `health-hub-africa-api/src/intake/vitals-normalize.ts` + `vitals-normalize.spec.ts`
- Modify: `health-hub-africa-api/src/intake/intake.service.ts` (+ spec cases), `dto/submit-intake.dto.ts`
- Modify: `health-hub-africa-api/src/alerts/alerts.module.ts` import if `AlertsService` is not already available to `IntakeModule`

**Interfaces:**
- Produces:

```ts
// canonical.ts
export function canonicalize(value: unknown): string;   // key-sorted, undefined-stripped JSON
export function hashSnapshot(value: unknown): string;   // sha256 hex of canonicalize(value)
// explode.ts
export interface AnswerRow { questionKey: string; repeatIndex: number | null; stringValue?: string; numberValue?: number; booleanValue?: boolean; jsonValue?: unknown }
export function explodeAnswers(questions: QuestionDef[], answers: Answers): AnswerRow[];
// vitals-normalize.ts
export interface EnteredVitals { systolicBp?: number; diastolicBp?: number; heartRate?: number; temperature?: { value: number; unit: 'C' | 'F' }; weight?: { value: number; unit: 'kg' | 'lb' }; height?: { value: number; unit: 'cm' | 'm' | 'ftin'; inches?: number }; spo2?: number; bloodGlucose?: { value: number; unit: 'mg/dL' | 'mmol/L' }; recordedAt: string }
export function normalizeVitals(v: EnteredVitals): { data: Partial<Prisma.VitalsReadingUncheckedCreateInput>; warnings: string[] };
// intake.service.ts
submit(id: string, dto: { idempotencyKey: string; consentStatementIds: string[]; acknowledgedName: string }, user: JwtPayload, ctx: { ip?: string; userAgent?: string }): Promise<{ intakeId: string; submittedAt: Date; sha256: string; safetyHits: SafetyHit[] }>;
```

- [ ] **Step 1: Failing tests for `canonical`** (same object with different key order hashes equal; `undefined` fields do not change the hash; arrays are order-sensitive; nested objects sorted), implement, pass:

```ts
export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  const o = v as Record<string, unknown>;
  const body = Object.keys(o).filter((k) => o[k] !== undefined).sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`).join(',');
  return `{${body}}`;
}
// hashSnapshot = createHash('sha256').update(canonicalize(v)).digest('hex')
```

- [ ] **Step 2: Failing tests for `explodeAnswers`**: scalar → one row with the right typed column; `multiSelect` → one `jsonValue` row; `repeatable` of 2 items × 2 fields → 4 rows with `repeatIndex` 0/0/1/1 and keys `meds.name`; `triState` `'unknown'` is **kept** (not dropped as empty); empty arrays and `''` are omitted. Implement, pass.
- [ ] **Step 3: Resolve the glucose unit (F12) before writing `normalizeVitals`.** Run `grep -rn "bloodGlucose" health-hub-africa-api/src health-hub-africa/lib mobile/app mobile/lib --include=*.ts --include=*.tsx | grep -v spec`, determine the unit existing readers assume (likely mg/dL), and record it in the PR. If consumers assume nothing, normalize to mg/dL (×18.0182 from mmol/L).
- [ ] **Step 4: Failing tests for `normalizeVitals`**: 98.6 °F → 37.0 °C; 154 lb → 69.85 kg; 5 ft 10 in → 177.8 cm; 0 < SpO₂ ≤ 100 kept; **soft plausibility warnings, never rejection** (BP 300/20 returns data **and** a warning such as `systolicBp outside typical range`, so emergency values are not silently dropped); diastolic without systolic → warning `incomplete blood pressure` and neither written; every output has `source: 'telecare_intake'` and a parsed `recordedAt`. Implement, pass.
- [ ] **Step 5: Failing tests for `submit`**, then implement. Cases:
  1. Valid draft → one `$transaction` that updates the intake to `submitted` with `revision` check, creates one `TelecareIntakeSnapshot` (payload includes questionnaire key/version/`definitionHash`, patientId, appointmentId, ISO `submittedAt`, **pruned** answers, consent ids, plus a read-only `profileSnapshot` of active items), `createMany` of exploded answers, one `IntakeConsentEvidence` per accepted statement with `statementTextHash = sha256(text)`, `IntakeSafetyEvent` rows for hits, vitals `VitalsReading` rows, and `patientConsent.upsert` for `consentType: 'telecare'`.
  2. **Review Focus #1:** a draft containing a stale hidden answer is submitted **without** it (assert the snapshot payload lacks the key).
  3. Missing required answers → `UnprocessableEntityException({ issues })`; nothing written.
  4. Missing/unknown consent statement id, or `acknowledgedName` not equal (case-insensitive, trimmed) to the patient's legal name → 422.
  5. **Review Focus #2:** two `submit` calls with the same `idempotencyKey` → one snapshot; the second returns the first result (simulate by making the second `updateMany` return `{ count: 0 }` and the re-read show `status: 'submitted'` with the same key).
  6. Submit with a different key on an already-submitted intake → `ConflictException`.
  7. Draft `revision` changed between read and claim (concurrent edit) → `ConflictException`; nothing written.
  8. **Review Focus #5:** hits with `raiseAlert: true` call `AlertsService.raise` **after** the transaction commits with `type: \`intake_safety:${intakeId}:${ruleKey}\``, and the title/body/metadata contain only the intake id and rule key (assert none of the answer strings appear). If `raise` throws, `submit` still returns success (alert failure must not undo the submission) and the failure is logged without PHI.
  9. In production (`NODE_ENV=production`) `submit` throws while `assertSafetyRulesApproved` fails or any consent statement text contains `[PENDING`.
  10. Patient under 18 (from `dateOfBirth`) → `ForbiddenException` with a non-clinical message (D1).
  11. The returned `safetyHits` carry `messageId` only; the portal resolves copy from the definition.

  Core of the transaction (the claim is what makes it atomic and idempotent):

  ```ts
  const claimed = await tx.telecareIntake.updateMany({
    where: { id, patientId, status: 'draft', revision: intake.revision },
    data: { status: 'submitted', submittedAt, submitIdempotencyKey: dto.idempotencyKey, revision: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new ConflictException({ code: 'SUBMIT_CONFLICT' });
  ```

  On `SUBMIT_CONFLICT`, the caller re-reads the intake and, if `status !== 'draft'` and `submitIdempotencyKey === dto.idempotencyKey`, returns the stored result instead of throwing.

- [ ] **Step 6:** `npx jest src/intake && npx tsc --noEmit` → PASS. Add the controller route `POST /telecare-intakes/:id/submit` (`@AuditRedactBody()`, `@Throttle`, `Idempotency-Key` header accepted as an alternative to the body field, matching the appointments pattern).
- [ ] **Step 7: Commit** `feat(intake): immutable hashed submission with consent evidence and safety escalation`.

### Task B5: Document selection per consultation (access extension)

**Files:**
- Create: `health-hub-africa-api/src/intake/intake-documents.service.ts` + `.spec.ts`
- Modify: `health-hub-africa-api/src/records/records.service.ts:353-381` (`assertReadAccess`) + `records.service.spec.ts`
- Routes added to `intake.controller.ts`: `POST /telecare-intakes/:id/documents`, `DELETE /telecare-intakes/:id/documents/:recordId`

**Interfaces:**
- Produces: `IntakeDocumentsService.attach(intakeId, recordIds, user)`, `.revoke(intakeId, recordId, user)`, `.listForIntake(intakeId, viewer)` returning `{ recordId, title, category, recordedAt, source: DocumentSource, sharedAt, shareStatus: 'shared' | 'revoked', origin: 'patient_uploaded' | 'provider_generated' | 'imported' }[]`.

- [ ] **Step 1: Failing tests**: attach rejects a record owned by another patient; attach is idempotent (`@@unique([intakeId, clinicalRecordId])`; re-attach after revoke clears `revokedAt`); `revoke` sets `revokedAt` and never deletes; attach/revoke are allowed while the intake is `draft` **and after submission** (patients may revoke at any time; attach after submission is allowed until review is `reconciled`); each action writes an audit row with the record id only.
- [ ] **Step 2: Failing test for the access extension in `records.service.spec.ts`**: a `provider` who is **not** assigned to the patient but is the `providerId` of the appointment that has an intake with a non-revoked `TelecareIntakeDocument` for that record **can** read it; after `revokedAt` is set they **cannot**; a different provider cannot; behavior for assigned providers and patients is unchanged (regression asserts for existing cases at lines 20–60 of the spec).
- [ ] **Step 3: Implement.** Extend the private `assertReadAccess` signature to accept `id?: string` on the `record` argument (callers pass the record they already loaded). After computing `isAssignedProvider`, add:

```ts
let isIntakeSharedProvider = false;
if (!isAssignedProvider && currentUser.role === UserRole.provider && currentUser.providerId && record.id) {
  isIntakeSharedProvider = !!(await this.prisma.telecareIntakeDocument.findFirst({
    where: { clinicalRecordId: record.id, revokedAt: null, intake: { appointment: { providerId: currentUser.providerId } } },
    select: { id: true },
  }));
}
```

and permit access when `isAssignedProvider || isIntakeSharedProvider`. Keep the `isDownloadable === false` confidentiality rule requiring `isAssignedProvider || isAdmin` (an intake share does not unlock a confidential record).
- [ ] **Step 4:** `npx jest src/records src/intake` → PASS (existing records specs must still pass unmodified).
- [ ] **Step 5: Commit** `feat(intake): per-consultation document sharing with provider read access`.

### Task B6: Pre-visit summary and clinician read endpoints

**Files:**
- Create: `health-hub-africa-api/src/intake/summary.builder.ts` + `summary.builder.spec.ts`
- Create: `health-hub-africa-api/src/intake/intake-review.controller.ts`, `intake-review.service.ts` + `.spec.ts`

**Interfaces:**
- Produces:

```ts
export interface PreVisitSummary {
  reasonForVisit: { chiefConcern: string; narrative: string };
  hpi: { onset?: string; duration?: string; course?: string; severity?: number; associatedSymptoms: string[] };
  safetyFlags: { ruleKey: string; label: string }[];          // labelled "patient-reported", never a diagnosis
  history: { conditions: ProfileLine[]; procedures: ProfileLine[]; hospitalizations: ProfileLine[] };
  medications: ProfileLine[];                                   // each line carries verificationStatus
  allergies: (ProfileLine & { reaction?: string; severity?: string })[];
  familyHistory: ProfileLine[];
  socialHistory: ProfileLine[];
  investigations: { type: string; date?: string; reportedResult?: string; documents: string[] }[];
  positiveRos: { system: string; symptoms: string[] }[];       // negatives stay in the full response
  vitals: { name: string; value: string; source: string; recordedAt: string }[];
  documents: { recordId: string; title: string; origin: string; sharedAt: string }[];
  goals: { consultationGoal: string; questions?: string };
  needsVerification: { kind: string; id: string; label: string }[];
}
export function buildPreVisitSummary(input: { snapshot: SnapshotPayload; definition: QuestionnaireDefinition; profile: ProfileSnapshot; vitals: VitalsRow[]; documents: IntakeDocumentRow[]; safetyHits: SafetyHit[] }): PreVisitSummary;
```

Routes (`@Roles(provider, admin, super_admin, coordinator)`, resourceType `intake-review`): `GET /intake-review/:id/summary`, `GET /intake-review/:id/responses`, `GET /intake-review/by-appointment/:appointmentId`.

- [ ] **Step 1: Failing builder tests** (pure function, fixture-driven): (a) `positiveRos` omits systems answered `['none']` and includes only positive symptoms; (b) a medication with `verificationStatus: 'patient_reported'` appears in `medications` **and** in `needsVerification`; a `verified` one appears only in `medications`; (c) `safetyFlags` labels never contain diagnosis words (assert labels come from the definition's `messages` table); (d) allergies always carry reaction and severity when present (ARCH §27); (e) vitals sorted newest first and each shows `source`; (f) an empty intake still returns every section key with empty arrays (the UI relies on a stable shape); (g) `needsVerification` is built from `verificationStatus ∈ {patient_reported, pending_review}` items only.
- [ ] **Step 2: Implement the builder** as section functions of < 50 lines each, composed in `buildPreVisitSummary`. Implementation reads definition order so output order follows the REQ §19 list.
- [ ] **Step 3: Failing access tests for `IntakeReviewService`**: patient-role → 403; admin/coordinator/super_admin → allowed; provider is allowed only if `appointment.providerId === user.providerId` **or** an active `PatientProviderAssignment` exists (mirror `assertReadAccess`); provider on someone else's appointment → 403 and **no** audit-free read (every `summary`/`responses` read writes an audit row `intake.viewed` with the intake id and viewer id, since reads of PHI must be traceable; the global interceptor only audits writes).
- [ ] **Step 4:** implement; `GET .../responses` returns the stored `TelecareIntakeSnapshot.payload` and `sha256`, recomputing the hash on read and returning `integrity: 'ok' | 'mismatch'` (mismatch also raises an `AlertsService` alert with ids only).
- [ ] **Step 5:** `npx jest src/intake && npx tsc --noEmit` → PASS. Commit `feat(intake): deterministic pre-visit summary and clinician read API`.

### Task B7: Portal intake wizard (mobile-first, Save & Resume)

**Files:**
- Create: `health-hub-africa/lib/intake/useIntakeDraft.ts` + `useIntakeDraft.spec.ts`
- Create: `health-hub-africa/components/intake/{IntakeWizard,SectionNav,QuestionRenderer,RepeatableGroup,SafetyBanner,DocumentPicker}.tsx`
- Create: `health-hub-africa/app/(protected)/telecare/intake/[intakeId]/page.tsx`
- Modify: `health-hub-africa/lib/api.ts` (`intake` namespace)
- Test: `health-hub-africa/tests/e2e/telecare-intake.spec.ts`

**Interfaces:**
- Consumes: B3/B4/B5 routes; `visibleKeys` mirror (A5).
- Produces: `useIntakeDraft(intakeId): { answers; visibleKeys: Set<string>; revision: number; saveState: 'idle' | 'saving' | 'saved' | 'conflict' | 'error'; setAnswer(key, value): void; reload(): Promise<void>; submit(input): Promise<SubmitResult> }`.

- [ ] **Step 1: Failing hook tests (Vitest, fake timers, mocked `intake` API)**: (a) edits within 800 ms are batched into **one** PATCH with `baseRevision`; (b) the revision from each response is used for the next save (no stale revision); (c) a 409 `REVISION_CONFLICT` sets `saveState: 'conflict'`, **stops** auto-saving, keeps the user's unsaved answers in memory, and exposes `reload()` which refetches and rebases; (d) flipping a trigger removes dependents from local `answers` immediately (uses the mirror engine, so the UI never shows stale dependents); (e) **Review Focus #2:** `submit` called twice quickly sends one request with a stable `idempotencyKey` generated once per submit attempt and reused on retry after a network error; (f) the hook never touches `localStorage`/`sessionStorage`/IndexedDB (spy and assert untouched; PHI must not be stored in the browser, ARCH §20).
- [ ] **Step 2: Implement** the hook (debounce, in-flight queue, revision tracking), then `QuestionRenderer` (renders by `QuestionDef.type`; label bound with `htmlFor`; errors with `aria-describedby`; `triState` as a radio group including "I'm not sure" and "Prefer not to answer"), `RepeatableGroup` (add/remove items, focus moves to the new item), `SectionNav` (progress = sections whose **required visible** questions validate; never "complete because opened"), `DocumentPicker` (lists the patient's vault documents via the existing `records.list`, attach/revoke via B5 with plain-language copy: "Your provider can see this for this consultation only"), `SafetyBanner` (renders the definition's copy for `messageId`; shows at the top of every step once triggered; never disables Next/Submit; always shows the emergency call-to-action).
- [ ] **Step 3: Page flow.** New patient: all profile sections (A7 editors) then intake sections. Returning patient: a "Has anything changed since <date>?" step per profile section, defaulting to the A7 freshness chip; sections marked unchanged call `reviewSection` and are skipped. Visit-specific sections always start empty (ARCH §20: do **not** copy prior HPI/ROS/goals). Final step: summary of what will be shared, the four acknowledgements (consent text fetched from the definition), name acknowledgement pre-filled and editable only to correct case/spacing, Submit.
- [ ] **Step 4: Verify.** `npx vitest run lib/intake && npx tsc --noEmit && npm run build`. Playwright: (a) new-patient happy path at 375 px; (b) reload mid-way and resume at the same section with saved answers; (c) flipping smoking "never" hides and clears dependents; (d) the urgent-symptom path shows the banner, the submit button stays enabled, and submission succeeds; (e) two browser contexts on one draft show the conflict message and no lost data; (f) keyboard-only completion; (g) axe scan has no serious violations.
- [ ] **Step 5: Commit** `feat(portal): mobile-first TeleCare intake wizard`.

### Task B8: Clinician intake UI (admin app, provider/telecare)

**Files:**
- Create: `health-hub-africa-admin/app/(dashboard)/provider/telecare/components/{IntakeSummaryPanel,IntakeResponsesDrawer}.tsx`
- Modify: `health-hub-africa-admin/app/(dashboard)/provider/telecare/page.tsx`
- Modify: `health-hub-africa-admin/lib/api.ts` (`intakeReview` namespace)

- [ ] **Step 1:** Add API client functions for `summary`, `responses`, `by-appointment`, typed from B6's `PreVisitSummary`.
- [ ] **Step 2:** `IntakeSummaryPanel` renders the REQ §19 sections in order, each medication/allergy/condition showing a `Patient-reported` / `Under review` / `Verified` badge, safety flags in a distinct banner worded "Patient-reported: …", "Items requiring verification" at the top of the panel, and a "Documents shared by patient" list that labels **intake-shared** vs. **otherwise visible** (F4). Show a clear empty state when no intake exists ("Patient has not started the intake; you can complete it with them during the visit").
- [ ] **Step 3:** `IntakeResponsesDrawer` shows the full original submission read-only, the `sha256`, the `integrity` result from B6, and the questionnaire version.
- [ ] **Step 4:** Wire into the existing session card in `page.tsx`, shown only when the flag endpoint (`/admin/features`) reports `telecare_intake_enabled` and the API returns a non-404.
- [ ] **Step 5: Verify (no admin unit-test runner, F10).** `cd health-hub-africa-admin && npx tsc --noEmit && npm run build`, then run the manual QA script in §8 (clinician section) against DEV and attach screenshots to the PR.
- [ ] **Step 6: Commit** `feat(admin): clinician pre-visit summary and original responses`.

### Task B9: TeleCare and appointment integration (non-blocking)

**Files:**
- Modify: `health-hub-africa/components/screens/TeleCareScreen.tsx`, `AppointmentsScreen.tsx`
- Modify: `health-hub-africa-api/src/appointments/appointments.service.ts` (response includes `intakeStatus`)
- Modify: `health-hub-africa-api/src/notifications/*` (one reminder template; reuse the existing notification pipeline, no new channel)

- [ ] **Step 1: Failing API test:** `appointments.service` list/get returns `intakeStatus: 'none' | 'draft' | 'submitted' | 'under_review' | 'reconciled'` for TeleCare appointments (`isTelecare === true`) only, derived from the live intake, with no answer content.
- [ ] **Step 2:** Portal: a status card on the TeleCare screen ("Intake not started / in progress 60% / submitted"), a primary "Complete intake" action, and the **Join call button never gated by intake status** (assert in the Playwright test that an appointment with `intakeStatus: 'none'` still shows an enabled join action, per REQ §15).
- [ ] **Step 3:** Reminder: when an appointment is confirmed, enqueue one notification "Complete your health intake before your visit" using the existing notifications service and template conventions (read `notifications.service.ts` for the current pattern; no PHI in the message).
- [ ] **Step 4:** Clinician/scheduling visibility (REQ §15): include `intakeStatus` in the admin appointments list payload and render a small chip in `operations/appointments` and `provider/appointments`.
- [ ] **Step 5: Verify and commit:** `npx jest src/appointments` + portal `npx vitest run && npx playwright test tests/e2e/telecare-intake.spec.ts`; commit `feat(telecare): intake status on appointments, never blocking the call`.

**Release 1B exit:** new and returning patients can submit an intake tied to a TeleCare appointment; clinicians see the summary and the complete original responses; the flag remains off in PROD until C and §8 are done.

---

## 7. Release 1C: Reconciliation and OpenEMR (3–5 weeks; starts after P0-1 sign-off)

### Task C1: Clinical reconciliation (accept / amend / reject / defer)

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma`; create migration `20261010100000_clinical_reconciliation`
- Create: `health-hub-africa-api/src/intake/reconciliation/reconciliation.service.ts` + `.spec.ts`
- Routes in `intake-review.controller.ts`: `POST /intake-review/:id/reconciliations`, `POST /intake-review/:id/complete`

**Interfaces:**
- Schema: `ClinicalReconciliation { id, intakeId, itemKind, itemId, action ('accept'|'amend'|'reject'|'defer'), amendedSnapshot Json?, reason String?, clinicianUserId, decidedAt }` (append-only; **add the same immutability trigger as B1**). Intake transitions `submitted → under_review → reconciled`.
- Produces: `ReconciliationService.apply(intakeId, actions: { itemKind: ProfileKind; itemId: string; action: 'accept'|'amend'|'reject'|'defer'; amended?: Record<string, unknown>; reason?: string }[], clinician: JwtPayload): Promise<{ applied: number; syncJobsQueued: number }>` and `complete(intakeId, clinician)`.

- [ ] **Step 1: Failing tests**
  1. `accept` sets `verificationStatus: 'verified'`, `verifiedByUserId`, `verifiedAt`, increments `version`, writes a `HealthItemRevision`, and enqueues exactly one sync job.
  2. `amend` stores the clinician's edit with `verificationStatus: 'amended'` and keeps the **patient's original** in the revision snapshot.
  3. `reject` sets `rejected` and removes the item from the projected summary arrays; never hard-deletes.
  4. `defer` records the decision and changes nothing else; no sync.
  5. Only items whose `sourceReferenceId === intakeId` (or that appear in the intake's `profileSnapshot`) can be reconciled through that intake; another patient's item id → `NotFoundException`.
  6. Roles: provider (with access per B6), admin; patient → 403.
  7. **No silent overwrite:** reconciling an item whose current `version` differs from the version the clinician viewed (`expectedVersion` in the action) → `ConflictException` and nothing applied.
  8. `complete` fails while any action is still undecided **unless** it is explicitly `defer`; sets `reconciled`; running it twice is a no-op.
  9. Every action writes an audit row with ids and the action only.
- [ ] **Step 2:** Implement in one `$transaction` per call; enqueue sync jobs **after** commit (outbox rows in `OpenemrSyncQueue` with `jobType: 'intake-sync'`, so a crash between commit and enqueue is recoverable by the retry sweep in C3).
- [ ] **Step 3:** `npx jest src/intake/reconciliation && npx tsc --noEmit`; commit `feat(intake): clinician reconciliation with no silent overwrite`.

### Task C2: OpenEMR mappers and `intake-sync` processor

**Files:**
- Modify: `health-hub-africa-api/src/openemr/openemr.service.ts` (add a public wrapper)
- Create: `health-hub-africa-api/src/openemr/intake-sync.processor.ts` + `.spec.ts`
- Create: `health-hub-africa-api/src/openemr/intake-mappers/{index,condition,allergy,medication,procedure,family-history,social-history,vitals}.ts` + specs
- Modify: `health-hub-africa-api/src/openemr/openemr.module.ts` (provide the new processor on the **same** queue)

**Interfaces:**
- Produces:

```ts
// openemr.service.ts — new, public, thin
async fhirRequest(token: string, method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', path: string, body?: Record<string, unknown>, patientId?: string): Promise<any> {
  return this.callOpenemr(token, method, path, body, patientId);
}
// intake-mappers/index.ts
export interface IntakeMapper<T> {
  kind: ProfileKind;
  resource: string;                                  // FHIR resource type
  supported(matrix: CapabilityMatrix): 'fhir' | 'fallback' | 'none';
  toFhir(item: T, ctx: { patientUuid: string }): Record<string, unknown>;
  fallbackDocument?(item: T): { title: string; body: string };   // approved fallback from P0-1
}
export type CapabilityMatrix = Record<string, { create: boolean; update: boolean }>;
```

- [ ] **Step 1 (spike, first): confirm two `@Processor` classes can share the `openemr-sync` queue (F6).** Write a throwaway Jest e2e that registers a second `@Processor(OPENEMR_SYNC_QUEUE)` class with a uniquely named `@Process({ name: 'intake-sync' })` and asserts both processors receive their own job names (use the existing Bull test setup/Redis in CI). If Bull rejects it, fall back to handling `'intake-sync'` inside a small dispatcher method called from the existing processor and keep all logic in `intake-sync.processor.ts` as a plain injectable. Record the outcome in the PR.
- [ ] **Step 2: Failing mapper tests** driven by P0-1: for each resource marked supported, `toFhir(allergy)` preserves **reaction and severity and clinical status** (ARCH §22, §27) and sets patient-reported provenance; `toFhir(medication)` produces a `MedicationStatement` (**never** `MedicationRequest`; assert the resource type); `toFhir(condition)` carries onset (partial date preserved as FHIR partial date); mappers for resources the matrix marks unsupported return `supported() === 'fallback'` and a `fallbackDocument`, never throw.
- [ ] **Step 3: Failing processor tests (Review Focus #4):**
  1. First run for an item with no `openemrResourceId` → `POST`, then persists `openemrResourceType` and `openemrResourceId` on the item and marks the queue row completed.
  2. Retry after a timeout **after** the OpenEMR create succeeded but before persistence (simulate: the item has no id, but a search by `identifier`/`_id` returns an existing resource) → **no second create**; the processor adopts the found id (idempotency key = the MyVault+ item id carried as a FHIR `identifier` with system `https://myvaultplus.com/health-items`).
  3. Item already has an id → `PUT`, and before `PUT` the processor `GET`s the resource and compares `meta.versionId`/`lastUpdated` with the stored `openemrVersionMarker`; a mismatch means a clinician edited it in OpenEMR → **do not write**, mark the item `sync_conflict`, create an `IntegrationError` row, and surface it (C3). Nothing is overwritten.
  4. OpenEMR 5xx/timeout → throws so Bull retries (existing `maxAttempts`), the MyVault+ item and intake are untouched, and the queue row records the error without PHI (store ids and the HTTP status only).
  5. `supported() === 'none'` → no call, queue row `skipped` with reason.
  6. The processor never reads or sends `draftAnswers`, and never syncs an item whose `verificationStatus` is not `verified`/`amended` (assert by feeding a `patient_reported` item → throws a programming-error and does nothing).
- [ ] **Step 4: Implement** `intake-sync.processor.ts` (`@Process({ name: 'intake-sync' })`, token via `openemrService.getAccessToken()`, calls via the new `fhirRequest`), the mapper registry (`getMapper(kind)`), and load the capability matrix from a typed constant generated from `docs/openemr/INTAKE-CAPABILITY-MATRIX.md` (kept in `intake-mappers/capabilities.ts` and updated when the matrix changes).
- [ ] **Step 5:** `npx jest src/openemr && npx tsc --noEmit` (existing `openemr.processor.spec.ts` and `openemr.service.spec.ts` must pass unmodified). Commit `feat(openemr): intake sync processor with idempotent, conflict-aware mappers`.

### Task C3: Sync status, retry, and operational visibility

**Files:**
- Modify: `intake-review.controller.ts` (`GET /intake-review/:id/sync-status`, `POST /intake-review/:id/sync/retry`)
- Create: `health-hub-africa-admin/app/(dashboard)/provider/telecare/components/{ReconciliationTable,SyncStatusBadge}.tsx`
- Modify: `health-hub-africa-admin/lib/api.ts`

- [ ] **Step 1: Failing API tests:** `sync-status` returns per-item `pending | synced | conflict | failed | skipped` from `OpenemrSyncQueue` + the item's `openemrResourceId`, with error text redacted to a code; `retry` re-enqueues only `failed` items for the caller's intake and is idempotent (second call enqueues nothing new); a `sync_conflict` item can only be resolved by a clinician choosing "keep OpenEMR" (item marked verified against the OpenEMR version) or "overwrite OpenEMR" (explicit confirmation recorded in audit), never automatically.
- [ ] **Step 2:** `ReconciliationTable` renders each item with Accept / Amend / Reject / Defer, shows the sync badge, and requires an explicit confirmation to complete review while deferred items exist. Verify via `tsc`, `build`, and the manual QA script.
- [ ] **Step 3:** Reuse `AlertsService` for a single "intake sync failures" detector (count of `failed` intake-sync rows in the last hour ≥ threshold) with no PHI, following the pattern of `checkAnalyticsPipelineHealth` (`alerts.service.ts`, added in PR #195) and add its spec case to `alerts.service.spec.ts`.
- [ ] **Step 4: Commit** `feat(intake): sync status, retry and conflict handling`.

**Release 1C exit:** only clinician-approved items reach approved OpenEMR destinations; retries do not duplicate; conflicts surface; MyVault+ data is intact when OpenEMR is down.

---

## 8. Rollout, QA, and regression

**Order:** A1 → (A2, A3) → A4 → A5 → A6 → A7 ∥ B1 → B2 → B3 → B4 → B5 → B6 → (B7 ∥ B8) → B9 → C1 → C2 → C3. P0-1/P0-2 run alongside A; **C2 is blocked on P0-1**.

**Environments:** feature branches → PR to `development` (staging auto-deploys; migrations apply when the new ECS task boots; watch the task's startup logs, not the GitHub Actions log) → QA on staging with `telecare_intake_enabled = true` → promotion PR `development → master` per `git-workflow.md` with the destructive-migration check (all migrations here are additive; the immutability triggers are the only behavior that blocks future deletes) → PROD with the flag **off**, then enabled for an internal cohort, then everyone.

**Pre-PROD gates (all must be true):** signed capability matrix and mapping (P0); approved consent copy; approved urgent-response rules and copy so `assertSafetyRulesApproved` passes (D8); privacy review and retention decision (D7); `provider` role and `patient` role authorization tests green; audit-log spot check shows **no answer values** in `audit_logs.metadata` after a full QA run (`SELECT metadata FROM audit_logs WHERE resource_type IN ('telecare-intakes','health-profile','intake-review') ORDER BY occurred_at DESC LIMIT 50;`); backfill (A4) rehearsed on a PROD snapshot restore.

**Regression checklist (REQ §22):** profile edit and photo upload; emergency contacts; vitals entry and charts; TeleCare booking, session start, guest invite, post-call rating; records list, download, share links (`RecordShare` public/email modes); consents screen; OpenEMR patient sync, encounter sync, lab/medication/allergy/document pulls (existing `openemr.*.spec.ts` stay green); analytics `records_view`/`page_view` events unchanged; notifications.

**Manual clinician QA script (admin app has no test runner, F10):** (1) provider with an assigned patient and a submitted intake sees the summary, badges, and shared documents; (2) provider **not** on the appointment gets 403/empty; (3) revoke a shared document in the portal, confirm the provider can no longer open it; (4) accept/amend/reject/defer one of each kind, then complete review; (5) stop OpenEMR in DEV, confirm sync shows `failed`, the intake is intact, retry succeeds after restart and creates no duplicate; (6) edit the same allergy in OpenEMR then reconcile in MyVault+, confirm `conflict` and no overwrite. Attach screenshots to the PR.

**Test commands per workspace:** API `npx jest && npx tsc --noEmit && npm run build`; portal `npx vitest run && npx tsc --noEmit && npm run build && npx playwright test`; admin `npx tsc --noEmit && npm run build`; plus `node scripts/check-intake-fixtures.mjs`. Target ≥ 80% line coverage on `questionnaire/`, `health-profile/`, `intake/` (`npx jest --coverage --collectCoverageFrom='src/{questionnaire,health-profile,intake}/**/*.ts'`).

## 9. Release 1D (outside this plan's task list)

Native Expo parity under `mobile/app/` (`consents.tsx`, `edit-profile.tsx`, and `appointments.tsx` are the nearest existing screens). Per `docs/MOBILE-APP-IMPLEMENTATION-PLAN.md`, it reuses the same API and the **definition served by the API**; the evaluator must be mirrored a third time and pinned by the same fixtures (extend `check-intake-fixtures.mjs`). Not scheduled until D5 is confirmed.

## 10. Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OpenEMR lacks create/update for key resources | High | P0-1 verdicts, fallback documents, mapper `supported()` gate; Release 1C scope follows the matrix |
| Legacy-array writers diverge from the new tables | Medium | A4 inventory step; `reproject` called by every legacy writer; backfill test |
| PHI leaks via audit/alerts/logs | Medium | A1 first; key-only audit; alert and error bodies tested for absence of answer strings |
| Clinical copy (safety, consent) not ready by PROD | Medium | Code-level gate (D8, B4 case 9); flag stays off |
| Evaluator drift between API and portal | Low | Shared fixtures + CI diff script |
| Immutability triggers block a legitimate future purge | Low | Documented in B1; purge requires a reviewed migration that drops the trigger deliberately |
| `ClinicalRecord.providerVisibility` default over-exposes uploads (F4) | Existing | Not changed here; D9 decision; clinician UI labels the difference |

## 11. Self-review

**Spec coverage (REQ section → task):** §1 principles → A5/A6/B3/B4; §2 demographics → A2 (columns), A5 (definition), A6/A7 (edit), existing `patients.service` for identity-controlled fields; §3 HPI → B2/B3/B7; §4–9 history/meds/allergies/family/social → A2/A3/A5/A6/A7; §10 ROS → B2/B6/B7; §11 investigations + sharing → B2/B5/B7; §12 vitals → B4 (`normalizeVitals`), B6; §13 goals → B2; §14 acknowledgements → B2/B4 (consent evidence); §15 workflow (new vs returning, status, Save & Resume, non-blocking) → B3/B7/B9; §16 conditional logic → A5 fixtures + B2 test (all six rows); §17 document sharing → B5 (note F3: `RecordShare` deliberately not reused); §18 OpenEMR mapping → P0-1/P0-2/C2; §19 pre-visit summary → B6/B8; §20 audit/safety/integrity → A1, B1 (triggers), B4 (hash, safety), C1; §21 Phase 1 deliverables → P0-1/P0-2 and this document; §22 acceptance criteria → §8 gates and per-task tests.

**Placeholder scan:** The only intentionally unfilled content is clinical/legal copy (consent statements, urgent-response messages, plausibility limits, freshness window), which this plan marks `[PENDING APPROVED COPY]`/`approvedAt: null` and gates in code (D8, B2, B4). Tier-2 table fields in A3 and the ARCH key transcription in A5/B2 point at ARCH §6–18 as the authoritative dictionary and are enforced by the `expected-keys.json` test rather than restated here.

**Type consistency:** `ProfileKind` (A6) is reused in C1/C2; `Answers`/`QuestionDef`/`ValidationIssue` (A5) in A6/B2–B4/B7; `SafetyRule`/`SafetyHit` (B2) in B4/B6; `IntakeView`/`saveAnswers` (B3) match the hook in B7; `PreVisitSummary` (B6) is what B8 renders; delegate names (`patientCondition`, `patientMedication`, `patientAllergy`, …) match A2/A3.

**Known limits of this document:** UI tasks (A7, B7–B9, C3) specify behavior, files, and verification rather than full component source; the logic they depend on (engine, validation, hook contracts, services) is fully specified and tested. Release 1D is outlined, not planned task-by-task.
