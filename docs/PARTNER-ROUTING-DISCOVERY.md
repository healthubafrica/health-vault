# Universal Registration & Partner Routing — Discovery Report

> Companion to [HHA_Universal_Patient_Registration_and_Dynamic_Partner_Routing_Implementation_Guide_new.md](./HHA_Universal_Patient_Registration_and_Dynamic_Partner_Routing_Implementation_Guide_new.md). Verified live against production (SSM into `hha-openemr-mariadb`), not assumed from the spec.
> **Bottom line: the entire routing engine is already built, correct, and production-grade — and has never been called.** This is the clearest instance of the pattern seen across every spec in this session: OpenEMR-side infrastructure built in a burst (2026-08-12, this time), zero portal-side integration.

## 1. What already exists (verified live)

### Tables — exactly matching the spec's own "Current Production Architecture to Preserve" table

| Table | Rows | Notes |
|---|---|---|
| `hha_partner_organization` | 3 | `CRQ` (facility 16), `DR_RAO_ENT` (facility 17), `HHA_INTERNAL` (default pool, no facility) |
| `hha_partner_provider` | 2 | CRQ→provider 22 (Dr. Liza Ekole), DR_RAO_ENT→provider 16 (Dr. Rao ENT) |
| `hha_partner_referral_code` | 4 | `CRQ-REFERRAL`, `CRQ-LIZA-REFERRAL` (provider-specific), `RAO-REFERRAL`, `RAO-DRRAO-REFERRAL` (provider-specific) — all **`uses_count = 0`** |
| `hha_patient_partner_assignment` | **54** | Real data, not test fixtures — see §2 |
| `hha_provider_patient_access` | 2 | Both from manual test setup |
| `hha_partner_referral_audit` | **0** | Empty |

### Routing engine — `hha_route_patient_referral` (stored procedure, created 2026-08-12)

Pulled the full definition. It is a **complete, correct, production-grade implementation** of the spec's §10–§11 routing logic:

- Deterministic priority order exactly matching spec §11 (validated provider-specific referral → validated partner-level referral → fail-safe `HHA_INTERNAL`) — implemented via a single `IF/ELSEIF` chain, no ambiguity
- Every failure mode fails closed to `HHA_INTERNAL`, never guesses: invalid code, inactive code, expired code, usage-limit-reached code all route safely, each with a distinct `event_type` (`referral_invalid`, `referral_inactive`, `referral_expired`, `referral_limit_reached`, `referral_used`, `routed_hha_default`)
- Supersedes rather than deletes: prior active assignment gets `active=0, ended_at, ended_by, end_reason='Superseded by HHA routing engine'` — full history preserved, matching spec §14's audit requirement
- Provider access grant logic matches spec §13's policy table: provider-specific referral → single provider access row (only if that provider is actively mapped to the partner, else the whole call fails with `SIGNAL SQLSTATE '45000'`); partner-level referral → grants access to *every* active provider mapped to that partner (the `all_partner_providers` policy)
- Increments `uses_count` only on genuine `referral_used`, never on a failed/invalid attempt
- Writes a full `hha_partner_referral_audit` row every time, success or failure
- Wrapped in `START TRANSACTION` / `COMMIT`, with an `EXIT HANDLER FOR SQLEXCEPTION` that rolls back and re-signals — safe to call, safe to retry

**This procedure needs no changes.** It's a stronger implementation than most of what the spec's own pseudocode describes.

### What's missing: everything that would ever call it

- **No REST wrapper.** Confirmed: `/opt/hha-openemr/custom/` has exactly one module directory (`oe-module-hha-ai-clinical-assistant`) — the same one all three routes shipped this session live in. `Bootstrap.php`'s full contents are already known from today's other work; nothing in it calls `hha_route_patient_referral`.
- **No portal-side referral capture.** `auth.service.ts`'s `register()` (the actual registration entry point) has no referral-code field, no `ref`/`referral_token` query-param handling.
- **`uses_count = 0` on all 4 codes** confirms zero real registrations have ever gone through referral attribution.

## 2. What the 54 assignment rows actually are

Not evidence of real usage — three distinct one-time events, all from 2026-08-12:

| Source | What it is |
|---|---|
| `test_assignment` (2 rows: pid 58 `CRQTEST`, pid 59 `RAOTEST`) | Manual UAT fixtures — the same two synthetic patients already identified in the HHA-ID reconciliation report as having no portal record |
| `existing_patient_migration` (remaining ~52 rows) | A one-time backfill assigning every pre-existing patient to `HHA_INTERNAL` — sets up the "every patient has *a* pool" invariant the routing procedure depends on, but isn't itself evidence of the routing procedure being called |
| `patient_portal_referral` | **Zero rows.** This is the source value the stored procedure itself writes on every real invocation — its total absence is the clearest possible confirmation that the procedure has never been called outside manual testing |

## 3. Scoped implementation plan

Three pieces, matching the spec's own architecture, each independently deployable:

### 3a. OpenEMR REST wrapper (small — same pattern as the other three routes this session)
`POST /api/hha/patients/:uuid/route` — resolve `pid` from the UUID (established pattern), require an authenticated system/service actor per spec §10.1, `CALL hha_route_patient_referral(pid, referral_code, assigned_by)`, return the procedure's own result set directly. Same scoped-security-listener shape (`/api/hha/patients/` prefix... actually needs its own prefix since `/api/hha/patient/` is already claimed by the HHA-ID-sync route singular — will use `/api/hha/patients/` plural or a dedicated `/api/hha/routing/` prefix to avoid any path-matching ambiguity between the two security listeners).

A companion **read-only validate endpoint** (`POST /api/hha/referrals/validate`, spec §23) that checks a code's validity *without* assigning — needed for the portal's "Referral recognized: CRQ" UI acknowledgement (spec §8, step 5) without committing a routing decision on every keystroke/page load.

### 3b. Portal side (the real net-new work)
- **Registration UI**: optional "Were you referred by a healthcare provider or partner?" question + code field (spec §7); accept an optional `?ref=` query param, validate it via 3a's validate endpoint on page load, show a neutral acknowledgement or neutral failure message per spec §8 steps 5–6. Never expose partner/provider/facility IDs to the browser (spec §7, §15).
- **Backend hook point**: the natural insertion point is exactly where `syncHhaId` was added this session — `openemr.processor.ts`'s `handleSyncPatient`, right after `openemrUuid` resolves. Add a `routePatient(openemrUuid, referralCode, actorId)` call there, best-effort/non-blocking, same shape as the other two syncs added today.
- **Persist the routing outcome** on the portal side for admin visibility (spec §22) — a small field or table recording `assigned_pool`/`routing_result` per patient, surfaced in the admin Patients view.

### 3c. Referral code administration (spec §17 — currently raw SQL only)
An HHA admin UI to create/activate/deactivate/expire referral codes, view `uses_count` and audit history, generate QR codes. Currently the only way to create a code is a manual `INSERT` (exactly how the 4 existing codes were made on 2026-08-12). Lowest priority of the three — the routing engine and portal integration deliver value without it; codes can keep being created manually for a while longer.

## 4. Correction to my earlier framing

I described this spec as carrying a "legal/consent review" flag in my last message — that's incorrect, and I want to correct it before it causes confusion. That requirement belongs to the **Family/Dependents & Proxy Access** feature in the mobile app plan (a different, unbuilt feature — guardian↔dependent relationships), not to this partner-referral-routing spec. Nothing in this spec or its stored procedure touches guardianship, minors, or consent — it's organizational attribution (which partner/provider a patient's care is routed through), and carries no legal-review flag of its own. Flagging the correction rather than letting it stand uncorrected.

## 5. Recommended sequencing

1. **3a first** (small, same proven pattern, no user-facing surface) — ship the REST wrapper + validate endpoint, staging then production, exactly like the three routes already shipped today.
2. **3b next** (the real work — touches the registration page, a genuinely user-facing surface, deserves its own careful pass rather than being rushed alongside 3a).
3. **3c last**, and arguably out of scope for this pass entirely — an admin CRUD UI is a different kind of work (new admin screens, not an integration fix) from everything else done this session.
