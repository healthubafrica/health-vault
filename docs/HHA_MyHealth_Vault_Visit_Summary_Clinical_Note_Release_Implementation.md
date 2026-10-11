**HEALTH-HUB AFRICA®** 

# **MyHealth Vault+™** 

## **Patient Visit Summary & Clinical Note Release** 

#### _Developer Implementation Specification_ 

|**Document Control**|**Value**|
|---|---|
|Purpose|Implement an industry-aligned patient-facing visit summary and controlled clinical-note release<br>workflow.|
|Clinical Source of Truth|OpenEMR 8.2|
|Patient Experience|MyHealth Vault+ webportal and future mobile companion|
|Implementation Principle|Savingclinical documentation is not the same aspublishingit to thepatient.|
|Initial UAT Case|PID 60 / Encounter 135|
|Environment|Implement and validate in staging before production.|



###### **CONFIDENTIAL – INTERNAL DEVELOPMENT USE** 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

### **1. Executive Summary** 

MyHealth Vault+ should not expose raw OpenEMR encounter forms simply because a clinician saved them. The portal should present a patient-friendly Visit Summary / After Visit Summary (AVS), while the underlying clinical note remains a separate artifact that becomes patient-visible only after an explicit release decision. 

The implementation must preserve OpenEMR as the clinical system of record and add an HHA publication layer that controls what is presented to the patient, when it is presented, who released it, and whether it was later amended. 

Current production diagnostics show that SOAP and Vitals are saved correctly, but the portal compatibility and publication behavior are incomplete. Therefore this project replaces one-off renderer fixes with a reusable, auditable workflow. 

### **2. Design Principles** 

- OpenEMR remains the authoritative clinical record. 

- MyHealth Vault+ is the patient-facing presentation and publication layer. 

- A saved SOAP note must not automatically become patient-visible. 

- The patient-facing Visit Summary should use plain, understandable language and structured clinical data. 

- Clinical Notes, Test Results, Documents, Medications, and Health Summary remain distinct patient-facing domains. 

- Publication decisions must be explicit, auditable, reversible where appropriate, and safe for amendments. 

- The same backend API should serve the web portal and the future MyHealth Vault+ mobile app. 

- Never authorize portal access by accepting an arbitrary patient ID from a query string; derive patient identity from the authenticated session/token. 

### **3. Target Patient Experience** 

A completed visit should appear in MyHealth Vault+ as a structured Visit Summary: 

|**Section**|**Patient-facing content**|
|---|---|
|Visit Header|Date, provider,facility/service,visit type/status.|
|Reason for Visit|Encounter reason from OpenEMR;no duplicate clinician entry.|
|Vital Signs|Blood pressure, pulse, respiration, temperature, SpO₂, height, weight, BMI and other appropriate<br>measurements.|
|Assessment|Patient-appropriate assessment/diagnostic summary.|
|Plan & Instructions|Careplan,self-care instructions, precautions and next steps.|
|Medications|Medication changes duringthe visit, plus links to the full medication list.|
|Orders / Tests|Ordersplaced duringthe encounter;results remain in the Results module.|
|Follow-Up|Follow-uptiming,service/provider and escalation instructions.|
|Related Documents|Links topatient-appropriate documents,without duplicatingfile storage.|
|Clinical Note|Separate 'View Clinical Note' action onlywhen explicitlyshared.|



### **4. Publication Model** 

Use two independent controls: Visit Summary publication and Clinical Note sharing. 

|**Field / State**|**Meaning**|**Patient Visibility**|
|---|---|---|
|draft|Provider is still documentingor summaryis incomplete.|No|
|finalized|Clinical/summarycontent is complete but notyet released.|No|
|published|Visit Summaryhas been released.|Visit Summary: Yes|
|clinical_note_shared = 0|Underlyingclinician note is not released.|Clinical Note: No|
|clinical_note_shared = 1|Underlyingclinician note is explicitlyreleased.|Clinical Note: Yes|
|amended|Previously published content changed after release.|Updated summary with<br>amendment indicator|



Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

Do not repurpose the existing OpenEMR forms.authorized field as the HHA publication switch without a separate analysis of its core OpenEMR semantics. Do not perform a mass UPDATE of forms.authorized. 

### **5. Target Architecture** 

```
OpenEMR (clinical source of truth)
        |
        +-- Encounter / Reason for Visit
        +-- Vitals
        +-- SOAP / clinical documentation
        +-- Medications / Orders / Results / Documents
        |
        v
HHA Visit Publication Service
        |
        +-- Visit Summary / AVS
        +-- Publication status
        +-- Clinical-note sharing status
        +-- Audit / amendment history
        +-- Notification event
        |
        v
HHA Patient API
        |
        +---------------------+
        |                     |
        v                     v
MyHealth Vault+ Web     MyHealth Vault+ Mobile
```

### **6. Pre-Implementation Discovery – Mandatory** 

Before creating new tables or services, inspect the existing HHA AI After Visit Summary implementation. The goal is to extend existing functionality rather than create a second competing AVS engine. 

1. Inventory the hha_ai_after_visit_summary table: schema, keys, encounter relationship, publication fields, generated text, status fields and timestamps. 

2. Inspect oe-module-hha-ai-clinical-assistant for AVS generation, approval, publication and portal integration logic. 

3. Identify existing HHA API endpoints that already expose encounter/AVS data. 

4. Identify existing notification events or queues that can carry VISIT_SUMMARY_PUBLISHED and CLINICAL_NOTE_SHARED. 

5. Identify audit tables/logging helpers already used by HHA modules. 

6. Document whether any existing publication_status implementation can be extended safely. 

Deliverable: a short discovery report and proposed reuse plan before database migration. 

### **7. Proposed Data Model** 

If discovery confirms that no equivalent HHA publication record exists, create an extension table rather than modifying core OpenEMR tables. 

```
CREATE TABLE hha_patient_visit_publication (
```

```
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    pid BIGINT NOT NULL,
    encounter BIGINT NOT NULL,
```

```
    publication_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    clinical_note_shared TINYINT(1) NOT NULL DEFAULT 0,
```

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

```
    published_by BIGINT DEFAULT NULL,
    published_at DATETIME DEFAULT NULL,
```

```
    note_shared_by BIGINT DEFAULT NULL,
    note_shared_at DATETIME DEFAULT NULL,
```

```
    amended_at DATETIME DEFAULT NULL,
```

```
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
```

```
    PRIMARY KEY (id),
    UNIQUE KEY uq_hha_visit_publication_encounter (encounter),
    KEY idx_hha_visit_publication_pid (pid),
    KEY idx_hha_visit_publication_status (publication_status)
);
```

Developer note: final column types and foreign-key strategy must be reconciled with the actual OpenEMR/HHA schema. Use migrations that are idempotent and rollback-capable. 

### **8. Source-to-Portal Mapping** 

|**Portal Field**|**Primary OpenEMR/HHA Source**|**Rule**|
|---|---|---|
|Reason for Visit|form_encounter.reason|Read directly;do not duplicate entry.|
|Visit Date / Encounter|form_encounter|Use encounter identityas the visit anchor.|
|Provider / Facility|form_encounter + users/facilityrelationships|Returnpatient-friendlynames.|
|Vitals|form_vitals|Return structured values and units.|
|Assessment|form_soap.assessment|Include inpatient summaryafterprovider review.|
|Plan|form_soap.plan|Transform into patient-facing instructions where<br>appropriate.|
|Full SOAP|form_soap|Expose onlythrough Clinical Notes when explicitlyshared.|
|Medications|OpenEMR medication/prescription sources|Distinguish current list from visit changes.|
|Orders / Results|OpenEMRprocedure/result sources|Results stayin Results module;visit links to them.|
|Documents|documents + categoryrelationships|Linkpatient-appropriate files;do not duplicate storage.|
|AVS|Existing HHA AI AVS if reusable|Provider reviews before publication.|



### **9. Visit Summary Service** 

Create a backend service that assembles a patient-facing encounter model. It must: 

- Validate that the encounter belongs to the authenticated patient. 

- Retrieve encounter metadata and reason for visit. 

- Retrieve the most appropriate vitals associated with that encounter. 

- Retrieve assessment and plan from the finalized clinical documentation. 

- Retrieve medication changes, orders, follow-up data and related document/result indicators where available. 

- Use the existing HHA AI AVS engine when appropriate, but never publish AI-generated content without the configured provider review/approval workflow. 

- Return structured JSON; do not require the portal/mobile client to parse OpenEMR HTML report output. 

- Exclude internal-only fields, audit metadata, database identifiers not needed by the patient, and draft/unreleased notes. 

### **10. Suggested API Contract** 

```
GET /api/patient/visits
GET /api/patient/visits/{encounter}
GET /api/patient/visits/{encounter}/summary
```

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

```
GET /api/patient/visits/{encounter}/clinical-note
GET /api/patient/visits/{encounter}/documents
GET /api/patient/visits/{encounter}/results
```

Example summary response: 

```
{
  "encounter": 135,
  "date": "2026-08-13",
  "visit_type": "Routine Wellness Visit",
  "provider": {"name": "Dr. Example"},
  "facility": {"name": "TeleCare"},
  "reason_for_visit": "Routine mid-year comprehensive health checkup and preventive wellness evaluation.",
  "vitals": {
    "blood_pressure": {"systolic": 118, "diastolic": 76, "unit": "mmHg"},
    "pulse": {"value": 72, "unit": "bpm"},
    "respiration": {"value": 16, "unit": "per_min"},
    "temperature": {"value": 98.4, "unit": "F"},
    "oxygen_saturation": {"value": 98, "unit": "%"},
    "weight": {"value": 145, "unit": "lb"},
    "height": {"value": 66, "unit": "in"},
    "bmi": 23.4
  },
  "assessment": "Routine health maintenance evaluation.",
  "patient_instructions": "...",
  "follow_up": "...",
  "clinical_note_available": true,
  "results_available": false,
  "documents_available": true,
  "publication": {
    "status": "published",
    "published_at": "2026-08-13T14:32:17"
  }
}
```

### **11. Provider Workflow in OpenEMR** 

Add a simple Patient Portal / Visit Publication panel to the provider workflow: 

```
PATIENT PORTAL / VISIT PUBLICATION
```

```
Visit Summary Status: Draft
```

```
[ Generate / Refresh Summary ]
[ Preview Visit Summary ]
```

```
[ ] Release Visit Summary to Patient
```

```
[ ] Share Clinical Note with Patient
```

```
[ Finalize & Publish ]
```

Behavioral requirements: 

- Generate/Refresh must never silently publish. 

- Preview must show exactly what the patient will see. 

- • Publishing requires a provider/user identity and timestamp. 

- Clinical Note sharing is a separate checkbox/action. 

- If the note is amended after publication, mark the patient-facing record as updated and preserve the audit history. 

- If a visit is not appropriate for patient release under organizational policy, the provider must be able to finalize the clinical record without publishing it. 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

### **12. MyHealth Vault+ UI Requirements** 

Visits list: 

- Show published visits only. 

- Display date, visit type/service, provider and facility. 

- Use a clear status such as 'Visit Summary Available' or 'Updated'. 

- Do not expose internal encounter IDs as the primary patient-facing identifier. 

##### Visit detail page: 

|**UI Section**|**Requirement**|
|---|---|
|Header|Date, provider,service/facility,visit type.|
|Reason for Visit|Fullpatient-facingreason;do not truncate to the current 20-character controller display.|
|Vitals|Responsive cards/table usingstructured values.|
|Assessment|Patient-facingassessment.|
|Plan & Instructions|Prominent next-stepinstructions.|
|Medication Changes|Start / Stop/ Continue where data supports it.|
|Orders / Results|Show indicators and links to Results.|
|Documents|Show relatedpatient-appropriate documents.|
|Follow-Up|Displaytiming,service/provider and instructions.|
|Clinical Note|Button/section appears onlywhen clinical_note_shared = 1.|



### **13. Clinical Note Release** 

The full SOAP note is not the primary Visit Summary. It is a separate clinical record. The API must return it only when the encounter is published and the clinical-note sharing flag is true. 

```
ALLOW clinical note when:
publication_status = 'published'
AND clinical_note_shared = 1
AND authenticated_patient_owns_encounter = true
```

When displayed, organize the note into Subjective, Objective, Assessment and Plan. Do not expose draft notes, deleted forms, internal debug information or unrelated encounters. 

### **14. Results, Documents and Medications** 

Results: 

- Keep laboratory/imaging/diagnostic results in a dedicated Results module. 

- A visit may show 'Tests ordered' and link to results when available. 

- Provider comments may be shown with the result according to the result-release policy. 

##### Documents: 

- Keep PDFs, imaging reports, letters, referrals and external records in Documents. 

- Visit Summary may link to related documents but should not create duplicate files. 

- Respect document category and patient-release rules. 

##### Medications: 

- Present Current Medications separately from Medication Changes This Visit. 

- Where supported, present changes as START / STOP / CONTINUE. 

- Do not infer a medication change solely because a medication appears in the database. 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

### **15. Notifications** 

Create or reuse event-driven notification triggers: 

```
VISIT_SUMMARY_PUBLISHED
CLINICAL_NOTE_SHARED
VISIT_SUMMARY_AMENDED
RESULT_RELEASED
```

Channels may include email, SMS, portal in-app notification and mobile push. External notifications must remain privacyminimal; do not include diagnoses or sensitive clinical details. 

Suggested notification: 

**Your Visit Summary is Ready.** Your information from a recent Health-Hub Africa visit is available in MyHealth Vault+. Sign in to review your visit summary, care instructions and follow-up information. 

### **16. Audit and Amendment Requirements** 

|**Audit Event**|**Minimum Data**|
|---|---|
|VISIT_SUMMARY_GENERATED|PID,encounter,user,timestamp,source/version.|
|VISIT_SUMMARY_PUBLISHED|PID,encounter, publishinguser,timestamp,old/new status.|
|CLINICAL_NOTE_SHARED|PID,encounter,sharinguser,timestamp.|
|VISIT_SUMMARY_AMENDED|PID,encounter,user,timestamp, prior version/reference.|
|PUBLICATION_REVOKED|PID, encounter, user, timestamp, reason where policy requires.|



Published content must not be silently overwritten. If clinical documentation changes after publication, preserve a history/version reference and display an 'Updated' indicator where appropriate. 

### **17. Security and Authorization** 

- Authenticate every patient API request. 

- Resolve the patient's OpenEMR identity from the authenticated account mapping, not from a user-supplied pid parameter. 

- Enforce encounter ownership server-side on every endpoint. 

- Enforce publication status server-side; hiding a UI button is not authorization. 

- Use least-privilege service credentials between MyHealth Vault+ and OpenEMR. 

- Log access to clinical notes and sensitive documents where supported. 

- Escape/sanitize all rendered clinical text and never render untrusted HTML from clinician-entered text without sanitization. 

- Protect against IDOR by testing sequential and random encounter/document identifiers. 

- Do not place clinical content in email/SMS/push notification bodies. 

### **18. Current Production Findings to Preserve During Development** 

- SOAP and Vitals are stored correctly in OpenEMR and have existing report functions. 

- The installed SOAP and Vitals form directories currently do not contain patient_portal.php renderers. 

- OpenEMR's portal-compliant form discovery checks for patient_portal.php in the form directory. 

- The production PortalPatientReportController currently contains an HHA SOAP suppression rule. 

- Do not remove the SOAP suppression rule until the new controlled publication workflow is ready; otherwise raw SOAP may surface before release controls exist. 

- Do not deploy the previously proposed direct SOAP/Vitals renderer patch as the final architecture. 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

### **19. PID 60 / Encounter 135 UAT Scenario** 

Use PID 60 / Encounter 135 as the first end-to-end acceptance test. Do not manually manipulate it merely to force portal visibility. 

|**Step**|**Expected Result**|
|---|---|
|1. Provider opens encounter 135|Existingreason,SOAP and vitals arepresent.|
|2. Generate Visit Summary|Summaryis assembled from encounter data.|
|3. Preview|Provider sees the exactpatient-facingoutput.|
|4. Beforepublish|PID 60 cannot see the Visit Summary.|
|5. Publish Visit Summary|Publication record stores user/time/status.|
|6. Patient signs in|Visit appears in MyHealth Vault+ Visits.|
|7. Patient opens visit|Reason,vitals,assessment, plan/instructions and related items displaycorrectly.|
|8. Clinical note not shared|SOAP is not visible.|
|9. Provider shares Clinical Note|Audit event is recorded.|
|10. Patient refreshes/re-authenticates|Clinical Note action becomes available.|
|11. Amendpublished visit|Updated state/version ispreserved and displayed.|
|12. Authorization negative test|Anotherpatient cannot access encounter 135 bychangingIDs.|



### **20. Staging and Deployment Plan** 

|**Phase**|**Deliverable**|
|---|---|
|Phase 1 – Discovery|InventoryexistingAVS, publication,API,notification and audit components.|
|Phase 2 – Data Model|Implement/reusepublication state and migration in staging.|
|Phase 3 – SummaryService|Build structured Visit Summaryaggregation service.|
|Phase 4 – Provider Controls|Add Generate,Preview,Publish and Share Clinical Note workflow.|
|Phase 5 – Patient API|Implement authenticatedpatient visit endpoints.|
|Phase 6 – Portal UI|Build Visits list/detail,Results/Documents links and Clinical Note release UI.|
|Phase 7 – Notifications|Wirepublication/amendment events to email/SMS/in-app/push services.|
|Phase 8 – Security QA|IDOR,role, publication,XSS/content sanitization and audit testing.|
|Phase 9 – UAT|Execute PID 60 / Encounter 135 acceptance scenarioplus additional visit types.|
|Phase 10 – Production|Backup,deploy,smoke test,monitor and retain rollbackplan.|



### **21. Acceptance Criteria** 

- ☐ A clinician can complete an encounter without automatically exposing the SOAP note. 

- ☐ A provider can generate and preview a patient-friendly Visit Summary. 

- ☐ A provider can publish the Visit Summary independently of sharing the Clinical Note. 

- ☐ Published visits appear only to the authenticated patient who owns them. 

- ☐ Reason for Visit is displayed in full and originates from the encounter. 

- ☐ Vitals are returned as structured data and render correctly on web/mobile. 

- ☐ Assessment, plan and patient instructions are correctly associated with the encounter. 

- ☐ Clinical Note is unavailable until explicitly shared. 

- ☐ Results and Documents remain separate modules but can be linked from a visit. 

- ☐ Publication, note sharing and amendments are auditable. 

- ☐ Notifications contain no unnecessary clinical details. 

- ☐ Existing OpenEMR clinical documentation remains unchanged as the source of truth. 

- ☐ The implementation works in staging before production deployment. 

- ☐ PID 60 / Encounter 135 passes the full UAT scenario. 

### **22. Rollback Requirements** 

- Every schema change must have a documented rollback migration. 

- Back up any HHA-customized PHP/controller files before modification. 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

- Do not delete existing SOAP/Vitals or encounter data during migration. 

- Feature-flag the new patient visit experience where practical so it can be disabled without data loss. 

- If production validation fails, disable new publication endpoints/UI and restore the previous controller/module state while retaining publication audit records for investigation. 

### **23. Developer Handoff Checklist** 

- ☐ Confirm staging environment and current production/staging code parity. 

- ☐ Complete existing HHA AVS/publication discovery. 

- ☐ Document reuse vs. new-component decisions. 

- ☐ Create migration and rollback scripts. 

- ☐ Implement publication service. 

- ☐ Implement Visit Summary aggregation. 

- ☐ Implement provider Preview/Publish controls. 

- ☐ Implement explicit Clinical Note sharing. 

- ☐ Implement authenticated patient API. 

- ☐ Implement web portal Visits UI. 

- ☐ Ensure API is mobile-ready. 

- ☐ Integrate notifications. 

- ☐ Implement audit/amendment history. 

- ☐ Run automated/unit/integration/security tests. 

- ☐ Execute PID 60 UAT. 

- ☐ Obtain clinical/product sign-off. 

- ☐ Deploy production with rollback plan. 

- ☐ Post-deployment smoke test and monitoring. 

### **24. Explicit Do-Not-Do List** 

- Do not expose every saved SOAP note automatically. 

- Do not mass-update forms.authorized to force portal visibility. 

- Do not use a query-string pid as authorization. 

- Do not parse HTML report output in the portal when structured data is available. 

- Do not duplicate documents or lab results inside the Visit Summary. 

- Do not publish AI-generated patient instructions without the configured provider review/approval step. 

- Do not remove the current SOAP suppression workaround until the replacement release-control path is complete and tested. 

- Do not patch only PID 60; solve the workflow system-wide. 

- Do not deploy directly to production before staging/UAT. 

### **25. Definition of Done** 

The project is complete when a provider can document a visit normally in OpenEMR, generate and review a patient-friendly Visit Summary, publish that summary to MyHealth Vault+, independently decide whether to share the full Clinical Note, and have all publication actions enforced by authenticated APIs and recorded in an audit trail. The same contract must support the MyHealth Vault+ web portal and mobile app. 

Health-Hub Africa® | MyHealth Vault+™ | Developer Implementation Specification 

