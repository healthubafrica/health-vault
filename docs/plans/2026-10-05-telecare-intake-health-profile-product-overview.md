# TeleCare Intake & Health Profile: Product Owner Overview

**Audience:** product owners, clinical leads, operations and compliance reviewers. No technical background needed.
**Companion document:** the engineering plan, [2026-10-05-telecare-intake-health-profile.md](2026-10-05-telecare-intake-health-profile.md). This page summarizes it and does not replace it.
**Status:** draft for review. Dates are estimates from the architecture draft and have not yet been confirmed with the engineering team.

---

## 1. What we are building, in one paragraph

Before a TeleCare consultation, the patient fills in a health questionnaire in MyVault+. Their answers are saved so they never have to type the same history twice. The doctor sees a one-page summary before the call. After the visit, the doctor reviews what the patient said and approves what should go into the official medical record in OpenEMR. Nothing the patient types is written into the official record until a clinician has approved it.

## 2. Why it matters

| Today | After this work |
|---|---|
| Patients are asked the same history questions at every visit | Patients review and update what changed |
| Doctors start the call by collecting basics | Doctors start with a summary and spend the call on the problem |
| Lab results and old reports are requested ad hoc | Patients choose which documents their doctor can see for this visit |
| Patient-reported information can't be told apart from doctor-verified information | Every item is labelled: patient-reported, under review, or verified |

## 3. The two parts

1. **Health Profile** is the long-lived part: conditions, allergies, medicines, past surgeries, family and lifestyle history. It is entered once and updated over time.
2. **TeleCare Intake** is the per-visit part: why they're coming, the symptoms, a symptom checklist by body system, recent tests, and what they want from the visit.

They are kept separate on purpose. Last year's symptoms must never show up as this visit's answers.

## 4. What the patient experiences

- A card on the TeleCare screen shows **intake status** (not started, in progress, submitted) and a **Complete intake** button.
- Works on a phone browser or desktop. Progress is saved as they go, so they can stop and come back, even on another device.
- Questions only appear when relevant. For example, "how many cigarettes a day" appears only if they say they smoke.
- Returning patients see what they said before and only update what changed.
- They can **share a lab result or report** with their doctor for this visit, and take that access back later.
- If an answer suggests an emergency (for example swelling of the face or throat), a clear "seek emergency care" message appears. **It never stops them from continuing or from joining the call.**
- The call button is never locked because the intake is incomplete.

## 5. What the doctor experiences

- A **pre-visit summary** in the existing provider TeleCare screen: reason for visit, key symptoms, history, medicines, allergies, recent results, and the patient's own goal for the visit.
- Badges on every item: *Patient-reported*, *Under review*, *Verified*.
- A list at the top of "things you still need to confirm".
- The patient's **complete original answers**, kept unchanged, in a side panel.
- After the visit, per item: **Accept, Amend, Reject, or Decide later**. Accepted items are sent to OpenEMR.

## 6. Safeguards (the promises we are making)

- **Nothing unapproved reaches the official record.** Only clinician-approved items are sent to OpenEMR.
- **Submitted answers can't be altered.** Even by us. If a patient needs to correct something, a new version is created and the old one is kept.
- **Every change leaves a trail:** who, what, when. The trail records *that* something changed, not the private details.
- **If OpenEMR is down,** nothing is lost. The intake stays safe and sending is retried later without creating duplicates.
- **If a doctor changed the same item in OpenEMR,** we flag the difference and ask a person. We never overwrite it automatically.
- **Patients control sharing.** A document is visible to the provider only if the patient chose to share it for that visit.
- **Switched off until ready.** The whole feature sits behind a switch that is off in production until every approval below is in place.

## 7. What already exists, and what is new

**Already in place and reused:** patient accounts and profile, vitals, TeleCare booking and video sessions, the document vault, consent records, the activity log, OpenEMR connection and background sending, and the feature-switch screen in the admin app.

**New:** the questionnaire itself and its question rules; the saved, structured health history; the "submitted and locked" record; the clinician summary and review screens; the approval workflow; and the OpenEMR sending for approved items.

**Two things we found while checking the existing system that shape the plan:**
1. The current activity log would have copied patients' typed answers into a general-purpose log. We fix this first, before any health data flows through it.
2. The existing "share records" feature creates links for outside people. It is not the same as letting a doctor see a document, so we build a purpose-made sharing step for intake.

## 8. The delivery plan

Estimates are in weeks of calendar time, assuming roughly two front-end engineers, two back-end engineers, one tester, and part-time product, design, clinical and OpenEMR support. Phases overlap, so the total is **3 to 4 weeks** for Release 1 (scope and dependencies in the [Phase 0 decision pack](2026-10-18-telecare-intake-phase0-decision-pack.md)).

| Phase | What happens | Est. | What you can see at the end |
|---|---|---|---|
| **0. Discovery** | Test what OpenEMR can actually accept. Confirm every question and where its answer goes. Get decisions and approvals (section 9). No production changes. | Week 1 | A signed table of "what OpenEMR supports", and the question-to-destination map |
| **1A. Health Profile** | Structured history with edit tracking. Existing allergy, condition and medicine lists carried over safely. | Weeks 1–3 | A patient can review and update their profile; edits are tracked |
| **1B. TeleCare Intake** | The questionnaire, save and resume, document sharing, locked submission, doctor's summary. | Weeks 1–3 (overlaps 1A) | A patient submits an intake; the doctor sees the summary and the original answers |
| **1C. Review and OpenEMR** | Accept / Amend / Reject / Decide later, sending approved items, retry and conflict handling. | Weeks 2–4 (needs Phase 0 sign-off) | An approved allergy appears in OpenEMR once, with no duplicates |
| **Rollout** | Test on staging, internal pilot, then everyone. | Week 4 | Go / no-go review |
| *Later: native mobile app* | Same experience in the Expo app. Not in this plan's dates. | TBD | n/a |

**Likely to slip the dates:** OpenEMR not supporting some record types (we'd use an approved fallback such as a document), clinical or legal copy arriving late, or a request to add native mobile, children or multi-country consent to the first release.

## 9. Decisions we need from you

We have proposed a default for each. Tell us if any is wrong; none blocks the first weeks of work. Items marked ◆ are the ones most expensive to change later.

| # | Question | Our default |
|---|---|---|
| 1 ◆ | Who can use it at launch? | **Adults only (18+).** Under-18s get a "contact support" message; a clinician can still complete it with them. A guardian flow is a separate project. |
| 2 | Which privacy rules and consent wording? | **Nigeria (NDPA), English.** Wording supplied by legal. |
| 3 | Medical coding standards (SNOMED, RxNorm, LOINC)? | **Plain text and pick-lists for now.** The data is built so codes can be added later without rework. |
| 4 | Doctor's summary format? | **Fixed template, no AI-written text** in the first release. |
| 5 ◆ | Phone app at launch? | **Mobile-friendly web only.** The native app follows. |
| 6 ◆ | Who owns the data once approved? | **MyVault+ until a doctor approves; after that OpenEMR leads.** Disagreements go to a person. |
| 7 | How long do we keep unfinished drafts and submitted forms? | **No automatic deletion yet;** needs a policy decision before any clean-up job is built. |
| 8 ◆ | Emergency messages | **The mechanism is built; the wording must come from clinical and legal.** Production stays blocked until it's approved. |
| 9 | Should patient uploads be hidden from providers by default? | **Not changed in this release.** Today they are visible to assigned providers by default; privacy should decide if that changes. |
| 10 | What happens to existing allergy, condition and medicine lists? | **Copied once into the new structure, labelled "patient-reported", nothing deleted.** |

## 10. What we need from other teams (and by when)

| From | What | Needed before |
|---|---|---|
| **Clinical lead** | Approve question wording, answer options, which questions are required; define emergency triggers and the patient message; set value limits for vitals; set how often a profile counts as "stale" (we suggest 6 months) | Phase 1B ships to production |
| **Legal / privacy** | Consent wording; data retention rules; confirm the privacy review | Production enablement |
| **OpenEMR owner** | Provide a safe test environment; confirm which record types it accepts; sign the capability table | Start of Phase 1C |
| **Operations** | Who receives urgent-answer alerts, response times, and what happens outside service hours | Production enablement |
| **Support** | Briefing and a short script for patient questions | Pilot |

## 11. How we will know it works

Plain-language acceptance checks we will demonstrate before go-live:

1. A new patient completes the full intake on a phone. A returning patient only updates what changed.
2. A patient closes the app halfway, reopens on another device, and nothing is lost.
3. Changing an earlier answer (for example "I smoke" to "I don't") removes the follow-up answers instead of leaving stale data behind.
4. Double-tapping Submit, or a poor connection retry, creates **one** submission.
5. A doctor sees the summary and the untouched original answers, and can tell patient-reported from verified at a glance.
6. If a patient edits something a doctor already verified, it goes back to "under review" and the old verified value is kept.
7. An emergency-type answer shows the safety message and does not block the visit.
8. Sharing a document lets only the visit's provider see it, and revoking it removes access.
9. Switching OpenEMR off, approving items, then switching it back on sends each item exactly once.
10. Existing features (profile, vitals, booking, video calls, document vault, share links, OpenEMR sync) behave as before.
11. A check of the activity log shows who did what, with **no** health details in it.

## 12. Risks in plain language

| Risk | How likely | What we do about it |
|---|---|---|
| OpenEMR can't accept some kinds of information | High | Test early (Phase 0). Use an approved fallback such as a document for anything unsupported. |
| Clinical or legal wording is late | Medium | Production is blocked in code until it's approved, so late copy delays launch rather than risking a wrong message. |
| Old and new health lists drift apart | Medium | Single carry-over step, plus a check that every other part of the system updates both. |
| Private details leak into logs or alert emails | Medium | Fixed first; alerts carry reference numbers only; verified by a log check before launch. |
| Scope grows (children, native app, more countries) | Medium | Held out of Release 1 by decisions 1, 5 and 2; each can be planned separately. |
| Locked records block a future deletion request | Low | Deliberate, because medical records shouldn't be deleted casually. A future clean-up needs a reviewed change. |

## 13. Not in this release

AI-written summaries or diagnosis, patient-facing risk scores, a no-code form builder, minors and guardian access, offline use, specialty-specific questionnaires, the native mobile app, and any change to who can see existing uploads by default.

## 14. Rollout in four steps

1. **Staging test:** everything on, using test patients; the full regression list is run.
2. **Production, switched off:** the code is live but invisible.
3. **Internal pilot:** switch on for staff and friendly patients; watch alerts and the activity log.
4. **Everyone:** after a go/no-go review with clinical, privacy and operations.

Rollback is simply turning the switch off. Nothing already submitted is lost.

## 15. Glossary

- **OpenEMR:** the official electronic medical record system.
- **Verified:** a clinician has reviewed and approved the item.
- **Reconciliation:** the doctor's review step (accept, amend, reject, defer).
- **Feature switch (flag):** an on/off control in the admin app.
- **Audit trail:** a record of who changed what and when.
- **Staging:** the safe test copy of the live system.
