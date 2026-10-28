# TeleCare Intake & Health Profile: Phase 0 Decision Pack

**Audience:** product owner, clinical leads, privacy/legal, operations. No technical background needed.
**Responds to:** product owner feedback of 2026-10-18 (conditional approval for Phase 0).
**Status:** proposed answers for sign-off. Items marked **[Sign-off]** need a named approver before PROD. Everything is built and tested in DEV first; nothing changes in QA or PROD without explicit authorisation, and the existing OpenEMR/MyVault+ integration is not touched.
**Delivery window:** 3–4 weeks (see section 5).

Companion documents: [product overview](2026-10-05-telecare-intake-health-profile-product-overview.md), [engineering plan](2026-10-05-telecare-intake-health-profile.md), [field dictionary](../MYVAULT-TELECARE-INTAKE-HEALTH-PROFILE-ARCHITECTURE.md).

---

## 1. Architecture: one Health Profile for every HHA service

**Answer:** the Health Profile belongs to the *patient*, not to TeleCare. Each service (TeleCare, MinuteCare, DispatchCare, HealthConsult) adds only its own visit questions on top and reads the same profile.

```
                 Patient Health Profile (one per patient)
   conditions · allergies · medicines · history · access needs · vitals
        │ each item: source, verified or not, who/when, OpenEMR link
        │
  ┌─────┼──────────────┬───────────────┬───────────────┐
TeleCare  MinuteCare   DispatchCare   HealthConsult     (future)
visit     visit        emergency      visit
questions questions    snapshot       questions
  │
  └─▶ submitted & locked ─▶ clinician review ─▶ approved items ─▶ OpenEMR
```

What this changes in the plan (small now, expensive later):
- Every per-visit record carries a **service type** and a **visit reference**, instead of being hard-wired to a TeleCare appointment.
- Question sets are stored per service. TeleCare is the first; the others are added without changing the profile.
- A clinician's access to a patient's profile depends on their care relationship with the patient, not on which service they work in.
- DispatchCare can later read an emergency snapshot (allergies, medicines, conditions, emergency contact) from the same profile.

## 2. Clinical safety: questionnaire and escalation

### 2.1 What the patient must answer, and what can wait

Target: a new patient finishes the essential part in about 5 minutes on a phone; a returning patient in about 1 minute.

| Group | Questions | When |
|---|---|---|
| **Essential before the consultation** | Reason for visit and main concern · when it started and how it's going · key symptoms · allergies (or "none known") · current medicines (or "none") · existing conditions (yes/no) · what they want from the visit · consent acknowledgements | Asked before the call. Only reason, goal, allergy and medicine answers and consent are *required* to submit. |
| **Can be completed later** | Full symptom checklist by body system · family history · lifestyle · past surgeries and hospital stays · disability and access needs · recent tests · extra demographics | Optional, any time, from the profile screen |

An incomplete intake never stops a patient joining a consultation. Progress saves after each section, so a dropped connection loses at most the last few answers. On a weak connection the app shows "not saved yet" and retries automatically. We do not keep health answers in the phone's browser storage. Full offline use is out of scope for Release 1.

### 2.2 Emergency escalation protocol

Two levels. The lists of triggers and the patient wording are drafted here for the clinical lead to confirm. **[Sign-off: clinical lead + legal]**

| Level | Triggers (patient answers) | Patient sees | HHA does |
|---|---|---|---|
| **1 – Emergency** | Severe chest pain · severe difficulty breathing · coughing blood · signs of stroke · swelling of face, lips, tongue or throat · uncontrolled bleeding · seizure now or first seizure · thoughts of suicide or immediate danger · critical readings (e.g. very low oxygen) | Full-screen instruction to call local emergency services (112 in Nigeria; list by country is supplied by clinical) or go to the nearest emergency department now, with the "you can still continue" option underneath | Creates a high-priority alert to the TeleCare operations desk. The alert holds a reference number only, no health details. |
| **2 – Same-day concern** | Symptoms that should not wait for a routine slot (clinical to list) | Advice to request an earlier consultation or contact HHA | Normal-priority task for the desk |

Who owns it, and how fast:
- **Owner:** the on-duty TeleCare operations lead, who passes clinical questions to the on-duty clinician. **[Sign-off: operations to name the roles]**
- **Target response (proposed):** Level 1 alert acknowledged within 15 minutes during service hours. Clinical to confirm the number.
- **Outside service hours:** the patient is told plainly that nobody is watching in real time and to use emergency services. The alert waits for the next shift. We never imply monitoring that does not exist.
- **Monitoring statement:** every intake screen shows: *"Your answers are reviewed by a clinician before your appointment. They are not watched in real time. If this is an emergency, call [number] now."*
- **DispatchCare:** Release 1 does not dispatch anyone. It does publish a Level 1 event (reference only) that DispatchCare can subscribe to later, so connecting them needs no redesign.
- **Safety net:** if the approved wording is not loaded, the intake feature stays switched off in PROD. A missing message can never go live.
- **Records:** every trigger, message shown and alert sent is logged, without health details.

## 3. Data ownership: MyVault+ and OpenEMR

### 3.1 Who is authoritative for what

| Information | Before clinician approval | After approval | Sent to OpenEMR? |
|---|---|---|---|
| Account and portal preferences | MyVault+ | MyVault+ | No |
| Identity and demographics | MyVault+ (identity fields via existing verification) | OpenEMR for the clinical record; changes to name or date of birth reviewed by a person | Yes, after review |
| Draft intake answers | MyVault+ | n/a | Never |
| Submitted intake (locked) | MyVault+ keeps the original permanently | MyVault+ original stays; a copy goes to OpenEMR as a document or form | Yes, as an archive copy |
| Allergies, conditions, medicines, procedures, history | MyVault+, labelled patient-reported | **OpenEMR leads** for clinician-confirmed items; MyVault+ shows them read-only with source | Yes, clinician-approved items only |
| Items a clinician already entered in OpenEMR | OpenEMR | OpenEMR | Already there; pulled into MyVault+ as verified |
| Vitals | Whoever recorded them, labelled by source | Same | Yes, with source and time |
| Documents and share choices | MyVault+ | MyVault+ keeps the patient's choices | Only documents the patient chose to share |
| Consent evidence | MyVault+ | MyVault+ | Reference to the consent version |

### 3.2 Rules for corrections, conflicts, duplicates and failures

- **Verified information is preserved.** If a patient changes something a clinician already verified, the item goes back to "under review" and the verified version is kept in its history.
- **Corrections** after submission create a new version; the original is never edited.
- **Conflicts** (a clinician changed the same item in OpenEMR after approval): the system flags both versions and asks a person. It never overwrites automatically.
- **Duplicates:** every item stores its OpenEMR identifier and every send carries a unique key, so a retry cannot create a second entry.
- **If OpenEMR is down:** the submission stays safe in MyVault+, shows a "waiting to send" status, and retries later.
- **Future interoperability:** every item has room for a medical code (SNOMED, RxNorm, LOINC) from day one. Release 1 uses plain text and pick-lists.
- **OpenEMR limits:** in week 1 we test in DEV which record types OpenEMR will accept. Anything unsupported uses an approved fallback (a document) and is listed in the sign-off table.

### 3.3 Existing records keep their provenance (change to our earlier plan)

Our earlier plan copied existing allergy, condition and medicine lists into the new structure as "patient-reported". **That is withdrawn.** New rule: **nothing is downgraded, and nothing is assumed.**

| Where the existing item came from | How it is carried over |
|---|---|
| Pulled from OpenEMR or entered by a clinician | Keeps its clinician/OpenEMR source and its **verified** status |
| Entered by the patient | Patient-reported |
| Source cannot be determined | Marked **"source unknown, not verified"** (a new status), neither verified nor patient-reported, and offered to the clinician for review |

Nothing is deleted. Before the one-time carry-over runs, we run it in DEV on a copy of the data and produce a report of how many items fall into each row, for your review.

## 4. Privacy, consent, document access and retention

**[Sign-off: privacy/legal]** (jurisdiction: Nigeria NDPA; English; consent wording supplied by legal)

### 4.1 Reconciling "shared for this visit" and "visible to assigned providers"

Today the two behaviours exist side by side. We define them as two different things:

| | Meaning | Who sets it | Who can see it |
|---|---|---|---|
| **A. Care-team access** | The patient's providers (those assigned to them) may see documents in their vault | Covered by a clear consent line at assignment and at upload | Assigned providers only |
| **B. Shared for this visit** | The patient *highlights* chosen documents for one consultation | The patient, per visit, revocable | The visit's provider sees them first in the summary |

Decisions:
- **New uploads** after release ask the patient: *"Allow your care team to see this document?"* Default for this question is **No** until the patient chooses. **Existing** uploads keep their current setting (no silent change to live data). **[Sign-off: privacy]**
- Patients can switch any document to private at any time; the change takes effect immediately for providers.
- Clinicians see, per document: who uploaded it, date, whether it was shared for this visit, and whether it is merely visible through care-team access.
- Access is enforced on the server for every request and every view is logged.

### 4.2 What the patient consents to

1. That their answers are used by their care team for this consultation.
2. That answers stay "patient-reported" until a clinician confirms them.
3. That confirmed items become part of their medical record in OpenEMR.
4. That they must tell HHA if something changes.

Each consent is stored with the exact wording version, time and device, and is kept even if consent is later withdrawn.

### 4.3 Retention (proposal)

| Data | Proposal |
|---|---|
| Submitted intakes and approved items | Kept as part of the medical record; no deletion until legal sets the retention period |
| Unfinished drafts | Proposed deletion after 90 days of inactivity (**[Sign-off: privacy]**); built only after approval |
| Consent evidence | Kept for as long as the related record |
| Activity log | Records who did what and when, with no health details |

## 5. Delivery plan: 3–4 weeks

**Basis:** two front-end engineers, two back-end engineers, one tester, plus part-time product, clinical, privacy, operations and OpenEMR support. Work is in DEV, with QA once DEV passes. The window is realistic only if Release 1 stays within the scope in section 6 and the sign-offs below arrive on time.

| Week | Milestone | Owner | Done when |
|---|---|---|---|
| **1** | **Phase 0 closes.** OpenEMR capability test in DEV; question-to-destination map; clinical sign-off of questions and escalation; privacy sign-off of consent and access. Engineering starts in parallel: activity-log fix (health answers must not be logged), database foundations. | Engineering lead, clinical lead, privacy | Signed capability table and question map; escalation protocol approved |
| **1–3** | **Health Profile (1A):** structured conditions, allergies, medicines, access needs; provenance and verification labels; safe carry-over of existing data | Back-end + front-end | A patient reviews and updates their profile; edits are tracked; carry-over report reviewed |
| **1–3** | **TeleCare intake (1B)**, overlapping 1A: questionnaire, save and resume, document sharing, locked submission, clinician summary | Front-end + back-end | A patient submits on a phone; the doctor sees the summary and the untouched original |
| **2–4** | **Clinician review and OpenEMR (1C):** accept / amend / reject / decide later; send approved items; retries; conflicts. Starts when the OpenEMR capability table is signed (end of week 1). | Back-end + OpenEMR specialist | An approved allergy appears in OpenEMR once, with no duplicates |
| **4** | **Test and pilot readiness:** full regression on DEV then QA; escalation drill; handover. PROD stays off until final approvals. | Tester, product | Go / no-go review |

**Dependencies that can move the date:**
1. OpenEMR not supporting a record type (mitigation: document fallback, same week).
2. Clinical and legal wording arriving after week 1 (the feature stays off in PROD, so this delays launch, not safety).
3. Operations naming the escalation owners.
4. Any added scope (children, native app, other countries, offline).

**Acceptance checks** (each demonstrated before go-live):
1. New patient completes the essential part on a phone; returning patient updates only what changed.
2. Closing the app halfway and resuming on another device loses nothing.
3. Changing an earlier answer removes its follow-up answers.
4. Double-tapping Submit creates one submission.
5. The doctor sees the summary and the untouched original, and can tell patient-reported, under review and verified apart.
6. A patient edit to a verified item returns it to "under review" and keeps the verified version.
7. A Level 1 answer shows the emergency screen and the monitoring statement, raises the alert with no health details, and does not block the visit.
8. A shared document is visible to that visit's provider only; revoking removes access.
9. Switching OpenEMR off, approving items, then switching on sends each item exactly once.
10. Existing features (profile, vitals, booking, video, document vault, OpenEMR sync) behave as before.
11. The activity log shows who did what, with no health details.
12. Carry-over report shows no verified item downgraded.

## 6. Release 1 versus later

| Release 1 (in the 3–4 weeks) | Later |
|---|---|
| Shared Health Profile: conditions, allergies, medicines, access needs, blood group and genotype, with provenance | Family history, lifestyle and procedures/hospital stays beyond a simple yes/no and short list *(if time is short these move to Release 2 first)* |
| TeleCare intake: essential questions, optional later sections, save and resume, locked submission, deterministic clinician summary | Specialty questionnaires, MinuteCare / HealthConsult question sets |
| Per-visit document sharing; new-upload consent question | Retention clean-up job (after policy approval) |
| Clinician review and sending approved allergies, medicines and conditions to OpenEMR (what DEV tests confirm it accepts) | Remaining record types and medical coding |
| Level 1 / Level 2 escalation with alert to operations; event ready for DispatchCare | Live DispatchCare dispatch and any 24/7 monitoring |
| Adults only (18+); English; web on phone and desktop | Minors and guardians, other languages and countries, native mobile app, offline use |
| Fixed-template summary | AI-written summaries |

## 7. Decisions that are expensive to reverse

| # | Decision | Our recommendation | Why it is hard to change later |
|---|---|---|---|
| 1 | One profile per patient, with service-neutral visit records | Make it service-neutral now | Re-keying history later touches every record |
| 2 | Every item carries source, verification status and OpenEMR identifier | Yes, from the first migration | Cannot recover provenance after it is lost |
| 3 | Submitted intakes are locked and fingerprinted | Yes | Legal and clinical evidence value |
| 4 | Who is authoritative after approval (OpenEMR leads) | As in section 3 | Changes how every sync behaves |
| 5 | Consent stored as an immutable history | Yes | Existing consent record overwrites itself |
| 6 | Adults only at launch | Yes; guardian model is a separate project | Needs a new access model |
| 7 | Room for medical codes now, plain text first | Yes | Adding columns later means re-migrating data |
| 8 | Default visibility of new uploads | Default to private with a prompt | Changing live data defaults affects existing patients |
| 9 | Emergency wording and ownership | Clinical-owned, gated in PROD | Wrong messaging is a safety event |
| 10 | Web first, native app later | Yes | Scoped separately; no rework to the data model |

## 8. Answers to the open decisions (previously D1–D10)

| ID | Decision | Answer |
|---|---|---|
| D1 | Who can use it | Adults 18+; under-18s are directed to support |
| D2 | Privacy rules and wording | Nigeria NDPA, English; wording from legal |
| D3 | Medical coding | Plain text and pick-lists now; space for codes from day one |
| D4 | Summary format | Fixed template, no AI text |
| D5 | Phone app | Mobile-friendly web now; native app later |
| D6 | Data ownership | Section 3: MyVault+ until approval, OpenEMR leads after, conflicts to a person |
| D7 | Draft and form retention | Section 4.3 (90-day draft proposal; submitted records kept) |
| D8 | Emergency messages | Section 2.2; gated in PROD until clinical and legal approve |
| D9 | Upload visibility | **Changed:** existing uploads unchanged; new uploads ask the patient, default private (section 4.1) |
| D10 | Existing lists | **Changed:** carried over with provenance preserved, never downgraded (section 3.3) |

## 9. What we need this week

1. **Clinical lead:** confirm the Level 1/Level 2 triggers, patient wording, the essential-versus-later split and the 15-minute target. *Needed by end of week 1.*
2. **Operations:** name the roles that receive and own Level 1 alerts, and the out-of-hours arrangement. *Needed by end of week 1.*
3. **Privacy/legal:** consent wording, the new-upload default, and the 90-day draft proposal. *Needed by end of week 1 for wording; production approval before launch.*
4. **OpenEMR owner:** a safe DEV test environment and sign-off of the capability table. *Needed by day 3.*
5. **Product owner:** approve the Release 1 scope in section 6 and the adults-only decision.
