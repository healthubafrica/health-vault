Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

# **MyHealth Vault+™** 

## **Mobile Application — Developer Feature & Functional Requirements** 

##### **Health-Hub Africa® (HHA)** 

iOS + Android | Developer Implementation Specification Corporate domain: healthubafrica.com | Master developer administration: healthubafrica@gmail.com 

Purpose: Define the functional scope, implementation expectations, safety boundaries, integrations, and phased priorities for the MyHealth Vault+ mobile application. The app must be a mobile-first health companion—not merely a replica of the web portal. 

### **1. Product Vision** 

The mobile experience should follow the core workflow: Capture → Store → Trend → Safely Interpret → Alert → Connect to Care. It should combine personal health records, vitals, TeleCare, HHA service access, medication support, emergency functionality, notifications, secure sharing, and device integrations. 

### **2. Priority Definitions** 

- P0 / Must Have — required for initial production release. 

- P1 / High Value — targeted for V1 or V1.5 where feasible. 

- P2 / Advanced — planned for V2 or later after validation and operational readiness. 

### **3. Recommended Mobile Home Screen** 

The first screen should be simple, fast, and action-oriented. Recommended primary actions: 

- Check My Vitals 

- Talk to a Doctor / TeleCare 

- Book Care 

- My Health Records 

- Medications 

- Test Results 

- Emergency / DispatchCare 

Below the primary actions, display Today (medications/appointments), Your Health (latest approved vitals), Recent activity, notifications, and relevant service prompts. 

### **4. Vitals Capture & Personal Health Hub — P0** 

Create a prominent “Check My Vitals” workflow. Each reading must retain source, timestamp, unit, device/source metadata where available, and whether it was manually entered, imported, or captured by a supported device. 

|Metric|Required Inputs|Priority|
|---|---|---|
|Heart Rate|Manual entry; import from Apple<br>Health/Health Connect; supported<br>wearable/device import; optional<br>camera-based pulse in a later<br>validated release.|P0|



CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

|Blood Pressure|Manual entry; Bluetooth cuff/device<br>integration; Apple Health/Health<br>Connect import. Do not represent<br>ordinary phone-only estimation as<br>clinical BP.|P0|
|---|---|---|
|SpO₂|Manual entry; supported<br>oximeter/wearable/platform import.<br>Avoid unvalidated phone-only clinical<br>claims.|P0|
|Temperature|Manual entry; supported connected<br>thermometer/platform import.|P0|
|Respiratory Rate|Manual entry and supported<br>platform/device import.|P0|
|Weight & BMI|Manual/smart-scale import; calculate<br>BMI when height and weight are<br>available.|P0|
|Blood Glucose|Manual entry and supported<br>device/platform import.|P0|
|Pain Score|0–10 capture with timestamp and<br>trend.|P0|
|Optional Wellness Metrics|Sleep, activity, steps, mood/wellbeing<br>and medication adherence where<br>authorized.|P1|



### **5. Vitals Trends & Clinical Escalation — P0/P1** 

- Display current value plus 7-day, 30-day, 90-day and 1-year trends where sufficient data exists. 

- Graph BP, heart rate, weight, glucose, SpO₂, temperature and other approved metrics. 

- Support clinician-approved Green / Amber / Red status logic. 

- Do not hard-code clinical thresholds without HHA clinical approval. 

- Amber may recommend repeat measurement or TeleCare; Red may offer TeleCare, DispatchCare or emergency guidance according to approved clinical rules. 

- Avoid alarm fatigue: alerts should consider repeat readings, context and clinician-approved rules. 

### **6. Apple Health & Android Health Connect — P0** 

- Implement Apple HealthKit integration on iOS with explicit per-data-type user authorization. 

- Implement Android Health Connect integration with explicit user authorization. 

- Import only approved health data types and retain provenance/source metadata. 

- Allow patients to disconnect integrations and revoke permissions. 

- Prevent duplicate records when the same measurement is received from multiple sync paths. 

- Design the integration layer so additional wearables and medical devices can be added later. 

### **7. Daily Health Check — P1** 

Provide a 30–60 second optional daily check-in combining selected vitals, symptoms, pain, sleep/wellbeing and medication adherence. Present an approved status summary and route concerning results to appropriate HHA care options. 

### **8. MyHealth Vault+ Health Record — P0** 

- Medical records and patient-facing visit information. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

- After-Visit Summaries. 

- Laboratory and diagnostic results. 

- Imaging reports/documents. 

- Prescriptions and medication list. 

- Allergies, diagnoses/problem list, vitals and relevant history. 

- Patient-uploaded documents. 

- Secure download and sharing where permitted. 

- Personal Health Timeline combining visits, results, prescriptions, documents and relevant health events. 

### **9. Medical Document Scanner — P0/P1** 

- Capture documents using the phone camera. 

- Auto-crop, deskew, enhance and convert to an uploadable document/image. 

- Support prescriptions, lab reports, discharge summaries, imaging reports, vaccination records, referrals and other approved health documents. 

- Optional OCR should extract candidate metadata such as document type, date and facility. 

- Require user confirmation before extracted information becomes structured health data. 

- Apply file validation, size limits and malware/security controls on the backend. 

### **10. Prescription Scanner & Medication Assistant — P1** 

- OCR-assisted extraction of medication name, strength, frequency and instructions from a photographed prescription. 

- Require explicit patient confirmation of extracted fields. 

- Do not silently write OCR output into the authoritative clinical medication list. 

- Medication reminders with Take / Skip / Snooze actions. 

- Adherence history and refill reminders. 

- Display current medications and patient-facing instructions. 

- Future: refill request and pharmacy fulfillment workflow subject to HHA approval. 

### **11. TeleCare™ — P0** 

- Book or enter a TeleCare consultation from the app. 

- Pre-visit reason for visit, symptoms and available vitals. 

- Camera/microphone/network pre-check. 

- Secure video/audio consultation and waiting-room experience. 

- Provider/appointment status. 

- After the visit: approved summary, prescription, follow-up instructions and follow-up scheduling. 

- Deep-link appropriate notifications directly to the visit or follow-up screen. 

### **12. AI Symptom Intake — P1** 

Provide a conservative, structured pre-consultation intake assistant that gathers symptom onset, duration, severity, associated symptoms and clinically approved red-flag questions. The output should be a clinician-facing pre-visit summary, not an autonomous diagnosis. Escalation and emergency language must be clinically approved. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **13. AI Health Summary & “Ask My Record” — P1/P2** 

- Generate a patient-friendly summary of authorized record content: conditions, medications, allergies, recent visits, results and upcoming care. 

- Allow natural-language questions such as “What was my last blood pressure?” or “When is my next appointment?” 

- Answers must be grounded in the patient's authorized record and distinguish record-derived information from general educational content. 

- Provide source/date context for record-derived answers where practical. 

- Do not allow AI output to silently alter authoritative clinical records. 

### **14. Appointments & Mobile Check-In — P0/P1** 

- Book, view, reschedule and cancel appointments according to HHA rules. 

- Display provider, service, facility, time and appointment status. 

- Push/in-app reminders and deep links. 

- Future/optional: clinic QR check-in or “I'm Here” action for MinuteCare. 

- Allow pre-arrival symptom/vitals update when clinically appropriate. 

### **15. Multi-Channel Notifications — P0** 

The mobile app must integrate with HHA's Push + In-App + Email + SMS notification architecture. 

- Registration confirmation and security alerts. 

- Appointment booking, reminder, change and cancellation. 

- Provider/TeleCare readiness. 

- New prescription, visit summary, lab result or document. 

- Medication reminders. 

- Subscription/payment notifications. 

- User notification preferences and read/unread in-app notification center. 

### **16. Emergency Profile & DispatchCare™ — P0** 

- Prominent Emergency / DispatchCare entry point. 

- Emergency Profile containing patient-authorized critical information such as allergies, medications, major conditions, emergency contacts and blood group when documented. 

- Capture current location only with explicit permission and only when required by the approved workflow. 

- Dispatch request status and tracking where backend operations support it. 

- Provide approved escalation options such as TeleCare, DispatchCare and local emergency services. 

- Support a limited encrypted offline emergency profile; do not cache the entire medical record offline. 

### **17. Health Passport & Secure Record Sharing — P0/P1** 

- Patient-controlled temporary QR/code/link sharing. 

- Patient selects what is shared and for how long. 

- Expiration and revocation. 

- Audit access events where supported. 

- Emergency/Health Passport should expose only patient-authorized information. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **18. Family & Dependents — P1** 

- Allow authorized guardians/caregivers to manage dependent profiles. 

- Support appointments, records, medications, vitals and TeleCare as permitted. 

- Implement age, consent, guardianship and access-control rules approved by HHA. 

- Make the active patient context visually obvious to reduce charting/actions on the wrong profile. 

### **19. HHA Service Hub — P0/P1** 

- DispatchCare™ 

- MinuteCare™ 

- CareTest™ 

- TeleCare™ 

- HealthConsult™ 

- TravelSafe™ 

- NeuroFlex® 

- MyHealth Vault+™ 

Each applicable service should support description, eligibility/routing, booking/request, payment where applicable, confirmation, status, results/documents and follow-up. 

### **20. NeuroFlex® — P1** 

- NeuroFlex service information and booking. 

- Assessment history and completed assessment visibility. 

- Patient-facing approved reports. 

- Follow-up scheduling. 

- Future: longitudinal brain-health trends and approved questionnaires. 

### **21. TravelSafe™ Mobile Mode — P2** 

- Trip/destination/date capture. 

- Quick access to Health Passport, medication list and selected medical documents. 

- TeleCare and HHA assistance. 

- Emergency contacts and travel-related documents. 

- Destination-aware services only after appropriate privacy, legal and operational review. 

### **22. Voice & QR Workflows — P1/P2** 

- Voice-to-text symptom entry and accessibility support. 

- Optional structured commands such as recording a BP value, subject to confirmation. 

- QR clinic check-in. 

- QR temporary record sharing. 

- QR provider/patient verification workflows where approved. 

### **23. Remote Patient Monitoring (RPM) — P1/P2** 

- Enroll selected patients into approved monitoring programs. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

- Clinician dashboard showing active patients and those requiring review. 

- Trend-based flags based on clinician-approved logic. 

- Actions: review chart, message/call, initiate TeleCare or other approved escalation. 

- Maintain audit trail of alerts, acknowledgments and actions. 

### **24. Connected Medical Devices — P1/P2** 

Design a device-neutral integration architecture for future support of: 

- Bluetooth blood-pressure cuffs. 

- Pulse oximeters. 

- Glucometers. 

- Smart scales. 

- Connected thermometers. 

- Apple Watch and other HealthKit sources. 

- Android/Wear OS and Health Connect sources. 

### **25. Lab Result Intelligence — P1** 

- Show value, unit, reference range and abnormal flag exactly as provided by the clinical/lab source. 

- Trend comparable historical results. 

- Provide patient-friendly explanatory context only when clinically approved. 

- Do not convert a laboratory flag into an autonomous diagnosis. 

- Offer appropriate “Ask/Contact Your Doctor” or TeleCare action. 

### **26. Security, Privacy & Safety Requirements — P0** 

- Biometric login support, secure token storage, session management and logout. 

- TLS in transit; secure storage using platform-provided secure stores. 

- No PHI in ordinary analytics, crash logs or notification previews unless specifically approved. 

- Role/object-level authorization on backend APIs; never trust client-side authorization alone. 

- Consent and permission management for camera, microphone, location and health-data access. 

- Audit sensitive actions and record sharing. 

- Implement account deletion workflow consistent with HHA policy and store requirements. 

- Security testing and penetration testing before production launch. 

- All medical thresholds, escalation rules, disclaimers and clinical wording require HHA clinical approval. 

### **27. Low-Bandwidth & Offline Design — P0/P1** 

- Optimize for intermittent and lower-bandwidth networks. 

- Graceful retries and duplicate-submission prevention. 

- Clear offline/error states. 

- Resumable uploads where practical. 

- TeleCare network-quality handling. 

- Encrypted limited offline Emergency Profile only. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **28. Release Phasing** 

#### **V1 — Production Foundation** 

Authentication/biometrics; dashboard; health record; TeleCare; appointments; prescriptions/medications; results; manual/imported vitals and trends; Apple Health/Health Connect; reminders; push/in-app/email/SMS integration; document scanner; secure sharing; Emergency Profile; DispatchCare access; HHA service booking; core payments/subscription interfaces where approved. 

#### **V1.5 — Engagement & Intelligence** 

Enhanced device integrations; camera-based pulse only if appropriately validated; AI symptom intake; AI health summary; medication OCR/reminders; family/dependents; RPM foundation; clinic check-in; improved lab trends. 

#### **V2 — Advanced Platform** 

Advanced RPM; personalized care pathways; TravelSafe intelligence; NeuroFlex longitudinal data; voice workflows; expanded connected-device support; carefully validated predictive/health scoring features. 

### **29. Critical Developer Acceptance Criteria** 

- A patient can securely authenticate and access the correct profile. 

- A patient can enter/import approved vitals and see source-aware trends. 

- Apple Health/Health Connect permissions are explicit, revocable and data-type specific. 

- No unvalidated phone-only BP or SpO₂ feature is represented as a clinical measurement. 

- A patient can access records, results, prescriptions and patient-facing visit information. 

- TeleCare can be booked/joined and post-visit information is accessible. 

- Push/in-app notifications work and integrate with HHA's broader email/SMS architecture. 

- Emergency Profile and DispatchCare workflows are available and privacy-controlled. 

- Record sharing is time-limited, revocable and auditable where supported. 

- The app remains usable under poor network conditions. 

- Clinical alerts use HHA-approved rules; developers do not independently invent thresholds. 

- Sensitive data is protected in transit, at rest and in local device storage. 

- HHA owns all production accounts, repositories, keys, signing/release capability and production configurations. 

### **30. Required Developer Deliverables** 

- iOS and Android production source code. 

- Architecture diagram and component inventory. 

- API integration documentation. 

- HealthKit and Health Connect data-mapping documentation. 

- Notification architecture and event catalogue. 

- Device integration documentation. 

- Security design and threat/risk notes. 

- Test cases and UAT evidence. 

- Store submission builds and configuration. 

- CI/CD and build/release documentation. 

- Third-party SDK/library inventory. 

- Known issues and technical-debt register. 

- Operational support and rollback runbook. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **31. Product Principle** 

**The MyHealth Vault+ mobile app should turn the patient's phone into a secure health companion: capture health information, organize the record, reveal trends, support safe escalation, and connect the patient to HHA care.** 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **32. MyChart-Benchmarked Good-to-Have Features** 

The following capabilities are recommended as competitive benchmark features inspired by mature patient-portal experiences such as Epic MyChart. They should be implemented in an HHA-specific manner and should not copy Epic branding, proprietary UI, or workflows. These are primarily P1/P2 enhancements unless otherwise promoted by HHA. 

|Feature|Priority|Developer Requirement|HHA Fit|
|---|---|---|---|
|Secure Care-Team<br>Messaging|P1|Patient inbox/outbox for<br>non-urgent messages to<br>clinicians; attachments;<br>message categories;<br>response-status visibility;<br>separate clinical, customer-<br>service and billingchannels.|Recommended|
|Prescription Refill Requests|P1|Allow patients to request<br>renewal/refill of eligible<br>medications, select<br>preferred pharmacy where<br>supported, see request<br>status, and receive<br>ready/approved/declined<br>notifications.|Recommended|
|Care Plans / Care<br>Companion|P1|Clinician-assigned care<br>pathways containing<br>medication reminders,<br>educational content, health-<br>tracking tasks,<br>questionnaires and periodic<br>check-ins. Strong fit for<br>chronic disease and RPM.|Recommended|
|Test Result Trends &<br>Provider Comments|P1|Display current/past results,<br>reference ranges, clinician<br>comments, longitudinal<br>graphs and downloadable<br>trend summaries where<br>supported.|Recommended|
|Patient Questionnaires|P1|Pre-visit, history, screening,<br>follow-up and condition-<br>specific questionnaires that<br>can be assigned by HHA<br>clinicians and completed in-<br>app.|Recommended|
|Medical & Family History|P1|Allow patients to review and<br>propose updates to<br>personal and family history,<br>with appropriate<br>reconciliation/approval<br>before authoritative clinical<br>record changes.|Recommended|
|Growth Charts for Children|P1|For pediatric dependents,<br>show approved<br>height/weight/BMI/head-<br>circumference growth<br>charts and immunization<br>history.|Recommended|
|Preventive Care / Health<br>Maintenance|P1|Show due/overdue<br>preventive services,<br>vaccinations, screenings<br>and follow-uptasks based|Recommended|



CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

|Upcoming Tests &<br>Procedures|P1|on HHA-approved rules.<br>Patient task list for ordered<br>tests, imaging, procedures<br>and follow-up actions,<br>including preparation<br>instructions and reminders.|Recommended|
|---|---|---|---|
|Provider Finder|P1|Search/filter HHA and<br>approved partner providers<br>by specialty, service,<br>location, language,<br>availability and other HHA-<br>defined criteria.|Recommended|
|Wait List / Earlier<br>Appointment Alerts|P1|Allow patients to join a wait<br>list and accept an earlier<br>appointment when capacity<br>opens.|Recommended|
|Favorite / Repeat<br>Appointment Shortcuts|P2|Allow users to quickly<br>repeat frequently booked<br>services such as TeleCare<br>follow-up, CareTest or<br>recurringvisits.|Recommended|
|eCheck-In|P1|Before arrival, verify<br>demographics, emergency<br>contact and relevant<br>information; complete<br>questionnaires/consents;<br>make applicable payment;<br>confirm arrival instructions.|Recommended|
|Asynchronous E-Visit|P1|Patient submits structured<br>symptoms, questionnaire,<br>photos/video and relevant<br>vitals for clinician review<br>without an immediate live<br>video visit.|Recommended|
|Provider/Care Team<br>Directory|P1|Show current care team,<br>provider profiles, roles,<br>contact options and<br>upcomingencounters.|Recommended|
|Letters & Clinical<br>Documents|P1|Central area for after-visit<br>summaries, referral letters,<br>work/school notes, care-<br>plan documents and<br>approved clinical<br>attachments.|Recommended|
|Who's Accessed My<br>Record?|P1|Patient-facing audit view<br>showing significant<br>access/sharing events<br>where technically and<br>legallyappropriate.|Recommended|
|Friends & Family Proxy<br>Access|P1|Patient can invite a trusted<br>caregiver/family member<br>and grant scoped access.<br>Include child/dependent<br>and adult-caregiver<br>workflows with revocation.|Recommended|
|External Health Record<br>Linking|P2|Future interoperability layer<br>to import/link records from<br>other healthcare<br>organizations using|Recommended|



CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

|||standards such as FHIR<br>where partners and<br>infrastructure support it.||
|---|---|---|---|
|Connected Apps & Devices<br>Management|P1|Screen showing connected<br>health<br>platforms/devices/apps,<br>permissions, last<br>synchronization and ability<br>to revoke access.|Recommended|
|Download/Export Health<br>Record|P1|Patient can<br>request/download selected<br>summaries or an approved<br>formal health-record export<br>in human-readable and,<br>where supported, machine-<br>readable formats.|Recommended|
|Insurance / HMO<br>Information|P1|Store/display coverage,<br>member information,<br>authorizations/referrals and<br>digital insurance/HMO card<br>where HHA partnerships<br>support it.|Recommended|
|Cost Estimate Before Care|P1|Display estimated patient<br>cost for common HHA<br>services before booking,<br>including subscription<br>benefit or pay-as-you-go<br>pricingwhere applicable.|Recommended|
|Billing Account Summary|P1|Charges, payments,<br>receipts, outstanding<br>balances and transaction<br>historyin one view.|Recommended|
|Payment Plans|P2|Where HHA policy supports<br>it, allow eligible patients to<br>establish/manage<br>structured payment<br>arrangements.|Recommended|
|Paperless Statements|P2|Digital statements with<br>notification preferences and<br>downloadable<br>receipts/statements.|Recommended|
|Communication<br>Preferences|P0/P1|Granular control over push,<br>SMS and email by<br>notification type:<br>appointments, results,<br>messages, billing,<br>medication and security.|Recommended|
|Language Preferences /<br>Multilingual App|P1|Architecture for English plus<br>future Nigerian/local-<br>language support; retain a<br>patient preferred-language<br>setting.|Recommended|
|Passkeys / Passwordless<br>Login|P1|Add passkeys alongside<br>Face ID/Touch ID/Android<br>biometrics for modern<br>passwordless<br>authentication where<br>platform/backend support<br>permits.|Recommended|



CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

|Care Gap Dashboard|P1|Patient-facing checklist of<br>incomplete health actions:<br>labs, screening, follow-up,<br>medication tasks,<br>questionnaires and<br>preventive care.|Recommended|
|---|---|---|---|
|Patient Education Library|P1|Clinician-curated education<br>attached to diagnosis,<br>medication, care plan or<br>visit; track<br>viewed/completed content<br>when appropriate.|Recommended|
|Research / Program<br>Eligibility|P2|Future opt-in module for<br>HHA-approved research<br>studies, pilots or<br>population-health<br>programs, with explicit<br>consent.|Recommended|
|Advance Directives / Care<br>Preferences|P2|Upload/view advance<br>directives and designate<br>emergency/healthcare<br>decision contacts where<br>legally appropriate to HHA's<br>operating jurisdictions.|Recommended|
|Inpatient / Facility Stay<br>Companion|P2|If HHA later supports<br>inpatient/observation<br>partnerships: daily<br>schedule, care team, recent<br>vitals/labs, educational<br>content and non-urgent<br>requests.|Recommended|
|AI Result Explanation|P1/P2|Plain-language explanation<br>of approved lab/imaging<br>results, grounded in the<br>patient's record and source<br>result, with strong safety<br>controls and no<br>autonomous diagnosis.|Recommended|
|AI Navigation Assistant|P1/P2|Help users locate records,<br>appointments, bills,<br>medications and services,<br>answer record-grounded<br>questions and guide users<br>to appropriate HHA<br>workflows.|Recommended|



### **33. Recommended MyChart-Inspired Features to Promote into the HHA Roadmap** 

The following are the strongest additions for MyHealth Vault+ because they materially improve continuity of care rather than simply adding portal complexity: 

- Secure Care-Team Messaging — direct, non-urgent patient-to-care-team communication with attachments and routing. 

- Prescription Refill Requests — closes the loop between medication history, clinician approval and pharmacy fulfillment. 

- Care Companion / Digital Care Plans — ideal for hypertension, diabetes, post-visit follow-up, RPM and other HHA programs. 

- eCheck-In — reduces front-desk work and prepares patients before MinuteCare or other in-person services. 

- Asynchronous E-Visits — creates a lower-cost alternative between messaging and full TeleCare video. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

- Wait List / Earlier Appointment Alerts — improves utilization and patient access. 

- Preventive Care & Care Gaps — makes the app proactive rather than merely archival. 

- Upcoming Tests & Procedures — gives patients a single actionable care task list. 

- Proxy / Friends & Family Access — critical for children, older adults and caregivers. 

- Who's Accessed My Record? — reinforces the MyHealth Vault+ privacy/value proposition. 

- Provider Finder & Care Team — improves navigation across HHA and partner services. 

- Cost Estimates + Billing Summary — aligns with HHA subscription plus pay-as-you-go model. 

- Passkeys — improves both security and login convenience. 

- Patient Education — links trusted education directly to the patient's care plan. 

- AI Result Explanation / Navigation — future differentiator when implemented with record grounding and clinical safety controls. 

### **34. Competitive Product Direction** 

The target should not be to clone MyChart. MyChart is a useful benchmark for mature patient engagement features, while MyHealth Vault+ should differentiate through HHA's integrated TeleCare, DispatchCare, CareTest, MinuteCare, TravelSafe, NeuroFlex, vitals capture, device connectivity, emergency profile, health passport and mobile-first care model. 

Recommended product equation: MyChart-class patient engagement + MyHealth Vault+ personal health record + mobile vitals/RPM + HHA virtual/in-person services + DispatchCare emergency access + patient-controlled record sharing. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

### **35. Product Positioning: Mobile Version of the Existing Patient Portal** 

The MyHealth Vault+ mobile application is the iOS/Android mobile version and companion of the existing MyHealth Vault+ patient portal. It is not a separate healthcare product, separate patient record, or independent mobile backend. The existing patient portal and its backend/API layer remain the primary source of truth for patient-facing business logic and data. 

Required implementation principle: 

#### **MyHealth Vault+ Backend / APIs = Source of Truth** 

#### **↓** 

#### **Web Patient Portal + iOS App + Android App** 

- Portal parity comes first: existing patient-facing functions must be mapped and implemented on mobile before adding unrelated net-new features. 

- Mobile-native enhancements come second: biometrics, push notifications, camera/scanning, health-platform integrations, QR, location-aware emergency workflows, offline emergency profile and device connectivity. 

- Good-to-have/MyChart-benchmarked functions come third and should extend the portal ecosystem rather than create duplicate workflows. 

- Business rules must not be independently reimplemented in the mobile client when equivalent backend/API logic already exists. 

- A change to a patient-facing object such as appointment, prescription, subscription, record, document, result, payment, profile or visit summary should be reflected consistently across web and mobile channels. 

### **36. Portal-to-Mobile Feature Parity Matrix** 

The development team must use this matrix as the baseline discovery and implementation checklist. Where a portal feature already exists, the mobile app should reproduce the patient outcome using the same backend/API logic, adapted to native iOS/Android UX. 

|Existing<br>Portal<br>Feature|Current Portal Behavior /<br>Source|Mobile<br>Requirement|API / Backend Dependency|Mobile-Native<br>Enhancement|iO<br>S|Andro<br>id|Priori<br>ty|Acceptance<br>Criteria|
|---|---|---|---|---|---|---|---|---|
|Account<br>Registratio<br>n & Login|Existing patient<br>account/authentication|Native<br>registration/login<br>using same<br>identity|Auth/identity API|Face ID/Touch ID,<br>Android biometrics,<br>passkeys later|Ye<br>s|Yes|P0|Same account<br>works on portal and<br>mobile; no<br>duplicate patient<br>identity.|
|Patient<br>Profile|View/edit approved<br>demographics and<br>profile fields|View/edit same<br>patient-facing<br>fields|Patient/profile API|Camera profile photo,<br>native input controls|Ye<br>s|Yes|P0|Portal and app<br>show the same<br>savedprofile state.|
|Subscriptio<br>n / Plan|Display subscription<br>level/status and allowed<br>benefits|Display same<br>plan, status and<br>entitlements|Subscription/entitlement<br>API|Push renewal<br>reminders, wallet-like<br>membershipview|Ye<br>s|Yes|P0|Entitlements match<br>portal exactly.|
|Storage|Display storage usage<br>and allow patient<br>document management|Show storage<br>used/remaining<br>and document<br>actions|Document/storage API|Mobile upload from<br>camera/files|Ye<br>s|Yes|P0|Same storage totals<br>and files visible<br>across channels.|
|Medical<br>Records|Patient-facing medical<br>record content|Mobile record<br>browser with<br>same released<br>content|Records/FHIR/custom<br>APIs|Health timeline, native<br>search/filter|Ye<br>s|Yes|P0|No mobile-only<br>shadow record;<br>released content is<br>consistent.|
|Visit Notes<br>/ Clinical<br>Notes|Released patient-facing<br>visit information|View same<br>released<br>notes/summaries|Encounter/document API|Mobile reading mode,<br>save/share permitted<br>items|Ye<br>s|Yes|P0|Publication/release<br>rules are identical<br>toportal.|
|After-Visit<br>Summary|Approved AVS shown to<br>patient|Display AVS after<br>visit|AVS API/module endpoint|Push when new AVS is<br>available|Ye<br>s|Yes|P0|Approved AVS<br>appears on portal<br>and app without<br>duplicate<br>authoring.|
|Prescriptio<br>ns|Patient sees<br>prescriptions|Mobile<br>prescription<br>list/details|Prescription/MedicationRe<br>quest API|Medication reminder<br>and refill request later|Ye<br>s|Yes|P0|Prescription status<br>and content match<br>portal.|
|Medication<br>s|Medication list/history<br>as exposed topatient|Same list plus<br>mobile adherence|Medication API|Take/Skip/Snooze,<br>refill reminders|Ye<br>s|Yes|P0/P<br>1|Clinical medication<br>record remains|



CONFIDENTIAL — Developer Requirements | healthubafrica.com 

|||tools||Health-Hub Afr|ica® ||MyHeal|th Vault+|™ Mobile Application<br>backend-<br>controlled|
|---|---|---|---|---|---|---|---|---|
|Lab / Test<br>Results|Released test results|Mobile result<br>list/detail/trends|Result/Observation API|Trend graphs,<br>approved plain-<br>language explanation<br>later|Ye<br>s|Yes|P0|.<br>Result release<br>timing and values<br>match portal.|
|Appointme<br>nts|Book/view/reschedule/c<br>ancel according to rules|Full mobile<br>appointment<br>management|Appointment/scheduling<br>API|Push reminders, add-<br>to-calendar, waitlist<br>later|Ye<br>s|Yes|P0|Actions taken on<br>mobile immediately<br>reflect inportal.|
|TeleCare|Patient can access<br>telemedicine workflow|Native<br>booking/joining<br>and pre-visit<br>workflow|Appointment +<br>video/telemedicine<br>services|Camera/mic check,<br>native call experience|Ye<br>s|Yes|P0|Same<br>encounter/appoint<br>ment is used by<br>portal and app|
|HHA<br>Service<br>Booking|Portal routes to available<br>HHA services|Expose same<br>service catalogue<br>and booking rules|Service/scheduling/payme<br>nt APIs|Location-aware<br>routing where<br>appropriate|Ye<br>s|Yes|P0|.<br>No service exists<br>only in app unless<br>intentionally<br>aroved|
|Payments|Patient pays for<br>approved<br>services/subscriptions|Mobile payment<br>experience using<br>approved<br>architecture|Payment/billing API|Apple/Google<br>compliant native flow|Ye<br>s|Yes|P0|pp.<br>Transactions and<br>receipts appear<br>consistently across<br>channels.|
|Billing /<br>Receipts|Display patient<br>charges/receipts where<br>available|Mobile billing<br>summary and<br>receipts|Billing/payment API|Download/share<br>receipt|Ye<br>s|Yes|P1|Balances and<br>receipts match<br>backend|
|Notification<br>s|Portal/email/SMS events|Add native push +<br>in-app center to<br>same event model|Notification/event API|Deep links,<br>notification<br>preferences|Ye<br>s|Yes|P0|.<br>Single event does<br>not create<br>uncontrolled<br>duplicate<br>notifications.|
|Record<br>Sharing|Patient-controlled<br>sharing workflow|Mobile<br>create/manage/re<br>voke shares|Sharing/audit API|QR/share sheet,<br>biometric<br>confirmation|Ye<br>s|Yes|P0|Scope and expiry<br>match portal rules.|
|Emergency<br>Profile|Patient emergency<br>information where<br>available|<br>Mobile emergency<br>card/profile|Emergency profile API|Limited encrypted<br>offline mode, QR<br>access|Ye<br>s|Yes|P0/P<br>1|Offline copy is<br>limited, current,<br>encrypted and<br>patient-controlled|
|Support /<br>Help|Patient support/contact<br>options|In-app support<br>entry points|Support/contact<br>endpoints|Click-to-call, secure<br>message later|Ye<br>s|Yes|P0|.<br>Support<br>information<br>matches HHA-<br>approved contact<br>details.|
|Account<br>Settings|Privacy, password,<br>preferences|Native settings<br>screens|Identity/preferences APIs|Biometrics,<br>device/session<br>management|Ye<br>s|Yes|P0|Settings persist<br>across channels<br>where shared.|
|Account<br>Deletion|Portal/policy-driven<br>deletion request|Native<br>deletion/request<br>workflow|Identity/privacy workflow|Identity re-<br>authentication before<br>submission|Ye<br>s|Yes|P0|<br>Complies with HHA<br>policy and store<br>requirements.|
|Family /<br>Dependent<br>s|If/when portal supports<br>dependent/proxy access|Mobile<br>proxy/dependent<br>switcher|Authorization/proxy API|Fast profile switching<br>with clear active<br>patient|Ye<br>s|Yes|P1|Permission scope<br>identical to<br>backend rules|
|Provider /<br>Care Team|Provider information tied<br>to appointments/care|Show<br>provider/care<br>teamprofiles|Provider/practitioner API|Tap to message/book<br>where permitted|Ye<br>s|Yes|P1|.<br>No unauthorized<br>contact pathway is<br>exposed|
|Preferred<br>Pharmacy|Patient pharmacy<br>preference|<br>View/update<br>preferred<br>pharmacy where<br>ittd|Pharmacy/patient<br>preference API|Location/search<br>assistance|Ye<br>s|Yes|P1|.<br>Saved preference<br>matches<br>portal/EMR source.|
|Patient<br>Documents<br>Upload|Upload records to<br>patient vault|perme<br>Camera/files<br>upload|Document API/object<br>storage|Scan/crop/OCR<br>candidate metadata|Ye<br>s|Yes|P0|Uploaded file<br>appears in portal<br>with same<br>|
|Consent &<br>Legal<br>Documents|Portal captures required<br>consents/terms|Mobile consent<br>review and<br>acceptance|Consent/versioning API|Native<br>signature/acknowledg<br>ment where approved|Ye<br>s|Yes|P0|metadata/status.<br>Same consent<br>version and audit<br>trail across<br>channels|
|Audit /<br>|Backend records<br>|Patient-facing<br>|Audit API|Push for high-risk<br>|Ye|Yes|P1|.<br>Only approved<br>|
|Access<br>History|sharing/access events<br>where available|access history<br>later||security events|s|||audit events are<br>patient-visible.|



### **37. Mobile-Native Enhancements Layer** 

These are features that should extend an existing portal capability because the patient is using a smartphone. They must not create a second source of truth. 

- Biometric authentication: Face ID, Touch ID and Android biometrics. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

- Push notifications and deep links into the exact portal-equivalent mobile screen. 

- Camera document scanning and image upload. 

- Apple HealthKit and Android Health Connect integration for approved vitals and wellness data. 

- Bluetooth/connected medical device integration. 

- QR-based health passport, temporary sharing and clinic check-in. 

- Location access for DispatchCare/emergency workflows only with explicit consent. 

- Limited encrypted offline Emergency Profile. 

- Native add-to-calendar, file sharing and document export actions. 

- Voice input for accessibility and symptom/vital entry with confirmation. 

### **38. MyChart-Benchmarked Good-to-Have Layer** 

The previously documented MyChart-benchmarked features should be treated as enhancements to the existing patient portal ecosystem. If HHA decides to adopt one, the preferred approach is to add the capability to the shared backend/API and expose it through both the portal and mobile app whenever practical. 

- Secure care-team messaging. 

- Prescription refill requests. 

- Digital care plans / Care Companion-style tasks. 

- Pre-visit questionnaires. 

- Preventive care and care-gap reminders. 

- Wait list / earlier appointment offers. 

- eCheck-In. 

- Asynchronous e-Visits. 

- Proxy/family access. 

- Provider/care-team directory. 

- Cost estimates and richer billing summary. 

- Patient-facing access history. 

- Patient education library. 

- Passkeys/passwordless login. 

- AI record navigation and approved result explanations. 

### **39. Data Consistency & Synchronization Rules** 

- The mobile app must never maintain an independent clinical master record. 

- All writes must use approved backend APIs/services rather than direct database access. 

- Use server-generated identifiers as authoritative identifiers. 

- Handle retries idempotently so poor connectivity does not create duplicate appointments, payments, uploads or messages. 

- Show sync state when a mobile action has not yet been confirmed by the server. 

- Resolve conflicts using backend-defined rules; the mobile client must not silently overwrite newer server data. 

- Use consistent publication/release rules for clinical notes, results, prescriptions and AVS. 

- Use a shared notification/event model so portal, email, SMS, push and in-app notifications remain coordinated. 

### **40. Developer Discovery Checklist Before Build** 

- Inventory every current patient-portal screen and patient-facing workflow. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

Health-Hub Africa® | MyHealth Vault+™ Mobile Application 

- Document the API/backend source for each portal function. 

- Identify any portal screens currently implemented with server-rendered logic that need an API before native mobile implementation. 

- Identify portal-only functionality that should intentionally remain web-only. 

- Identify functionality that should receive a native mobile enhancement. 

- Confirm authentication/token strategy for native apps. 

- Confirm staging/UAT environment parity with the patient portal. 

- Create test users representing each subscription/entitlement state. 

- Create a traceability matrix from portal requirement → API → iOS screen → Android screen → test case. 

### **41. Updated Definition of Done for the Mobile Companion** 

- All agreed P0 patient-portal functions have a tested mobile equivalent or an explicitly approved exception. 

- The same patient identity, data and business rules are used across web, iOS and Android. 

- No separate mobile-only patient record or duplicate clinical workflow has been introduced. 

- Mobile-native features extend the portal safely without bypassing backend controls. 

- Portal actions are reflected in mobile and mobile actions are reflected in portal after backend confirmation. 

- iOS and Android meet the same functional acceptance criteria unless an intentional platform-specific exception is documented. 

- HHA signs a formal Portal Parity UAT report before production release. 

CONFIDENTIAL — Developer Requirements | healthubafrica.com 

