Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

# **UNIVERSAL PATIENT REGISTRATION AND DYNAMIC PARTNER ROUTING** 

## **Detailed Step-by-Step Developer Implementation Guide** 

**Health-Hub Africa® | MyHealth Vault+™ | OpenEMR 8.2** 

One registration endpoint. Dynamic partner attribution. Partner-scoped patient access and forms. Prepared for: Development, DevOps, QA, Product, Clinical Informatics 

Date: 13 August 2026 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

## **1. Executive Summary** 

Health-Hub Africa (HHA) will use one canonical MyHealth Vault+ patient registration experience for all patients, regardless of whether the patient discovers HHA directly or is referred by CRQ, Dr. Rao ENT Clinic, or any future partner. Partner routing must be dynamic and data-driven. The system must not require a separate registration page, duplicated signup workflow, or manually maintained registration application for each partner. 

The registration experience remains universal. Partner attribution happens through validated referral information and backend routing rules. After registration, the patient's active partner assignment determines provider visibility, partnerspecific forms, service context, and downstream clinical workflows. 

## **2. Core Design Principle** 

**ONE MyHealth Vault+ registration endpoint -> dynamic routing -> correct patient pool -> correct provider access -> correct partner forms.** 

The registration URL is a product endpoint, not a partner endpoint. Referral codes, QR tokens, provider referral records, administrative assignments, and service context are attribution mechanisms only. 

## **3. Current Production Architecture to Preserve** 

|**Object**|**Current Value**|**Purpose**|
|---|---|---|
|HHA default pool|HHA_INTERNAL|Default destination for normal or<br>unresolvedpatient registrations.|
|CRQ partner code|CRQ|CRQ partner organization.|
|CRQfacility|Facility16|CRQPartner Clinical Services.|
|CRQ provider|Provider 22 / crq_lekole|Dr. Liza Ekole.|
|Dr. Rao partner code|DR_RAO_ENT|Dr. Rao ENT Clinic partner<br>organization.|
|Dr. Rao facility|Facility17|Dr. Rao ENT Clinic Partner Services.|
|Dr. Raoprovider|Provider 16 / drrao|Dr. Rao ENT.|
|Partner-provider mapping|hha_partner_provider|Maps provider accounts to partner<br>organizations.|
|Patient-partner assignment|hha_patient_partner_assignment|Defines patient pool / partner<br>relationship.|
|Provider-patient access|hha_provider_patient_access|Enforcement table for partner patient<br>visibility.|
|Referral definitions|hha_partner_referral_code|Maps referral codes to partner and<br>optionalprovider.|
|Referral audit|hha_partner_referral_audit|Captures referral/routingevents.|
|Routing engine|hha_route_patient_referral|Current OpenEMR-side patient routing<br>procedure.|



## **4. Target User Experience** 

Every patient starts from the same registration experience. 

|**Scenario**|**Patient Experience**|**Backend Result**|
|---|---|---|
|Direct HHA signup|Uses normal MyHealth Vault+<br>registration.|Route to HHA_INTERNAL.|
|CRQ referral|Uses same registration page; enters or<br>carries CRQreferral code.|Route to CRQ; create permitted<br>provider access.|
|Dr. Liza direct referral|Same registration page; provider-<br>specific referral attribution.|Route to CRQ and attribute provider<br>22.|
|Dr. Rao ENT referral|Same registrationpage;referral|Route to DR_RAO_ENT andprovider 16|



CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

||Health-Hub Africa®|MyH|ealth Vault+™|Universal Registration & Partner Routing|
|---|---|---|
||attribution.|where applicable.|
|Future partner|Same registration page.|Resolve partner dynamically from<br>referral configuration.|
|Invalid/expired referral|Registration still completes.|Route safely to HHA_INTERNAL and<br>audit for review.|



## **5. Universal Registration Endpoint** 

The development team must define one canonical route in the MyHealth Vault+ patient portal, for example /register or the existing equivalent. All marketing, partner, QR, referral, and patient communications must ultimately land on this same route. 

- Do not create /register/crq, /register/rao, /partner/crq/signup, or similar partner-specific registration applications. 

- Do not fork the registration form by partner. 

- Do not duplicate registration validation logic. 

- Do not require HHA operations staff to maintain a different registration page for every new partner. 

- Partner-specific presentation, if desired later, must be a dynamic configuration overlay on the same registration component. 

## **6. Referral Attribution Methods** 

The universal registration flow must support multiple attribution methods without changing the registration URL architecture. 

|**Method**|**Example**|**Required Behavior**|
|---|---|---|
|Manual referral code|Patient enters CRQ-REFERRAL|Validate server-side and persist<br>referral context.|
|QR code|QR opens registration with opaque<br>token|Prefill referral context; same<br>registrationpage.|
|Provider referral message|Provider sends code or invite|Resolve optional provider_id from<br>code.|
|Staff assignment|HHA staff routes patient after<br>registration|Use admin routing workflow and audit.|
|Service-driven referral|Patient books a partner-scoped<br>service|May add/confirm partner relationship<br>perpolicy.|
|No referral|Public registration|Route to HHA_INTERNAL.|



## **7. Registration Screen Requirements** 

The initial implementation should keep the patient experience simple. 

- Include an optional question: 'Were you referred by a healthcare provider or partner?' 

- If Yes, display a Referral Code field. 

- If a valid referral token was already supplied by QR/link context, prefill it or store it silently and show a friendly confirmation such as 'Referral recognized'. 

- Do not display internal partner_id, provider_id, facility_id, ACL group, or database identifiers to patients. 

- Do not let the browser decide the destination partner. 

- Registration must not fail simply because a referral code is invalid; route safely to HHA_INTERNAL and flag the issue. 

## **8. Frontend Implementation - Step by Step** 

1. Identify the existing canonical registration route/component in MyHealth Vault+. 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

2. Add an optional referralContext object to the registration state. It should contain only client-safe information such as entered token and a validation status. 

3. Accept an optional query parameter such as ref or referral_token only as an input hint. Do not treat it as authorization. 

4. On page load, if a referral token is present, send it to the backend referral-validation endpoint. 

5. If valid, show a non-sensitive acknowledgement to the patient. Example: 'Referral recognized: CRQ'. Do not expose provider database IDs. 

6. If invalid, allow the patient to continue; show neutral guidance such as 'We could not validate this referral code. You may continue registration or contact the referring provider.' 

7. Preserve the referral token through the full signup journey, including email/OTP verification and multi-step forms. 

8. On final registration submission, send the referral token with the registration payload to the portal backend. 

9. Do not call OpenEMR directly from browser JavaScript. 

10. After registration completes and OpenEMR PID is resolved, display the normal account-created confirmation. Partner routing should be transparent unless product wants a friendly 'referred by' label. 

## **9. Backend Portal Implementation - Step by Step** 

1. Add a referral validation service in the MyHealth Vault+ backend. 

2. Normalize the supplied token: trim whitespace; preserve case policy consistently; reject oversized or malformed values. 

3. Call the HHA clinical integration service or approved OpenEMR API endpoint to validate referral state. Do not grant direct SQL access from the portal server to production OpenEMR unless specifically approved. 

4. Create the portal patient account using the normal registration workflow. 

5. Create or resolve the corresponding OpenEMR patient and capture the OpenEMR PID. 

6. Invoke the routing service using patient PID, referral token, source='patient_portal', and a system/service actor identifier. 

7. Receive the assigned pool, routing result, and optional provider attribution. 

8. Persist the routing outcome in the portal's integration/audit record so operational staff can trace the registration. 

9. If the routing call fails technically, do not guess a partner. Place the patient in an integration-review state and retry safely; the clinical backend must fail closed. 

10. Return a patient-safe response to the frontend without exposing clinical database internals. 

## **10. Clinical Routing Service / OpenEMR Integration** 

The current routing model in OpenEMR already supports referral validation, HHA_INTERNAL fallback, partner assignment, provider-patient access creation, use-count handling, and referral audit. The portal should invoke this capability through an HHA-controlled service/API layer. 

### **10.1 Required Service Contract** 

|**Field**|**Direction**|**Requirement**|
|---|---|---|
|patient_pid|Request|Resolved OpenEMR PID;required.|



CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

|referral_code/token|Request|Optional; null/blank means<br>HHA_INTERNAL.|
|---|---|---|
|source|Request|patient_portal, admin,<br>partner_referral,etc.|
|actor/system identity|Request|Used for audit; never trust client-<br>supplied user IDs.|
|assigned_pool|Response|HHA_INTERNAL, CRQ, DR_RAO_ENT,<br>futurepartner code.|
|routing_result|Response|routed_hha_default, referral_used,<br>referral_invalid,referral_expired,etc.|
|provider attribution|Response|Optional; do not expose to patient UI<br>unless intentionally translated to<br>displaymetadata.|



## **11. Routing Logic - Required Priority Order** 

Use deterministic priority so the same registration cannot be routed inconsistently. 

1. Explicit validated provider-specific referral token. 

2. Explicit validated partner-level referral token. 

3. Approved partner/service context established by backend policy. 

4. Authorized staff assignment. 

5. Otherwise HHA_INTERNAL. 

Never route to a partner using display name matching, email-domain guessing, browser origin alone, facility text, or a clientsupplied provider ID. 

## **12. Partner-Level vs Provider-Level Referral** 

|**Referral Type **|**Meaning**|**Expected Assignment**|
|---|---|---|
|Partner-level|Patient referred by organization<br>generally.|Patient -> partner pool; provider<br>assignment follows configured partner<br>policy.|
|Provider-level|Patient referred by a specific provider.|Patient -> partner pool + provider<br>attribution/access if provider is active<br>in thatpartner.|



The data model must preserve the organization relationship even when the referral is provider-specific. A patient referred by Dr. Liza is a CRQ patient relationship first, with Dr. Liza attribution second. 

## **13. Provider Assignment Policy** 

Do not automatically grant every provider in a large partner organization access forever unless that is HHA's intended clinical policy. The current organization-level routing behavior can grant active mapped providers; developers should make this assignment strategy configurable. 

|**Policy Option**|**Use Case**|
|---|---|
|specific_provider|Provider-specific referral; only referred provider gets<br>access.|
|all_partner_providers|Small partner clinic where all clinicians jointly manage<br>patients.|
|round_robin|Future scheduling/load-balancingmodel.|



CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

||Health-Hub Africa®|MyHealth Vault+™|Universal Registration & Partner Routing|
|---|---|
|service_owner|Assign based on booked specialty/service.|
|manual_triage|Patient enters partner pool but waits for HHA/partner<br>assignment.|



## **14. Patient Pool Rules** 

- A normal registration with no validated referral must create/retain HHA_INTERNAL assignment. 

- A valid CRQ referral must create CRQ partner assignment. 

- A valid Dr. Rao ENT referral must create DR_RAO_ENT assignment. 

- An invalid, inactive, expired, or exhausted referral must never create partner-provider access. 

- Historical assignments must remain auditable; use active/inactive status and ended_at rather than deleting history. 

- If HHA allows multi-partner care relationships later, redesign the current single-active-pool behavior deliberately rather than accidentally. 

## **15. Security Requirements** 

- Frontend parameters are not authorization. 

- Referral validation must occur server-side. 

- PartnerProvider ACL only determines what the role may do; hha_provider_patient_access and partner assignment determine which patient may be opened. 

- A provider must be actively mapped to the partner in hha_partner_provider before provider-specific access is granted. 

- A patient must have an active partner relationship before partner-only forms are exposed. 

- Direct URL access to another partner's patient must remain denied. 

- All route/assign/reassign operations must be auditable. 

- Do not send PHI in QR code payloads or referral tokens. 

- Use opaque/random production tokens rather than predictable public identifiers where feasible. 

- Rate-limit referral validation to prevent enumeration. 

- Do not return 'this code belongs to Dr. X' to unauthenticated callers unless product explicitly requires it. 

## **16. Partner-Specific Forms After Routing** 

Partner-specific forms must be selected dynamically from the patient's active partner assignment after routing. The universal registration page must not hard-code CRQ forms or Dr. Rao forms. 

|**Assigned Pool**|**Forms/Experience**|
|---|---|
|HHA_INTERNAL|HHA standard onboarding/intake forms.|
|CRQ|CRQ approved intake/assessment/consent forms where<br>portal-enabled.|
|DR_RAO_ENT|Dr. Rao ENT-specific forms when configured.|
|Futurepartner|Forms resolved dynamicallyfrompartner form catalog.|



For CRQ, the development team should integrate this with the Partner-Scoped Clinical Forms specification already provided. The routing assignment is the trigger for form eligibility. 

## **17. Referral Code Administration** 

Create an HHA administrative interface for referral management rather than editing SQL manually. 

- Create partner-level referral code. 

- Create provider-specific referral code. 

- Set active/inactive. 

- Set expiration date. 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

- 

- 

- 

- 

- 

- 

- Set max uses if needed. 

- Display campaign/description. 

- Generate QR code from the universal registration route plus opaque referral token. 

- Revoke a code without deleting audit history. 

- View uses_count and referral audit events. 

- Rotate or replace codes safely. 

## **18. Partner Onboarding Workflow** 

New partners should be onboarded by configuration, not by new code branches. 

1. Create partner organization record. 

2. Create partner facility in OpenEMR if required. 

3. Create/activate PartnerProvider user(s). 

4. Map providers to partner in hha_partner_provider. 

5. Configure provider assignment strategy. 

6. Create partner/provider referral codes or tokens. 

7. Configure partner forms and portal-enabled forms. 

8. UAT patient referral and routing. 

9. Validate partner patient isolation. 

10. Issue partner onboarding instructions: use the standard MyHealth Vault+ registration process and provide referral code/QR as applicable. 

## **19. Existing Patients / Manual Reassignment** 

Existing patients may need to be moved from HHA_INTERNAL into a partner relationship. Do not create a second routing mechanism for legacy patients. 

- Provide an HHA admin action: Assign to Partner. 

- • Require selection of partner and optional provider. 

- Require a reason/source such as existing_referral, chart_review, partner_transfer, correction. 

- Update partner assignment and provider access transactionally. 

- Retain prior assignment history. 

- Write an audit event. 

- Never reassign based only on patient name, provider display name, or facility text. 

## **20. Error Handling and Failure Modes** 

|**Failure**|**Required Behavior**|
|---|---|
|No referral|Register normally-> HHA_INTERNAL.|
|Invalid token|Register normally-> HHA_INTERNAL;audit invalid referral.|
|Inactivepartner|Do notgrantpartner access;HHA_INTERNAL/review.|
|Inactive provider|Do not grant provider-specific access; follow partner<br>fallbackpolicyor review.|



CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

||Health-Hub Africa®|MyHealth Vault+™|Universal Registration & Partner Routing|
|---|---|
|Routing service unavailable|Complete account creation if safe; hold clinical routing in<br>retry/reviewqueue;neverguess.|
|Duplicate retry|Use idempotency to avoid duplicate assignments/audits<br>where inappropriate.|
|Patient already exists|Resolve existing OpenEMR PID and apply relationship policy<br>without creatingduplicatepatient.|
|Conflictingreferral context|Use explicitpriorityrules and logconflict for review.|



## **21. Idempotency Requirements** 

Registration, patient creation, and routing may be retried because of network or API failures. All integration calls must be designed for safe retries. 

- Use a registration correlation ID / idempotency key. 

- Do not create duplicate OpenEMR patients when a retry occurs. 

- Do not create duplicate active partner assignments. 

- Do not create duplicate provider-patient access rows. 

- Do not increment referral usage multiple times for the same completed registration unless policy explicitly defines each invocation as a use. 

- Persist integration status transitions for operational troubleshooting. 

## **22. Audit and Observability** 

At minimum, capture the following: 

- portal registration ID / correlation ID 

- OpenEMR PID 

- referral token ID (not necessarily full token in application logs) 

- resolved partner 

- resolved provider if applicable 

- routing result 

- source 

- timestamp 

- technical success/failure 

- retry count 

- administrative overrides 

## **23. Suggested API Endpoints** 

Exact paths may follow the existing HHA API conventions. Suggested logical operations: 

|**Operation**|**Purpose**|
|---|---|
|POST /referrals/validate|Validate referral token without assigning patient.|
|POST /patients/{pid}/route|Route an existing/resolvedpatient.|
|GET /patients/{pid}/routing|Return current routing assignment to authorized<br>services/admins.|
|POST /patients/{pid}/routing/reassign|Authorized administrative reassignment.|
|GET /partners/{partner}/forms|Return forms eligible forpartner/context.|



Do not expose these as unauthenticated clinical endpoints. The portal backend/service account should authenticate to the clinical integration layer. 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

## **24. Database Change Guidance** 

The existing tables can support the initial implementation. Add schema only when needed for idempotency, routing policy, or admin workflow. 

- Keep hha_partner_organization as partner master. 

- Keep hha_partner_provider as provider membership. 

- Keep hha_patient_partner_assignment as patient relationship history. 

- Keep hha_provider_patient_access as enforcement. 

- Keep hha_partner_referral_code as referral/token configuration. 

- Keep hha_partner_referral_audit as routing/referral audit. 

- Consider adding assignment_policy to hha_partner_organization or a separate hha_partner_routing_policy table. 

- Consider adding external_registration_id / idempotency_key to audit or a dedicated integration table. 

## **25. DevOps / Deployment Sequence** 

### **Phase 1 - Staging Preparation** 

- Backup staging database and current portal code. 

- Confirm existing universal registration route. 

- Deploy referral validation API/service. 

- Add referral state handling to frontend. 

- Add routing call after OpenEMR PID resolution. 

### **Phase 2 - Staging Functional Test** 

- Normal HHA registration. 

- CRQ organization referral. 

- CRQ provider-specific referral. 

- Dr. Rao ENT referral. 

- Invalid/expired referral. 

- Existing patient routing. 

### **Phase 3 - Security Test** 

- CRQ provider cannot search/open HHA_INTERNAL patient. 

- CRQ provider cannot open Dr. Rao patient. 

- Dr. Rao cannot open CRQ patient. 

- Direct URL/API bypass attempts fail. 

- Partner forms are scoped correctly. 

### **Phase 4 - Production Deployment** 

- Take production database and application backups. 

- Deploy backend/API first. 

- Deploy portal referral handling. 

- Enable feature flag for controlled rollout. 

- Run smoke tests with synthetic patients. 

- Monitor audit/error logs. 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

## **26. Mandatory UAT Matrix** 

|**Test Case**|**Input**|**Expected Result**|
|---|---|---|
|UAT-01|No referral|Patient -> HHA_INTERNAL; no partner-<br>provider access.|
|UAT-02|Valid CRQ partner referral|Patient -> CRQ; access per CRQ<br>providerpolicy.|
|UAT-03|Valid CRQ provider referral|Patient -> CRQ; referred provider gets<br>access.|
|UAT-04|Valid Rao ENT referral|Patient -> DR_RAO_ENT; Dr. Rao<br>accessperpolicy.|
|UAT-05|Invalid referral|Patient -> HHA_INTERNAL;<br>referral_invalid audit.|
|UAT-06|Expired referral|Patient -> HHA_INTERNAL;<br>referral_expired audit.|
|UAT-07|Inactiveprovider|No unauthorizedprovider access.|
|UAT-08|CRQ provider searches HHApatient|Patient hidden/denied.|
|UAT-09|Dr. Rao searches CRQ patient|Patient hidden/denied.|
|UAT-10|Retry same registration|No duplicate<br>patient/assignment/access.|
|UAT-11|CRQ-assignedportalpatient|CRQ portal-enabled forms appear.|
|UAT-12|HHA_INTERNAL patient|CRQ/Rao partner-only forms do not<br>appear.|



## **27. Partner Communication Model** 

Partners should not be told to manage a separate HHA registration site. Their onboarding instructions should be simple: 

- All patients register through the standard MyHealth Vault+ patient registration flow. 

- The partner supplies a referral code or QR invitation. 

- The patient completes the same registration as every other MyHealth Vault+ user. 

- HHA's backend routes the patient to the correct partner/provider circle automatically. 

- The partner sees only patients assigned to its authorized provider circle. 

## **28. QR Code Design** 

QR codes are convenience mechanisms, not separate links/apps. A QR may carry an opaque referral token to the universal registration endpoint. 

- QR must contain no PHI. 

- Token should be revocable. 

- Prefer opaque/random token in production. 

- QR scan should land on the same universal registration component. 

- Referral token should be validated server-side. 

- If QR token is invalid or expired, patient may still register normally and is routed safely to HHA_INTERNAL. 

## **29. Feature Flags** 

- UNIVERSAL_REFERRAL_ROUTING_ENABLED 

- PARTNER_PORTAL_FORMS_ENABLED 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

- PARTNER_QR_REFERRALS_ENABLED 

- PARTNER_ADMIN_REASSIGNMENT_ENABLED 

Use feature flags so HHA can enable referral routing progressively without rolling back the entire patient registration application. 

## **30. Rollback Plan** 

- Portal rollback: disable referral UI/handling feature flag; normal registration continues. 

- Backend rollback: disable routing invocation; default registrations continue as HHA_INTERNAL or integration-review according to policy. 

- Do not delete referral audit history. 

- Do not delete historical partner assignments. 

- Do not delete completed partner forms. 

- Restore code/database only if technically necessary and with clinical data preservation. 

## **31. Definition of Done** 

- One canonical MyHealth Vault+ registration endpoint is used by all patients. 

- No partner-specific registration application is required. 

- Referral code/token is optional and validated server-side. 

- No valid referral routes to HHA_INTERNAL. 

- CRQ referral routes to CRQ. 

- Dr. Rao ENT referral routes to DR_RAO_ENT. 

- Provider-specific referral can attribute/access the correct provider. 

- PartnerProvider patient isolation remains enforced. 

- Partner-specific forms are resolved from partner assignment, not URL structure. 

- Invalid/expired referrals fail safely. 

- Routing is audited. 

- Registration/routing is idempotent. 

- Staging UAT is documented. 

- Production rollout has backup, feature flag, smoke test, and rollback instructions. 

- New partner onboarding requires configuration, not a new registration codebase. 

## **32. Developer Deliverables** 

- Architecture diagram showing portal -> integration service -> OpenEMR routing -> partner access -> partner forms. 

- Frontend change set for optional referral context. 

- Backend referral validation service. 

- Clinical routing API/service integration. 

- Idempotency design. 

- Partner routing policy configuration. 

- Partner/referral administration UI. 

- Automated unit/integration tests. 

- Security test evidence. 

- UAT checklist and results. 

- Deployment runbook. 

- Rollback runbook. 

- Operational troubleshooting guide. 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

Health-Hub Africa® | MyHealth Vault+™ | Universal Registration & Partner Routing 

## **33. Implementation Guardrails** 

#### **DO NOT:** 

- create a separate registration page for CRQ, Dr. Rao ENT, or each future partner; 

- hard-code partner names in the registration frontend; 

- trust query parameters as authorization; 

- let the browser write partner assignment directly; 

- give portal code direct unrestricted database access; 

- assign partner access when referral validation fails; 

- mix partner form visibility rules with URL routing logic; 

- remove historical assignments or form versions to 'clean up' data. 

#### **DO:** 

- use one registration experience; 

- route dynamically from validated backend configuration; 

- fail safely to HHA_INTERNAL; 

- preserve partner/provider/patient separation; 

- reuse the same framework for every future partner; 

- audit every routing and administrative override. 

## **34. Final Recommended Flow** 

Patient opens universal MyHealth Vault+ registration -> optional referral context is captured -> portal backend validates referral -> patient account is created -> OpenEMR patient PID is created/resolved -> routing service assigns HHA_INTERNAL or the correct partner -> provider-patient access is created according to partner policy -> partner-specific forms/services become eligible -> PartnerProvider access guard enforces patient visibility. 

#### **END OF IMPLEMENTATION SPECIFICATION** 

CONFIDENTIAL - Development Team Implementation Specification | Version 1.0 

