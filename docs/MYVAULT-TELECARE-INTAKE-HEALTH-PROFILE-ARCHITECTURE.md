# MyVault+ TeleCare Intake and Health Profile

## Field Dictionary and Phased Architecture Specification

**Status:** Draft for product, clinical, engineering, privacy, and OpenEMR review  
**Prepared:** 2026-09-28  
**Scope:** MyVault+ patient Health Profile, TeleCare intake, clinician reconciliation, document sharing, and OpenEMR integration  
**Environment constraint:** Discovery only. Do not make production changes from this document.

## 1. Executive decision

Build two connected but independently versioned products:

1. **Longitudinal Health Profile**: reusable patient information such as demographics, conditions, allergies, medications, disability/access needs, family history, social history, and latest measurements.
2. **TeleCare Intake**: an encounter-specific submission containing reason for visit, history of present illness, current symptoms, review of systems, recent tests, goals, acknowledgements, and documents shared for that consultation.

Patient-entered clinical data must not silently replace clinician-verified data. A submitted intake is immutable. Clinicians reconcile relevant responses into normalized clinical records through explicit accept, amend, reject, or defer actions.

The current `PatientMedicalInfo` arrays and free-text fields are suitable for a profile summary, but they are not sufficient as the long-term clinical source of truth. Conditions, medications, allergies, procedures, hospitalizations, family history, and disability/access needs require repeatable records with provenance, dates, status, and verification metadata.

## 2. Scope boundaries

### In scope

- Mobile and desktop patient intake.
- New-patient completion and returning-patient review.
- Save and Resume with section-level progress.
- Persistent health profile and visit-specific intake separation.
- Conditional question display.
- Original submission preservation and audit history.
- Clinician review and reconciliation.
- Clinician pre-visit summary.
- Reuse of MyVault+ document upload and sharing.
- Approved OpenEMR synchronization after reconciliation.
- Safety messaging and escalation for potentially urgent answers.

### Out of scope for Release 1

- Automated diagnosis or treatment recommendations.
- Patient-facing clinical risk scores.
- Autonomous AI triage.
- Silent writes into clinician-verified OpenEMR lists.
- Replacing OpenEMR as the system of record for clinician-authored information.
- A generic no-code form builder for unrelated workflows.

## 3. Existing platform inventory

| Capability | Current implementation | Disposition |
| --- | --- | --- |
| Patient identity | `Patient` includes legal name, date of birth, gender, contact-linked user, address, geography, language, blood group, genotype, NIN, and next of kin | Reuse and extend |
| Basic health profile | `PatientMedicalInfo` includes allergies, chronic conditions, active medications, immunizations, height, weight, disability, care plan, and notes | Retain as a read-optimized summary; normalize clinical lists |
| Emergency contacts | Repeatable `EmergencyContact` records plus legacy next-of-kin fields | Use repeatable records as canonical |
| Vitals | Timestamped `VitalsReading` records with source and core measurements | Reuse; add unit/context metadata where required |
| TeleCare | `TelecareSession` and clinician `TelecareSessionNote` | Attach a new patient intake to appointment/session |
| Documents | `ClinicalRecord`, categories, patient upload source, and `RecordShare` | Reuse sharing and access audit |
| Consent | Versioned `PatientConsent` records | Extend consent types and immutable evidence |
| Audit | `AuditLog` supports actor, patient, resource, metadata, IP, user agent, and timestamp | Reuse; add field-change events and snapshots |
| OpenEMR | Patient sync, encounters, observations, medications, allergies, documents, labs, and queue/error infrastructure exist | Extend only after DEV capability probes |
| Questionnaire engine | No reusable, versioned intake definition/submission model identified | New capability |
| Reconciliation | No field-level patient-to-clinician verification workflow identified | New capability |

## 4. Core architecture

```text
Questionnaire Definition + Version
                 |
                 v
Patient Draft -> Submitted Intake Snapshot -> Clinician Review
                                              |   |   |
                                  accept/amend/reject/defer
                                              |
                                              v
                                  Normalized Clinical Records
                                              |
                                      approved mapping only
                                              |
                                              v
                                           OpenEMR
```

### 4.1 Source-of-truth rules

| Data class | MyVault+ ownership | OpenEMR behavior |
| --- | --- | --- |
| Portal account preferences | MyVault+ canonical | Do not sync unless explicitly mapped |
| Patient-entered draft | MyVault+ canonical | Never sync |
| Original submitted questionnaire | MyVault+ immutable source record | Optionally archive as QuestionnaireResponse/document/form after DEV validation |
| Patient-reported clinical item | MyVault+ until reconciled | Do not overwrite verified OpenEMR data |
| Clinician-verified clinical item | Shared clinical record with explicit version/source | Sync through approved OpenEMR API and retain both identifiers |
| Clinician-authored OpenEMR item | OpenEMR canonical | Pull to MyVault+ as read-only or clinician-verified |
| Document share grant | MyVault+ canonical | OpenEMR receives or references the document only through approved workflow |

### 4.2 Required provenance fields

Every normalized clinical item must support the following fields, even when some are nullable:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | UUID | Stable MyVault+ identifier |
| `patientId` | UUID | Record owner |
| `sourceType` | Enum | `patient`, `clinician`, `openemr`, `system`, `external_document` |
| `sourceReferenceId` | UUID/string | Intake, document, or external resource that supplied the item |
| `verificationStatus` | Enum | `patient_reported`, `pending_review`, `verified`, `amended`, `rejected`, `entered_in_error` |
| `recordedByUserId` | UUID nullable | Person who entered the item |
| `verifiedByUserId` | UUID nullable | Clinician who reconciled it |
| `verifiedAt` | Timestamp nullable | Reconciliation time |
| `effectiveFrom` | Date/time nullable | When the clinical fact began |
| `effectiveTo` | Date/time nullable | Resolution or stop time |
| `openemrResourceType` | String nullable | OpenEMR/FHIR destination type |
| `openemrResourceId` | String nullable | External identifier for idempotency |
| `version` | Integer | Optimistic concurrency and history |
| `createdAt` / `updatedAt` | Timestamp | Operational history |
| `deletedAt` | Timestamp nullable | Soft deletion; clinical facts are not hard-deleted |

## 5. Field dictionary conventions

- **Required:** `Y` is mandatory, `R` is recommended, `C` is conditional, and `N` is optional.
- **Persistence:** `Profile` is longitudinal, `Encounter` belongs to one TeleCare visit, and `Observation` is timestamped.
- All coded fields must allow an explicit `unknown` value where clinically appropriate.
- `Prefer not to answer` is distinct from `unknown` and must not be converted to missing data.
- Patient-facing labels may be localized, but stable field keys and codes must not change between translations.

## 6. Identity and demographics

| Field key | Patient-facing label | Type / values | Required | Persistence | Current mapping |
| --- | --- | --- | --- | --- | --- |
| `legalFirstName` | First name | Text | Y | Profile | `Patient.firstName` |
| `legalMiddleName` | Middle name | Text | N | Profile | `Patient.middleName` |
| `legalLastName` | Last name | Text | Y | Profile | `Patient.lastName` |
| `preferredName` | Preferred name | Text | N | Profile | New patient field |
| `dateOfBirth` | Date of birth | Date | Y | Profile | `Patient.dateOfBirth` |
| `sexAtBirth` | Sex at birth | Approved coded values | Y | Profile | New field; do not reuse gender identity |
| `genderIdentity` | Gender / gender identity | Coded value plus self-description | N | Profile | Extend current `Patient.gender` model |
| `maritalStatus` | Marital status | Coded value | N | Profile | New field |
| `addressLine1` | Address | Text | Y | Profile | Split current `Patient.address` |
| `addressLine2` | Address line 2 | Text | N | Profile | New field |
| `city` | City | Text | Y | Profile | `Patient.city` |
| `stateProvince` | State / province | Text or code | Y | Profile | `Patient.state` |
| `postalCode` | Postal code | Text | N | Profile | New field |
| `countryCode` | Country | ISO 3166-1 alpha-2 | Y | Profile | `Patient.countryCode` |
| `primaryPhone` | Primary phone number | E.164 phone | Y | Profile | User/contact model |
| `email` | Email address | Email | Y | Profile | User/contact model |
| `occupation` | Occupation | Text plus optional code | N | Profile | New field |
| `employmentStatus` | Employment status | Coded value | N | Profile | New field |
| `employer` | Employer | Text | C | Profile | New field; show when employed |
| `preferredLanguage` | Preferred language | BCP 47 code | R | Profile | `Patient.preferredLanguage` |
| `communicationMethods` | Preferred communication methods | Multi-select | R | Profile | Map to notification preferences |
| `emergencyContactId` | Primary emergency contact | Relation | R | Profile | `EmergencyContact` |

Identity-controlled fields must follow existing identity-verification rules. Changes to legal name or date of birth may require support or clinician review rather than immediate direct editing.

## 7. Emergency and core health profile

| Field key | Patient-facing label | Type / values | Required | Persistence | Mapping / rule |
| --- | --- | --- | --- | --- | --- |
| `bloodGroup` | Blood group | `A`, `B`, `AB`, `O`, `unknown` | R | Profile | Derive from current ABO/Rh enum during migration |
| `rhesusFactor` | Rhesus factor | `positive`, `negative`, `unknown` | R | Profile | Store separately in normalized model |
| `bloodGroupVerification` | How was this blood group confirmed? | `patient_reported`, `document`, `laboratory`, `clinician` | C | Profile | New provenance field |
| `haemoglobinGenotype` | Haemoglobin genotype | `AA`, `AS`, `AC`, `SS`, `SC`, `CC`, `other`, `unknown` | R | Profile | Replace unconstrained genotype text over time |
| `genotypeVerification` | How was this genotype confirmed? | Source plus date | C | Profile | New provenance field |
| `disabilityStatus` | Do you have a disability or access need? | `none`, `yes`, `prefer_not_to_answer`, `unknown` | R | Profile | Extend `PatientMedicalInfo` |
| `disabilityTypes` | Disability type | Multi-select coded list | C | Profile | New repeatable/access-needs model |
| `functionalLimitations` | How does this affect daily activities or care? | Multi-select plus text | C | Profile | New structured field |
| `assistiveDevices` | Assistive devices used | Repeatable coded/text entry | C | Profile | New structured field |
| `communicationNeeds` | Communication assistance needed | Multi-select plus text | C | Profile | New structured field |
| `careAccommodations` | Accommodations needed for appointments | Multi-select plus text | C | Profile | New structured field |
| `activeCarePlan` | Current care plan | Long text | N | Profile | `PatientMedicalInfo.activeCarePlan` |
| `clinicalProfileNotes` | Other important health information | Long text | N | Profile | `PatientMedicalInfo.notes`; never substitute for structured lists |

`Haemoglobin genotype` is the required clinical label. The generic label `genotype` is ambiguous and could imply broader genetic testing.

## 8. Conditions

Use repeatable `PatientCondition` records. The current `chronicConditions: String[]` remains a compatibility summary generated from active records.

| Field key | Type / values | Required | Notes |
| --- | --- | --- | --- |
| `hasConditionHistory` | Yes / no / unknown | Y | Branching question |
| `conditionCode` | SNOMED CT or approved code | C | Store code system and display text |
| `conditionText` | Text | C | Required when no code is selected |
| `diagnosedDate` | Partial date | N | Support year, month/year, or full date |
| `clinicalStatus` | `active`, `recurrence`, `relapse`, `inactive`, `remission`, `resolved`, `unknown` | C | Patient-friendly labels in UI |
| `treatmentSummary` | Text | N | Patient-reported current treatment |
| `comments` | Long text | N | Context only |

Suggested picker groups include hypertension, diabetes, asthma, cardiovascular disease, kidney disease, liver disease/hepatitis, thyroid disease, hyperlipidaemia, stroke/TIA, seizure disorder, cancer, arthritis, autoimmune disease, blood disorder, gastrointestinal disease, mental or behavioural health condition, infectious disease, and Other.

## 9. Procedures and hospitalizations

### 9.1 Procedure entry

| Field key | Type | Required |
| --- | --- | --- |
| `hasProcedureHistory` | Yes / no / unknown | Y |
| `procedureCode` / `procedureText` | Code plus display or text | C |
| `performedDate` | Partial date | C |
| `facilityName` | Text | N |
| `reason` | Text | N |
| `hadComplications` | Yes / no / unknown | N |
| `complicationDetails` | Long text | C |

### 9.2 Hospitalization entry

| Field key | Type | Required |
| --- | --- | --- |
| `hasHospitalizationHistory` | Yes / no / unknown | Y |
| `reason` | Text | C |
| `admissionDate` | Partial date | C |
| `dischargeDate` | Partial date | N |
| `facilityName` | Text | N |
| `outcome` | Long text | N |

## 10. Medications, supplements, and traditional medicines

Use repeatable `PatientMedication` records. Do not represent patient-reported medicines as clinician prescriptions or FHIR `MedicationRequest` until the OpenEMR reconciliation design is approved.

| Field key | Type / values | Required | Notes |
| --- | --- | --- | --- |
| `takesCurrentMedication` | Yes / no / unknown | Y | Branching question |
| `category` | `prescription`, `otc`, `vitamin`, `supplement`, `herbal`, `traditional`, `other` | C | Required per entry |
| `medicationCode` | RxNorm or approved local code | N | Preserve code system |
| `medicationName` | Text | C | Required per entry |
| `strength` | Quantity plus unit or text | N | Do not merge with dose |
| `dose` | Quantity plus unit or text | N | Patient-reported |
| `frequency` | Structured timing plus display | N | Support PRN/as-needed |
| `route` | Coded route | N | Oral, topical, inhaled, etc. |
| `reason` | Text | N | Indication |
| `prescriberName` | Text | N | Not assumed to be an HHA provider |
| `startDate` | Partial date | N | |
| `endDate` | Partial date | N | |
| `status` | `active`, `stopped`, `completed`, `unknown` | C | |

### 10.1 Immunizations

Immunizations already appear in the basic profile model but are absent from the source questionnaire. Phase 0 must decide whether Release 1 collects them. If included, use repeatable records rather than an unqualified string array.

| Field key | Type / values | Required | Notes |
| --- | --- | --- | --- |
| `vaccineCode` / `vaccineText` | CVX, approved local code, or text | C | Preserve code system |
| `administrationDate` | Partial or full date | N | Distinguish exact from approximate |
| `doseNumber` | Text or integer | N | Support named doses and boosters |
| `status` | `completed`, `not_done`, `unknown` | C | |
| `facilityName` | Text | N | |
| `documentRecordId` | UUID relation | N | Evidence retained in MyVault+ |
| `verificationStatus` | Common verification enum | C | |

## 11. Allergies and swelling history

Use repeatable `PatientAllergy` records. The current `allergies: String[]` remains a compatibility summary generated from active entries.

| Field key | Type / values | Required | Notes |
| --- | --- | --- | --- |
| `allergyCategory` | `medication`, `food`, `environment`, `biologic`, `other` | C | Separate branch answers can create entries |
| `allergenCode` / `allergenText` | Code plus display or text | C | |
| `reactionCodes` / `reactionText` | Multi-select plus text | C | Reaction must not be lost |
| `severity` | `mild`, `moderate`, `severe`, `life_threatening`, `unknown` | C | |
| `firstIdentified` | Partial date or age | N | Preserve which representation was entered |
| `clinicalStatus` | `active`, `inactive`, `resolved`, `unknown` | C | |
| `verificationStatus` | Common verification enum | C | |
| `noKnownAllergies` | Boolean with timestamp/source | Y | Mutually exclusive with active allergy entries |

Swelling history is a separate safety history, not automatically an allergy:

| Field key | Type | Required |
| --- | --- | --- |
| `unexplainedAngioedemaHistory` | Yes / no / unknown | R |
| `swellingLocations` | Face / lips / tongue / throat / other | C |
| `episodeFrequency` | Structured frequency or text | C |
| `knownTriggers` | Multi-select plus text | N |
| `typicalDuration` | Duration | N |
| `breathingDifficulty` | Yes / no / unknown | C |
| `swallowingDifficulty` | Yes / no / unknown | C |
| `receivedEmergencyTreatment` | Yes / no / unknown plus details | C |
| `familyHistoryOfSwelling` | Yes / no / unknown plus relationship | N |

## 12. Family history

Use repeatable `FamilyHistoryItem` records.

| Field key | Type / values | Required |
| --- | --- | --- | --- |
| `hasSignificantFamilyHistory` | Yes / no / unknown | R |
| `relationship` | Parent, sibling, child, grandparent, other | C |
| `maternalPaternalSide` | `maternal`, `paternal`, `not_applicable`, `unknown` | N |
| `conditionCode` / `conditionText` | Code plus display or text | C |
| `ageAtDiagnosis` | Number or approximate text | N |
| `deceased` | Yes / no / unknown | N |
| `ageAtDeath` | Number | C |
| `comments` | Long text | N |
| `conditionsRunningInFamily` | Long text | N |

## 13. Social and lifestyle history

Store time-varying responses as versioned `SocialHistoryItem` records rather than overwriting prior answers.

| Field key | Type / values | Required |
| --- | --- | --- | --- |
| `nicotineUseStatus` | `current`, `former`, `never`, `unknown`, `prefer_not_to_answer` | R |
| `nicotineProducts` | Multi-select plus other | C |
| `nicotineAmount` | Quantity/frequency | C |
| `nicotineDuration` | Duration | N |
| `nicotineQuitDate` | Partial date | C |
| `alcoholUseStatus` | `current`, `former`, `never`, `unknown`, `prefer_not_to_answer` | R |
| `alcoholFrequency` | Structured frequency | C |
| `alcoholTypicalAmount` | Number plus serving type | C |
| `recreationalDrugUse` | Yes / no / unknown / prefer not to answer | R |
| `recreationalDrugDetails` | Multi-select plus text | C |
| `exerciseFrequency` | Structured frequency | N |
| `exerciseTypes` | Multi-select plus text | N |
| `exerciseDaysPerWeek` | Integer 0-7 | C |
| `exerciseMinutesPerSession` | Integer minutes | C |
| `dietDescription` | Multi-select plus text | N |
| `hasDietaryRestrictions` | Yes / no / unknown | N |
| `dietaryRestrictionDetails` | Multi-select plus text | C |
| `sleepHours` | Decimal hours | N |
| `sleepQuality` | Very poor / poor / fair / good / very good | R |
| `sleepDifficulty` | Yes / no / unknown | N |
| `snoringOrDaytimeSleepiness` | Yes / no / unknown | N |
| `workActivity` | Long text | N |
| `recentTravel` | Yes / no | N |
| `travelLocationsAndDates` | Repeatable place/date | C |
| `hazardExposure` | Yes / no / unknown | N |
| `hazardDetails` | Multi-select plus text | C |
| `livingArrangement` | Coded value plus text | N |
| `supportPersons` | Text / linked contacts | N |

Sensitive social-history answers require purpose-limited access, explicit privacy copy, and `Prefer not to answer` options.

## 14. Visit-specific reason and history of present illness

Store these fields on `TelecareIntake`, linked to an appointment and optionally a TeleCare session.

| Field key | Type / values | Required | Logic |
| --- | --- | --- | --- |
| `reasonForVisit` | Long text | Y | Primary patient narrative |
| `chiefConcern` | Text | Y | Short clinician summary label |
| `onsetDate` | Date | C | Exact date when known |
| `onsetDuration` | Quantity plus unit | C | Alternative to exact date |
| `onsetCertainty` | Exact / approximate / unknown | C | |
| `onsetPattern` | Sudden / gradual / unsure | R | |
| `course` | Better / worse / unchanged / fluctuating / unsure | R | |
| `bodyLocations` | Coded body site plus text | C | Repeatable |
| `symptomQualities` | Multi-select plus text | C | Symptom-specific options |
| `severity` | Integer 0-10 | C | Only where clinically appropriate |
| `timingPattern` | Constant / intermittent / unsure | R | |
| `episodeFrequency` | Structured frequency | C | Show for intermittent symptoms |
| `episodeDuration` | Duration | C | Show for intermittent symptoms |
| `relievingFactors` | Long text | N | |
| `aggravatingFactors` | Long text | N | |
| `associatedSymptoms` | Symptom picker plus text | R | |
| `hadBefore` | Yes / no / unsure | R | |
| `priorEpisodeDetails` | Long text | C | |
| `previouslyAssessed` | Yes / no / unsure | R | |
| `previousProviderFacility` | Text | C | |
| `previousAssessmentDate` | Partial date | C | |
| `priorTreatment` | Repeatable text/medication link | C | |
| `priorTreatmentResponse` | Helped / partly / no / unsure | C | |
| `additionalProblemNarrative` | Long text | N | |

## 15. Review of systems

Use a stable symptom catalog rather than one database column per symptom. Each response stores `systemCode`, `symptomCode`, `answer`, and optional details. `None reported` must be mutually exclusive with positive symptoms in the same system.

| System code | Initial symptom set |
| --- | --- |
| `general` | Fever, chills, weight change, fatigue, night sweats |
| `eyes` | Vision change, eye pain, redness, discharge |
| `ent` | Hearing change, ear pain/discharge, nasal symptoms, sore throat, swallowing difficulty |
| `cardiovascular` | Chest pain, palpitations, fainting, leg swelling |
| `respiratory` | Shortness of breath, cough, wheeze, coughing blood |
| `gastrointestinal` | Abdominal pain, nausea/vomiting, diarrhoea, constipation, blood in stool, heartburn |
| `genitourinary` | Painful urination, frequency, urgency, blood in urine, leakage, other concern |
| `musculoskeletal` | Joint pain/swelling, muscle pain, weakness, morning stiffness |
| `skin` | Rash, itching, wounds, colour change, unexplained swelling |
| `neurologic` | Headache, dizziness, weakness, numbness/tingling, tremor, seizure, balance problem |
| `endocrine` | Heat/cold intolerance, excessive thirst, excessive urination, unexpected weight change |
| `haematologic` | Easy bruising, unusual bleeding, swollen glands |
| `allergy_immune` | Recurrent allergies, hives, facial/lip/tongue swelling, frequent infections |
| `mental_emotional` | Anxiety, low mood, unusual stress, sleep-related emotional concerns, other concern |

Positive symptoms may collect onset, duration, frequency, severity, body location, functional impact, and patient comment. Age- and sex-relevant branching must be clinically approved and must not infer gender identity from sex at birth.

## 16. Recent investigations and shared documents

Use repeatable `PatientInvestigation` records linked to zero or more `ClinicalRecord` documents and to the encounter intake.

| Field key | Type | Required |
| --- | --- | --- |
| `hasRecentInvestigations` | Yes / no / unknown | Y |
| `investigationType` | Coded type plus text | C |
| `performedDate` | Partial date | C |
| `facilityName` | Text | N |
| `reason` | Text | N |
| `patientReportedResult` | Long text | N |
| `clinicalRecordIds` | Relation list | N |
| `shareStatus` | Not shared / shared / revoked / expired | C |

The patient must intentionally select documents for a specific consultation. Uploading a document to MyVault+ must not automatically expose it to every provider. The clinician view must display source, document type, service date, upload date, sharing state, and whether the document was patient-uploaded or provider-generated.

## 17. Measurements and vitals

Reuse `VitalsReading` as the timestamped source. The Health Profile displays the latest suitable observation; it must not copy a value into an unversioned profile field as the sole source of truth.

| Field key | Type / unit | Validation guidance | OpenEMR target |
| --- | --- | --- | --- |
| `systolicBp` | Integer mmHg | Plausibility warning; do not silently reject emergency values | Observation/vitals |
| `diastolicBp` | Integer mmHg | Must be paired with systolic when entered | Observation/vitals |
| `heartRate` | Integer beats/min | Source and time required | Observation/vitals |
| `temperature` | Decimal plus C/F | Normalize to Celsius, retain entered unit | Observation/vitals |
| `weight` | Decimal plus kg/lb | Normalize to kg, retain entered unit | Observation/vitals |
| `height` | Decimal plus cm/m/ft-in | Normalize to cm, retain entered unit | Observation/vitals |
| `bmi` | Calculated decimal | Derive from same/compatible height and weight; do not patient-edit | Derived observation or UI only |
| `spo2` | Decimal percent | Time and source required | Observation/vitals |
| `bloodGlucose` | Decimal plus unit | Record mg/dL or mmol/L and fasting/random context | Observation |
| `measurementSource` | Home device / patient estimate / clinic / other | Required per reading | Provenance |
| `recordedAt` | Timestamp | Required for time-varying measurements | Observation effective time |

Exact hard limits and warning limits require clinical approval. Values outside soft plausibility ranges should prompt confirmation rather than disappear.

## 18. Patient goals, confirmation, and consent

| Field key | Type | Required | Rule |
| --- | --- | --- | --- |
| `additionalHealthInformation` | Long text | N | Encounter-specific narrative |
| `consultationGoal` | Long text | Y | Included in pre-visit summary |
| `questionsForProvider` | Long text | N | |
| `accuracyConfirmed` | Checkbox | Y | Store statement version and timestamp |
| `recordUseAcknowledged` | Checkbox | Y | Store statement version and timestamp |
| `changeDutyAcknowledged` | Checkbox | Y | Store statement version and timestamp |
| `telecareConsentId` | Consent relation | Y | Must reference approved consent version |
| `acknowledgedPatientName` | Pre-populated acknowledgement | Y | Capture exact displayed name |
| `submittedAt` | System timestamp | Y | Immutable |

Consent evidence must include policy/statement version, locale, granted status, timestamp, user ID, IP address where lawful, and user agent. Consent withdrawal must not delete the historical legal evidence for a prior consultation.

## 19. Proposed database additions

Names are conceptual and should be finalized against repository conventions.

| Model | Purpose | Key relationships |
| --- | --- | --- |
| `QuestionnaireDefinition` | Stable questionnaire identity | Has many versions |
| `QuestionnaireVersion` | Immutable schema, labels, options, rules, consent references | Definition, submissions |
| `TelecareIntake` | Draft/submission workflow and encounter link | Patient, appointment, session, version |
| `TelecareIntakeAnswer` | Queryable answer values | Intake, question key; submitted rows immutable |
| `TelecareIntakeSnapshot` | Canonical immutable JSON plus cryptographic hash | One per submission/amendment |
| `ClinicalReconciliation` | Clinician action on a submitted answer/item | Intake, answer/source, target clinical record |
| `PatientCondition` | Repeatable condition history | Patient, reconciliation, external ID |
| `PatientMedication` | Patient-reported and verified medicines | Patient, reconciliation, external ID |
| `PatientAllergy` | Allergen, reaction, severity, status | Patient, reconciliation, external ID |
| `PatientProcedure` | Procedure history | Patient, reconciliation, external ID |
| `PatientHospitalization` | Admission history | Patient, reconciliation, external ID |
| `FamilyHistoryItem` | Relative-condition relationship | Patient, reconciliation |
| `SocialHistoryItem` | Versioned lifestyle fact | Patient, reconciliation |
| `PatientAccessNeed` | Disability, functional, communication, and accommodation needs | Patient |
| `PatientInvestigation` | Patient-reported recent test metadata | Patient, intake, documents |

For Release 1, `TelecareIntakeAnswer` may use typed nullable columns (`stringValue`, `numberValue`, `booleanValue`, `dateValue`, `codedValue`, `jsonValue`) while the immutable snapshot preserves the exact submitted structure. Do not rely on a mutable JSON blob alone for clinically important facts.

## 20. Questionnaire workflow and state model

| State | Allowed actions | Data behavior |
| --- | --- | --- |
| `draft` | Patient edits, saves, resumes, abandons | Mutable with optimistic locking |
| `submitted` | Patient views; clinician reviews | Immutable submission snapshot created |
| `under_review` | Clinician verifies individual items | Original answers remain unchanged |
| `reconciled` | Clinician completes review | Accepted/amended items point to normalized records |
| `superseded` | New corrected submission references prior version | Prior submission remains readable |
| `cancelled` | Authorized workflow cancellation | Never physically deleted |

### Returning patient flow

1. Load the latest Health Profile and label the last review date for each section.
2. Ask whether anything changed since the prior review.
3. Show only changed or clinically required sections by default, with access to the full profile.
4. Copy no prior visit-specific HPI, symptoms, ROS, or goals into a new encounter as current answers.
5. Preserve the prior profile values and create versioned changes.

### Save and Resume

- Save after field blur or a short debounce and on section navigation.
- Use `revision` or `updatedAt` for optimistic concurrency.
- Return section completeness and validation errors separately.
- Do not mark a section complete merely because it was opened.
- A draft expiry policy must be approved; expiry must not delete submitted records.
- Do not store PHI in browser local storage. Offline drafts require a separately approved encrypted design.

## 21. API surface

Exact route names may be adjusted to existing NestJS conventions.

| Method and route | Purpose |
| --- | --- |
| `GET /patient/health-profile` | Return normalized profile, provenance, verification, and section freshness |
| `PATCH /patient/health-profile/demographics` | Update patient-editable demographic fields |
| `POST /patient/health-profile/{resource}` | Add repeatable condition, medication, allergy, etc. |
| `PATCH /patient/health-profile/{resource}/:id` | Version a patient-entered clinical item |
| `GET /questionnaires/telecare-intake/current` | Return current active questionnaire version |
| `POST /patient/telecare-intakes` | Create or resume an intake for an appointment; idempotent |
| `GET /patient/telecare-intakes/:id` | Return authorized draft or submitted response |
| `PATCH /patient/telecare-intakes/:id/answers` | Save a draft answer batch with revision check |
| `POST /patient/telecare-intakes/:id/documents` | Attach/share selected MyVault+ records |
| `POST /patient/telecare-intakes/:id/submit` | Validate, freeze, hash, timestamp, and submit |
| `GET /clinician/telecare-intakes/:id/summary` | Return pre-visit summary and verification queue |
| `GET /clinician/telecare-intakes/:id/responses` | Return complete original submission |
| `POST /clinician/telecare-intakes/:id/reconciliations` | Accept, amend, reject, or defer selected items |
| `POST /clinician/telecare-intakes/:id/complete-review` | Close review and enqueue approved sync operations |

Every mutation endpoint must enforce ownership/role authorization, idempotency where relevant, validation, audit logging, and redaction-safe error handling.

## 22. OpenEMR mapping and reconciliation

All mappings remain provisional until tested against the deployed OpenEMR version in DEV.

| MyVault+ data | Preferred target | Reconciliation rule |
| --- | --- | --- |
| Identity and demographics | FHIR Patient or approved REST patient fields | Identity-sensitive changes may require manual review |
| Conditions | FHIR Condition or OpenEMR problem list | Clinician acceptance required |
| Patient-reported medications | MedicationStatement if supported; otherwise reviewed OpenEMR medication workflow | Never create a prescription from patient report |
| Clinician medication order | MedicationRequest | Existing clinician/order workflow remains canonical |
| Allergies | FHIR AllergyIntolerance / OpenEMR allergy list | Reaction and severity must survive mapping; clinician acceptance required |
| Procedures | FHIR Procedure or OpenEMR history | Clinician acceptance required |
| Hospitalizations | FHIR Encounter or history form | Do not create a billable/current encounter from historical patient report |
| Family history | FamilyMemberHistory or approved history form | Verify actual API/table support |
| Social history | Observation or approved history form | Sensitive items require scoped access |
| Visit HPI and ROS | Encounter-specific OpenEMR form/note | Store original submission separately; clinician note remains distinct |
| Vitals | FHIR Observation | Source and effective time required; retain patient-entered flag |
| Investigations | DiagnosticReport/ServiceRequest metadata as appropriate | Do not treat patient narrative as verified result |
| Documents | DocumentReference / OpenEMR documents | Reuse MyVault+ sharing; preserve source and consent |
| Questionnaire submission | QuestionnaireResponse if supported, otherwise versioned document/form | Immutable source record |
| Consent | Consent or approved OpenEMR consent workflow | Preserve exact policy version and evidence |

### Required DEV probes

1. Confirm deployed OpenEMR version and enabled REST/FHIR routes.
2. Confirm create/update/search behavior for Condition, AllergyIntolerance, MedicationStatement or alternative, Procedure, QuestionnaireResponse, Consent, and DocumentReference.
3. Verify OpenEMR identifiers returned for idempotent updates.
4. Verify which resources preserve provenance, reaction, severity, effective date, and patient-reported status.
5. Confirm field-level conflict behavior when a clinician edits an item in OpenEMR after portal reconciliation.
6. Confirm scopes available to the existing OAuth client.
7. Record unsupported mappings and approve the fallback OpenEMR forms or document workflow.

## 23. Clinician pre-visit summary

The default summary contains:

- Reason for visit and chief concern.
- Onset, duration, course, severity, and key associated symptoms.
- Safety-rule flags, clearly labelled as patient responses rather than diagnoses.
- Relevant active conditions and procedure/hospitalization history.
- Current patient-reported and verified medications, visibly distinguished.
- Allergies with reaction and severity.
- Relevant family and social history.
- Positive review-of-systems answers; negatives remain available in the full response.
- Recent investigations and explicitly shared documents.
- Recent vitals with source and measurement time.
- Patient goal and questions.
- Items awaiting clinician verification.

Release 1 should use deterministic templates. If an AI-generated narrative is later introduced, it must be secondary to the structured summary, cite the source responses, never alter the original, and undergo separate clinical safety validation.

## 24. Safety and escalation

The questionnaire is not an emergency diagnostic tool. Safety rules only identify responses requiring immediate messaging or operational escalation.

Potential triggers include severe chest pain, severe breathing difficulty, coughing blood, fainting with current symptoms, signs of stroke, uncontrolled bleeding, seizure in progress/recent first seizure, severe allergic reaction or face/tongue/throat swelling, suicidal thoughts or immediate danger, and critical patient-entered measurements.

For each approved trigger, define:

- Exact question keys and answer conditions.
- Patient message approved by the clinical and legal teams.
- Whether the intake may continue after the message.
- Whether an operations or clinician alert is created.
- Target response time and escalation owner.
- Behavior outside service hours.
- Country/location-aware emergency instructions.
- Audit event and notification-delivery evidence.

The system must not falsely promise active monitoring. Urgent care access must never be blocked because an intake is incomplete.

## 25. Privacy, security, and data integrity

- Apply existing role-based access and patient ownership checks to every endpoint.
- Encrypt PHI in transit and at rest; prohibit PHI in URLs, analytics payloads, logs, and exception messages.
- Record views, exports, document shares, submissions, reconciliation actions, and OpenEMR writes in the audit trail.
- Store changed field keys and safe before/after references in audit metadata; avoid duplicating unnecessary PHI in logs.
- Preserve immutable snapshots and hashes for submitted questionnaires.
- Use soft deletion and supersession for clinical records.
- Scan uploaded files, validate MIME type and size, and serve through authorized short-lived access.
- Apply least-privilege OpenEMR scopes and server-to-server access only.
- Complete privacy review against applicable HHA policy and jurisdictions, including Nigeria Data Protection Act requirements and any contractual health-data obligations.
- Define rules for minors, guardians, proxy access, capacity, and confidential adolescent information before supporting those populations.

## 26. Release plan

### Phase 0: Clinical and technical discovery (2-3 weeks)

- Approve data dictionary, terminology, value sets, required fields, and safety rules.
- Inventory exact current UI/API/database coverage.
- Run OpenEMR DEV capability probes.
- Define source-of-truth and conflict-resolution policy.
- Approve consent text, minors/proxy scope, retention, and access rules.
- Produce final UX flows and API contracts.

**Exit:** Signed clinical mapping, privacy review, OpenEMR test evidence, and Release 1 backlog.

### Release 1A: Longitudinal profile foundation (3-5 weeks)

- Add normalized conditions, medications, allergies, procedures, hospitalizations, access needs, and family/social history.
- Migrate or project existing arrays into compatibility summaries without data loss.
- Add provenance and verification labels.
- Upgrade Health Profile review/edit experience.
- Keep all new clinical items patient-reported pending reconciliation.

**Exit:** Returning patients can review and update a structured profile; original values and changes remain auditable.

### Release 1B: TeleCare intake workflow (4-6 weeks, may overlap 1A)

- Versioned questionnaire definition and draft/submission models.
- Mobile-first sections, conditional logic, progress, and Save and Resume.
- HPI, ROS, investigations, goals, acknowledgements, and document selection.
- Immutable submission and deterministic clinician summary.
- Appointment/session status integration without blocking urgent access.

**Exit:** New and returning patients can submit an intake tied to a TeleCare appointment, and clinicians can view the summary plus complete responses.

### Release 1C: Reconciliation and OpenEMR (3-5 weeks)

- Clinician accept/amend/reject/defer workflow.
- Approved OpenEMR mappings, queue jobs, retries, idempotency, and conflict handling.
- Sync status visibility and operational error handling.
- DEV and QA end-to-end validation with representative patient records.

**Exit:** Only clinician-approved items reach approved OpenEMR destinations, with traceable acknowledgements and no silent overwrites.

### Release 2: Clinical breadth and optimization

- Additional specialty-specific questionnaires.
- Localization and accessibility refinements.
- Enhanced coded terminology search.
- Patient profile freshness reminders.
- Advanced operational analytics using non-PHI event data.
- Carefully governed AI-assisted summary as an optional secondary view.

### Indicative staffing

The sequence assumes two frontend engineers, two backend/integration engineers, one QA engineer, and part-time product, UX, clinical informatics, security/privacy, and OpenEMR specialists. Calendar estimates will increase if OpenEMR custom-module work, offline mode, native mobile parity, or multi-jurisdiction consent is required in Release 1.

## 27. Measurable acceptance criteria

### Patient experience

- A patient can start on mobile, resume on another authenticated device, and submit without losing acknowledged saves.
- Conditional fields remain hidden unless their trigger is met and do not leave stale active answers after a trigger changes.
- Required-field errors identify the section and question in plain language.
- Returning patients can confirm an unchanged profile without re-entering every item.
- The questionnaire does not block access to emergency guidance or urgent-care contact paths.

### Data integrity

- Every submission stores questionnaire version, patient, appointment where applicable, exact timestamp, snapshot hash, and consent evidence.
- Submitted answers cannot be modified in place.
- Every reconciled clinical item identifies its source answer, clinician, action, and time.
- Concurrent draft edits produce a recoverable conflict response rather than last-write-wins loss.
- Duplicate submit requests with the same idempotency key create one submission.

### Clinical workflow

- Clinicians can view the concise summary and the complete original responses.
- Patient-reported and clinician-verified information are visually distinct.
- Allergies display allergen, reaction, severity, source, and verification status.
- Medication reconciliation cannot create a prescription without an explicit clinician ordering action.
- Safety triggers produce the approved patient message and required operational audit event.

### OpenEMR integration

- Each supported resource is proven in DEV for create/read/update/search or has an approved fallback.
- Retried jobs are idempotent and do not create duplicate OpenEMR entries.
- External identifiers and acknowledgements are persisted.
- Conflicting clinician-authored OpenEMR changes are surfaced for review and not overwritten automatically.
- Integration failure leaves the MyVault+ submission intact and visible with a recoverable sync status.

### Quality and accessibility

- Automated tests cover conditional rules, validation, authorization, state transitions, idempotency, and mapping transforms.
- End-to-end tests cover new patient, returning patient, incomplete intake, urgent response, document share, reconciliation, retry, and conflict scenarios.
- Keyboard navigation, labels, focus order, contrast, zoom, screen-reader announcements, and error summaries meet the approved accessibility target.
- QA confirms no regression to current profile, TeleCare booking/session, document sharing, vitals, consent, and OpenEMR pull workflows.

## 28. Decisions required before implementation

1. Which patient populations are supported in Release 1: adults only, minors with guardians, or both?
2. Which jurisdictions and consent/privacy policies apply at launch?
3. Which terminology sets and licenses are approved: SNOMED CT, RxNorm, LOINC, ICD-10, local catalogs, or a combination?
4. Is OpenEMR authoritative immediately after clinician verification, or does MyVault+ retain shared ownership for selected resources?
5. Which urgent-response rules, messages, staffing model, and response times are clinically approved?
6. Which profile sections are required before a routine consultation, and which are always optional?
7. What is the approved retention period for abandoned drafts and submitted questionnaires?
8. Will Release 1 support only deterministic summaries?
9. Which OpenEMR resources are writable in the deployed DEV instance, and what fallback is approved for unsupported resources?
10. What is the migration policy for existing allergy, chronic-condition, and medication arrays?

## 29. Recommended immediate next step

Run Phase 0 as a short, evidence-producing workstream. The first engineering output should be an OpenEMR capability matrix and current-state field mapping. The first clinical output should be approval of value sets, emergency rules, required/optional status, and reconciliation ownership. Implementation should begin only after those two outputs agree.
