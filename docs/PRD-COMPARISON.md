# MyHealth Vault+™ — PRD v2.0 vs. What's Actually Built

**PRD reference:** *MyHealth Vault+™ PRD v2.0*, Health-Hub Africa®, May 2026
**Compared against:** codebase state as of 2026-07-07
**Companion document:** [`BUILT-FEATURES.md`](./BUILT-FEATURES.md) — full inventory this comparison draws from

**Legend:** ✅ Built as specified · ⚠️ Built but diverges from spec · ❌ Not built · ➕ Built beyond spec (not in PRD)

---

## Headline Finding

The build did not follow the PRD's phased plan in a straight line. Some things scheduled for Phase 3–4 (STRIDE™, HPACS™, EFCE™, LiveKit video consultation) are live now. Some Phase 1 items the PRD treats as foundational (Expert Review™'s full case-status lifecycle, the specific patient-ID/case-ID formats) are implemented differently than specified. One entire service — TravelSafe™ — exists in production with no mention anywhere in this PRD.

Net effect: the product is broader than the PRD but not a superset of it — several precisely-specified details (ID formats, status counts, review types) drifted during implementation and would fail a literal acceptance-criteria check even though the surrounding feature works.

---

## 1. Scope vs. PRD's "Out of Scope — Version 1.0" (§3.3)

The PRD explicitly deferred these to later phases. All have already shipped:

| PRD says (§3.3) | Deferred to | Actual state |
|---|---|---|
| Live video consultation initiation | Phase 2 | ➕ **Built.** LiveKit-powered TeleCare™ sessions, token issuance, webhook handling, provider call UI. |
| AI decision support — STRIDE™, HPACS™, EFCE™ | Phase 3 | ➕ **Built.** All three exist as admin/coordinator-only endpoints (`/stride/overview`, `/hpacs`, `/efce`) and a portal nav item. |
| Corporate/HMO portal (employer-facing) | Phase 4 | ⚠️ **Partially.** Corporate tiers are priced and listed on the marketing site, but no employer-facing dashboard exists — this part is still not built. |
| International specialist integrations | Phase 3+ | ❌ Not built. |
| Health risk scoring / predictive analytics | Future | ❌ Not built. |
| Native mobile (iOS/Android) | Phase 4 | ❌ Not built. |

**Read on this:** the team prioritized visible clinical/ops capability (video, AI-branded ops tooling) over the phased roadmap. Worth a conversation about whether STRIDE™/HPACS™/EFCE™ shipping now was intentional or scope creep — the PRD gates them behind "Phase 3" for a reason (they're described as a future intelligence layer, not a Phase 1 dependency).

---

## 2. Net-New: Not in the PRD At All

- **TravelSafe™** — a full service (trip CRUD, health-summary generation, marketing page, portal screen, feature flag) with zero mention in this PRD. Either the PRD is stale relative to product direction, or this was added out-of-process. Worth reconciling which document is authoritative going forward.
- **My Vault / Documents module** — a document library (20 category types, replace-in-place, visibility control) distinct from "My Records." The PRD's §8.6 describes one records timeline; the build has two related-but-separate surfaces (Records vs. Documents/Vault). Functionally richer, but not what was specified.
- **Secure record sharing (Shares module)** — patient-generated, expiring, OTP/password-gated share links with a full access audit trail. This maps to Phase 3's "Record sharing — time-limited secure share links" (§13, Phase 3 task list) — so it's *ahead of schedule* rather than out of scope, but still worth flagging since Phase 3 hasn't formally started per the PRD's dated plan (02/07–23/07... which, notably, is *now*).
- **2FA (email/SMS OTP toggle)** — not mentioned anywhere in the PRD's auth requirements (§8.1). Reasonable security addition, but a spec gap.
- **CMS (blog + testimonials)** — powers the marketing site; not mentioned in the PRD at all (the PRD is scoped to the patient portal, so this is likely just out of the PRD's frame rather than a genuine gap).

---

## 3. Section-by-Section Comparison

### 3.1 Authentication & Registration (§8.1, AUTH-01 through AUTH-12)

| Requirement | Status | Notes |
|---|---|---|
| AUTH-01: Registration fields (name, DOB, gender, phone, email, address, emergency contact, consent checkbox) | ✅ | `Patient` + `EmergencyContact` + `PatientMedicalInfo` created transactionally. |
| AUTH-02: Inline validation | ⚠️ Not verified | Backend validates via DTOs; frontend inline-validation UX wasn't part of this audit's scope. |
| AUTH-03: Patient ID format `HHA-[3-letter]-[YYMM]-[seq]` e.g. `HHA-CAN-2605-0004` | ❌ **Diverges.** | Actual code (`patients.service.ts:93`) builds the date segment as `getFullYear() + month` → **6 digits** (`202605`), not the PRD's 4-digit `YYMM` (`2605`). Real IDs look like `HHA-CAN-202605-0004`, not `HHA-CAN-2605-0004`. A code comment in the file even quotes the PRD's exact example, but the implementation doesn't produce it. |
| AUTH-04: OpenEMR creation direct vs. admin queue | ➕ **Ahead of schedule.** | PRD frames direct OpenEMR API creation as an MVP2/Phase 2 item, with MVP1 using an admin queue. The build already does direct sync-on-create (queued to `OpenemrSyncQueue`, not a manual admin approval queue). |
| AUTH-05: Confirmation email + SMS on registration | ⚠️ Partial | Email OTP confirmed present; SMS OTP request exists as a separate endpoint, but it's not clear registration *automatically* fires both channels vs. OTP being requested on demand. |
| AUTH-06: New accounts default to Free tier | ✅ | Registration forces `role=patient`; subscription defaults align. |
| AUTH-07/08: Email+password login, phone+OTP login | ✅ | Both present (`POST /auth/login`, `POST /auth/request-sms-otp` + verify). |
| AUTH-09: Forgot password via email link | ⚠️ Diverges | Built as OTP-code reset, not a clickable reset **link**. Functionally equivalent, UX differs from spec. |
| AUTH-10: Short-lived JWT, auto-expiry | ✅ | 15-min access token, 7-day rotated refresh token — matches §6 and §11 exactly. |
| AUTH-11: WhatsApp support link on login screen | ⚠️ Not verified in portal auth screen; WhatsApp is modeled as a notification channel but no delivery processor was found, and this is a frontend UI check outside this audit's reach. |
| AUTH-12: RBAC enforced server-side on every request | ✅ | Global `RolesGuard` + `JwtAuthGuard`, matches §5.2 and §11 non-negotiables exactly. |

### 3.2 Dashboard (§8.2)

Built: a `/dashboard` route exists in the portal. The PRD's specific widget list (plan badge, upcoming-appointment card, **Active Clinical Reviews card**, last-5 activity feed, unread-notification badge, new-patient empty state) was not independently verified against the actual rendered screen in this pass — flagging as **needs a direct UI check**, not claiming pass or fail.

One structural note: `PatientActivityEvent` exists in the schema specifically for activity-feed tracking (`POST /analytics/events`), which suggests DASH-06 (recent activity feed) has real backing data — just unconfirmed on the frontend.

### 3.3 Profile & Health Data (§8.3)

| Requirement | Status |
|---|---|
| PROF-01/02/03: personal info, medical info, emergency contact | ✅ `Patient`, `PatientMedicalInfo`, `EmergencyContact` all present and match the field list (allergies, medications, chronic conditions, blood group). |
| "Primary doctor" field (§8.3, PROF-02) | ⚠️ Not found as an explicit field in the surveyed schema — patients are linked to providers via `PatientProviderAssignment`, which is a different (many-to-many/assignment) model than a single "primary doctor" attribute. Worth confirming intent. |
| PROF-05: Profile completeness indicator (P2) | ❌ Not found. |

### 3.4 Book a Service (§8.4, §8.4.1)

The PRD's service catalogue (§8.4.1) lists 15 distinct bookable items, including 7 separate Expert Review™ sub-types, plus **Follow-Up Call**, **Event Coverage**, and **MyHealth Vault+™ Onboarding** as their own bookable "services."

| PRD catalogue item | Built as |
|---|---|
| TeleCare™, MinuteCare™, CareTest™, HealthConsult™, NeuroFlex™, DispatchCare™ | ✅ All present as `ServiceType` enum values with full appointment booking flow. |
| Expert Review™ (7 sub-types: Second Opinion, Multi-Specialist, Specialist Referral, Treatment Plan, Lab/Imaging, Medication, Post-Discharge) | ⚠️ **Diverges.** Built `ExpertReviewType` enum has only **5** values: `second_opinion`, `multi_specialist`, `surgical_review`, `imaging_review`, `pathology_review`. Three of the PRD's seven types (Specialist Referral, Treatment Plan, Post-Discharge, Medication) don't map cleanly onto the built enum — `surgical_review` and `pathology_review` aren't in the PRD's list at all. This looks like independent product evolution rather than a straightforward implementation of §8.4.1/§8.7.2. |
| Follow-Up Call, Event Coverage | ❌ No matching `ServiceType` or booking flow found. |
| MyHealth Vault+™ Onboarding (as a "service") | ❌ Not modeled as a bookable service; onboarding is a portal flow, not an appointment type. |
| BOOK-01 through BOOK-09 (calendar picker, real slot availability, confirmation screen, payment gate, email+SMS confirmation, 24h reminder) | ✅ All present — `GET /appointments/slots` genuinely cross-references shift templates against bookings; 24h + 1h reminders are both queued (PRD only asked for 24h). |

### 3.5 DispatchCare™ (§8.5, DISP-01 through DISP-14)

| Requirement | Status |
|---|---|
| DISP-01: 1-tap emergency button from any screen | ✅ Portal sidebar has a persistent floating emergency button when `dispatch_enabled`. |
| DISP-04: Emergency type selection (6 types) | ✅ `EmergencyType` enum has 6 values, matching count (exact label match not independently verified). |
| DISP-07: Case ID format `DC-YYYY-000001` | ❌ **Diverges.** Built format is `DSP-YYYY-0001` (different prefix, 4-digit sequence instead of 6-digit) — confirmed via code comment in `dispatch.service.ts:12`. |
| DISP-02/03: Geolocation auto-detect + manual fallback | ⚠️ Not verified — this is a frontend/browser-API concern outside the backend audit's reach. |
| DISP-08/10: Call HHA Emergency Line + WhatsApp support buttons on request/post-submission screens | ⚠️ Not verified against the actual rendered dispatch screen. |
| DISP-11: Safety disclaimer copy | ⚠️ Not verified — this is copy/UI, not a backend concern. |
| DISP-12: Incident history view | ✅ `GET /dispatch` lists a patient's own requests. |
| DISP-13: Free tier pay-per-use vs. Gold priority routing | ⚠️ No explicit "priority routing" logic surfaced in the dispatch service beyond standard CRUD — tier-based prioritization isn't obviously implemented at the dispatch layer. |
| DISP-14: Immediate SMS + WhatsApp confirmation | ⚠️ SMS is wired; WhatsApp channel is modeled in the schema but no delivery processor was found in the notifications module. |

### 3.6 My Records (§8.6)

| Requirement | Status |
|---|---|
| REC-02: Filter tabs (All / Visits / Labs / Prescriptions / Documents) | ⚠️ The built `DocumentCategory` enum has **20 values** — far more granular than the PRD's 4-category filter. Functionally superior, but not literally what was specified, and worth checking the frontend actually surfaces a simple 4-tab filter or exposes all 20 categories (a UX regression if so). |
| REC-06: Download as PDF | ⚠️ Presigned S3 downloads exist for original files; no explicit PDF-generation step was found for record types that aren't already PDFs (e.g., structured lab results). |
| REC-07: Patient-uploaded external records (P2) | ✅ Documents module supports this generally. |
| REC-08: Expert Review™ final report downloadable from Records screen | ⚠️ `ExpertReviewFinalReport` exists as its own model, separate from `ClinicalRecord`/Documents — not confirmed that it surfaces inside the unified Records timeline as the PRD specifies, vs. living only inside the Expert Review case view. |

### 3.7 Health-Hub Expert Review™ (§8.7) — the PRD's most detailed section

This is where the PRD invests the most specificity (its own sub-sections 8.7.1–8.7.7, plus 16 of the 47 developer acceptance criteria in §15). It's also where the build diverges most.

| PRD element | Built state |
|---|---|
| Case status lifecycle — **11 named statuses** (New Request → Awaiting Documents → Awaiting Payment → Under Clinical Review → Specialist Assigned → Specialist Review in Progress → Additional Info Needed → Final Report Pending → Report Completed → Follow-Up Scheduled → Closed) | ❌ **Diverges significantly.** Built `ExpertReviewStatus` enum has **7** values: `submitted`, `under_review`, `specialist_assigned`, `in_consultation`, `report_ready`, `closed`, `cancelled`. Missing entirely: an "Awaiting Documents" state, an "Awaiting Payment" state, an "Additional Info Needed" state, and a "Follow-Up Scheduled" state. A `cancelled` state exists that the PRD doesn't define. |
| Case ID format `ER-YYYY-000001` | ✅ Confirmed matching — `expert-review.service.ts:22` builds the prefix as `ER-${year}-`. |
| Specialist category selection (14 named specialties: Cardiology, Neurology, Orthopedics, OB/Gyn, Pediatrics, Internal Medicine, General Surgery, Oncology, ENT, Ophthalmology, Psychiatry, Dermatology, Endocrinology, Nephrology, Emergency Medicine) | ❌ **Not found.** No specialty/category field was found anywhere in the expert-review module. Specialist assignment (`PATCH /expert-review/:id/assign-specialist`) appears to assign a specific `Provider`, not a category — meaning the PRD's "preferred specialist category" intake field and the coordinator's category-based routing aren't implemented. |
| Eligibility & payment check (§8.7.1 step 6, `GET /expert-review/{caseId}/eligibility` in §9.2) | ❌ No dedicated eligibility-check endpoint found. Payment is presumably handled through the general Payments module, but the PRD specifies a dedicated eligibility gate as part of the Expert Review flow itself. |
| Consent screen (mandatory records-review consent + optional contact-doctor consent, §8.7.2) | ⚠️ A general `PatientConsent` model exists, but nothing found ties a specific consent record to an Expert Review case at intake time the way §8.7.1 step 4 specifies. |
| Required disclaimer on final report (§8.7.7 — exact wording specified) | ✅ **Matches well.** `POST /expert-review/:id/acknowledge-disclaimer` exists and gates report visibility, which is actually a stronger implementation than the PRD asks for (PRD just requires the disclaimer text appear on the report; build requires active acknowledgment before the report is even shown). |
| Follow-up booking after report (§8.7.1 step 10) | ⚠️ Not found as a dedicated "book follow-up from this case" flow — patient would have to book a regular appointment separately. |
| Review types (7 named types) | ❌ See §3.4 above — 5 built types don't cleanly map to the PRD's 7. |

**This section deserves the most attention in a PRD reconciliation conversation.** The PRD treats Expert Review™ as the flagship premium service with a fully specified 11-state workflow; the build has a materially simpler 7-state model missing "awaiting payment," "awaiting documents," and "needs more info" — all states that matter operationally for a coordinator queue.

### 3.8 Subscriptions & Billing (§8.8, §8.8.1)

| PRD tier name | Built tier (`PlanTier` enum) |
|---|---|
| Free | Free ✅ |
| Basic | BasicCare ⚠️ (renamed) |
| Mid-Level | SilverCare ⚠️ (renamed, and "Mid-Level" as a concept doesn't appear anywhere) |
| Gold | GoldCare ⚠️ (renamed) |
| Corporate | *(not a `PlanTier` value)* — Corporate/HMO is handled as marketing-site pricing tiers (SME/Mid-Market/Enterprise, priced per employee), not as a patient subscription tier in the data model. |
| *(not in PRD)* | ConciergeCare ➕ — a 5th tier the PRD never names, sitting above Gold. |

The underlying *capability* differences per tier (§8.8.1's matrix) roughly track what's on the marketing site's plan cards, but the **names themselves have drifted** from the PRD's literal Basic/Mid-Level/Gold/Corporate language to BasicCare™/SilverCare™/GoldCare™/ConciergeCare™. If the PRD is meant to be the naming source of truth, this is a full rename across the product; if the product's naming evolved intentionally, the PRD is stale and should be updated to match.

- SUB-04 (state updates only after webhook confirms payment) — ✅ matches; Paystack/Flutterwave webhooks are signature-verified and drive subscription state.
- SUB-07 (downloadable PDF invoices/receipts) — ⚠️ `Invoice` model exists; PDF generation wasn't confirmed in the audit.

### 3.9 Messages & Support (§8.9)

| Requirement | Status |
|---|---|
| MSG-01/02: In-portal messaging to HHA support, recent messages list | ⚠️ Built `Support` module has tickets + threaded messages, which covers the *ticket* half. A separate lightweight "Messages" inbox distinct from formal tickets (as the PRD's screen map implies — "Messages & Support" is one screen with both concepts) wasn't independently confirmed as a separate concept. |
| MSG-03/04: WhatsApp Support button, Call Support button | ⚠️ Not verified in the portal UI (frontend concern). |
| MSG-05: Support ticket creation (P2) | ✅ `POST /support/tickets`. |

### 3.10 API Contract (§9) vs. Actual Routes

The PRD specifies a literal endpoint map (§9.2). The actual API uses different naming conventions throughout. This is not a functional gap — it's a contract mismatch that matters if any external system or the PRD itself is treated as an API spec of record.

| PRD path | Actual path | 
|---|---|
| `POST /patients/register` | `POST /patients` |
| `GET /dashboard` | *(no single dashboard-aggregate endpoint found — portal composes it client-side from multiple calls)* |
| `POST /dispatchcare/request` | `POST /dispatch` |
| `GET /dispatchcare/{caseId}` | `GET /dispatch/:id` |
| `POST /expert-review/request` | `POST /expert-review` |
| `GET /plans` | `GET /subscriptions/plans` |
| `POST /subscriptions/upgrade` | `POST /subscriptions/upgrade` ✅ (matches) |
| `POST /payments/initialize` | `POST /payments` |
| `GET /appointments/availability` | `GET /appointments/slots` |

None of these are wrong, functionally — they're just a different naming convention than what's written into the PRD as the contract. Worth deciding whether the PRD's API section gets updated to reflect reality, since as written it doesn't describe the actual system.

---

## 4. Security & Compliance (§11)

| PRD control | Status |
|---|---|
| JWT short-lived (15 min) + refresh rotation | ✅ Exact match. |
| RBAC server-side on every request | ✅ Exact match — global guard, not page-load-only. |
| Rate limiting, stricter on auth | ✅ `UserThrottlerGuard` + per-route overrides (3–10/min on auth vs. 100/min default) — matches intent. |
| Audit logging of auth/record/payment/Expert Review actions | ✅ Global `AuditLogInterceptor` on every mutating request. |
| Expert Review documents via signed URLs, never public | ✅ All uploads (not just Expert Review) go through presigned S3 URLs. |
| Secure headers (Helmet, CSP, HSTS) | ⚠️ Not confirmed in this audit — would need a direct check of `main.ts`/middleware setup. |
| CORS whitelist | ⚠️ Not confirmed — same caveat. |
| Staging uses synthetic data only | — Organizational/process control, not verifiable from code. |

---

## 5. MVP Phasing (§12–13) — Where the Build Actually Sits

The PRD defines three MVP tranches. Mapping what's built onto them:

- **MVP1 (Auth, Dashboard, Profile, Booking→queue, DispatchCare with call backup, Expert Review full intake, Subscriptions with Paystack, Admin queues, manual OpenEMR creation):** essentially all present, **except** booking routes directly rather than sitting in an admin approval queue, and OpenEMR patient creation is already direct-API rather than manual — both of which are *MVP2* behaviors, already live.
- **MVP2 (Direct OpenEMR API creation, payment webhooks, live notification engine, live OpenEMR availability sync):** ✅ Already live — webhooks confirmed for Paystack/Flutterwave, OpenEMR sync is bidirectional and scheduled, slot availability is real-time.
- **MVP3 (DispatchCare real-time tracking/ETA, Corporate/HMO employer dashboard, AI triage/STRIDE™, international specialist network, analytics dashboards):** ⚠️ Partially live — STRIDE™/HPACS™/EFCE™ exist (ahead of the PRD's own Phase 3 dating), analytics dashboards exist (admin KPI/revenue/usage), but DispatchCare real-time ETA tracking and the Corporate/HMO employer-facing dashboard are **not** built.

**Conclusion:** the build isn't behind the PRD's phasing — if anything it's running two tracks in parallel, finishing some Phase 3 items early while a few Phase 1 acceptance criteria (Expert Review's status granularity, exact ID formats) haven't been reconciled to the letter of the spec.

---

## 6. Recommended Next Steps

1. **Decide the source of truth for ID formats.** Patient ID and DispatchCare case ID both diverge from the PRD's literal examples. Either fix the code to match, or update the PRD — but right now neither document is accurate for the other.
2. **Reconcile Expert Review™'s status lifecycle.** This is the PRD's most detailed workflow and the build's biggest structural gap (7 states vs. 11, no specialist-category selection, no dedicated eligibility-check step). Since this is described as the flagship premium service, it's worth a dedicated planning pass rather than a quiet drift.
3. **Clarify whether TravelSafe™ belongs in a PRD update.** It's a fully shipped service with no home in this document.
4. **Confirm subscription tier renaming was intentional** (Basic/Mid-Level/Gold/Corporate → BasicCare™/SilverCare™/GoldCare™/ConciergeCare™) and update whichever document is stale.
5. **Verify the frontend-only items this audit couldn't check:** dashboard widget completeness, empty/loading/error state coverage, WCAG 2.1 AA compliance, PWA installability, 3G performance — all called out as explicit non-functional requirements in §16 but outside the scope of a backend-led code audit.
