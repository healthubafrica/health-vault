**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

**HEALTH-HUB AFRICA®** 

# **MyHealth Vault+™ Patient Portal Analytics Implementation & Configuration Specification** 

|**Granular Demographics • Location • IP/Session • Clickstream • Funnel • Engagement • Conversion**<br><br>|
|---|
|**Audience**<br>MyHealth Vault+ Development, QA, Product, Security &<br>Operations Teams|
|**Scope**<br>Patient Portal only — not detailed EMR clinical analytics|
|**Priority**<br>HIGH / FOUNDATIONAL PRODUCT ANALYTICS|
|**Primary Objective**<br>Measure who uses the portal, where they access it, what they<br>click, how they navigate, where they abandon, and what<br>actions convert.|
|**Version**<br>1.0 — September 2026|



_Development mandate: instrument the patient journey at event level; derive trusted KPIs from those events; expose only appropriately governed data._ 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **1. Scope and Architectural Boundary** 

This specification applies to the MyHealth Vault+ patient-facing web/mobile portal and the digital journey surrounding it. It covers anonymous visitors, registered patients, authenticated sessions, portal navigation, demographic segmentation, declared and inferred geography, clickstream behavior, appointments initiated from the portal, record interactions, messaging, results, vitals, symptom checker, subscriptions, payments, support interactions, acquisition attribution and technical experience. 

Detailed EMR clinical documentation analytics—such as provider note completeness, diagnosis quality or internal clinical workflow performance—remain outside this portal analytics specification. The portal may consume outcome events such as appointment_completed or result_available when needed to measure the patient journey. 

## **2. Mandatory Analytics Layers** 

|**Layer**|**Purpose**|**Required Output**|
|---|---|---|
|Raw Event Layer|Immutable/append-oriented capture of<br>portal interactions|Page views, clicks, sessions,<br>authentication, funnel and transaction<br>events|
|Identity & Dimension Layer|Consistent attributes used for<br>segmentation|Patient, anonymous visitor,<br>demographic, location, device, source,<br>plan|
|Metric Layer|Governed KPI calculations|Registrations, activation, CTR,<br>conversion, retention, sessions, clicks|
|Dashboard Layer|Role-appropriate visualization and drill-<br>down|Executive, growth, geography,<br>engagement, funnel, experience|
|Alert/Intelligence Layer|Detect material changes and friction|OTP failure spikes, booking<br>abandonment, unusual access, error<br>increases|



## **3. Patient Demographics — Required Data Dictionary** 

Demographic analytics must distinguish values explicitly supplied by the patient from values derived by the platform. The source of every demographic attribute must be recorded. 

|**Field**|**Type / Example**|**Analytics Use**|**Rule**|
|---|---|---|---|
|patient_id|Internal UUID / HHA ID|Join key|Never use patient name as<br>analytics key|
|date_of_birth|Date|Age calculation|Restricted; dashboards<br>should generally use age<br>bands|
|age_at_event|Integer|Historical segmentation|Calculate at event/report<br>date|
|age_band|0–4, 5–12, 13–17, 18–24, 25–34,<br>35–44, 45–54, 55–64, 65+|Dashboard segmentation|Configuration-driven|
|sex_or_gender|As collected by portal|Demographic segmentation|Use portal's approved<br>terminology|
|nationality|Country value|Population profile|Patient-declared|
|preferred_language|e.g., English|UX/communications|Patient-declared|
|marital_status|If collected|Optional segmentation|Do not make mandatory<br>solely for analytics|
|occupation|If collected|Optional segmentation|Controlled/free text as<br>product decides|
|employer_or_group|If applicable|Corporate cohort|Reference ID preferred|
|subscription_plan|Free/paid tier|Commercial segmentation|Effective-dated|
|patient_type|Individual/corporate/partner/etc.|Cohort analysis|Controlled vocabulary|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

|registration_date|Timestamp|**HEALTH-HUB AFRICA®  |  M**<br>Cohort definition|**YHEALTH VAULT+™ PATIENT PORTAL**<br>Server timestamp|
|---|---|---|---|
|registration_source|Direct/partner/campaign/staff-<br>assisted|Acquisition|Persist first-touch and last-<br>touch where supported|



## **4. Location Analytics — Declared vs Access Location** 

The system MUST maintain separate location concepts. Patient-declared residence/location must never be overwritten by IPderived access location. 

### **4.1 Patient-Declared Location** 

- Country 

- State / province / region 

- LGA / county / district where applicable 

- City / town 

- Postal code where collected 

- Neighborhood/community where collected 

- Address verification status if the product later implements verification 

### **4.2 Access Location Derived from Network Session** 

|**Field**|**Example**|**Implementation Note**|
|---|---|---|
|source_ip|IPv4/IPv6|Capture server-side from trusted proxy<br>chain|
|ip_country_code|NG|GeoIP-derived|
|ip_country_name|Nigeria|GeoIP-derived|
|ip_region_code|LA|GeoIP-derived where supported|
|ip_region_name|Lagos|GeoIP-derived|
|ip_city|Lagos|Approximate only|
|ip_postal_code|Optional|Do not present as precise patient<br>location|
|ip_latitude / longitude|Approximate centroid if provider supplies|Prefer aggregation; do not imply GPS<br>precision|
|ip_timezone|Africa/Lagos|Useful for behavior/time analysis|
|network/asn|Optional|Security/diagnostics if justified|
|geo_provider|Provider/version|Supports reproducibility|
|geo_accuracy_level|Country/region/city/unknown|Communicate uncertainty|



IP geolocation is approximate and may reflect VPNs, proxies, mobile carrier gateways or enterprise networks. It must not be treated as verified physical location. 

### **4.3 Location Drill-Down** 

Authorized aggregate dashboards must support Country → State/Region → City/LGA where data quality permits. For each level show visitors, registrations, verified users, active users, sessions, clicks, appointments initiated, successful bookings, payments, conversion rate and retention. Suppress or aggregate very small groups where necessary to reduce re-identification risk. 

### **4.4 Declared-vs-Access Analysis** 

- Declared country vs access country 

- Declared state vs access region 

- Diaspora/remote access cohort based on configured business rules 

- Unexpected access-location changes for security review 

- Conversion by declared location and independently by access location 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **5. IP Address Capture & Governance** 

Raw IP addresses may be useful for security, fraud detection, session investigation and geographic derivation, but they can constitute personal data. They must therefore be treated as restricted telemetry, not as a routine executive-dashboard dimension. 

|**Control**|**Required Configuration**|
|---|---|
|Capture point|Server/API gateway after trusted proxy handling; do not trust<br>arbitrary client-supplied X-Forwarded-For|
|Storage|Restricted security/telemetry field; encrypted at rest where<br>architecture supports it|
|Dashboard display|Default masked/truncated; full IP only for authorized<br>security/support roles with legitimate need|
|Analytics use|Prefer derived country/region/city and pseudonymous/session<br>aggregates|
|Retention|Configuration-driven and approved by HHA<br>privacy/security/legal governance|
|Access logging|Log access/export of raw IP datasets|
|Export|Exclude full IP from routine business exports by default|
|Deletion/rights workflow|Design so telemetry can be located and handled according to<br>applicable policy/law|



Do not store passwords, access tokens, authentication secrets or raw session tokens in analytics. Use a salted/secure hash or separate analytics session identifier for correlation. 

## **6. Anonymous Visitor, Patient and Session Identity** 

|**Identifier**|**Purpose**|**Configuration**|
|---|---|---|
|anonymous_visitor_id|Pre-login journey|First-party pseudonymous identifier;<br>rotate/expire according to policy|
|patient_id|Authenticated patient|Internal stable ID; no email/name as<br>event key|
|analytics_session_id|Group events into a visit|Random identifier separate from<br>authentication session|
|auth_session_reference|Security correlation|Hashed/pseudonymous reference only if<br>needed|
|device_id|Optional repeat-device analysis|Use only if product/privacy policy<br>permits|
|event_id|Deduplication|Globally unique UUID|
|trace_id|Technical correlation|Correlate front-end/API errors where<br>implemented|



On successful registration/login, the platform may link eligible pre-authentication events to the authenticated patient only where the privacy/consent design permits. The implementation must document this identity stitching behavior. 

## **7. Session Analytics** 

|**Metric/Event**|**Definition / Capture**|
|---|---|
|session_start|First qualifying activity after session creation|
|session_end|Explicit logout or inferred timeout|
|session_duration|session_end − session_start, with rules for abandoned<br>sessions|
|pages_per_session|Count of qualifying page_view events|
|clicks_per_session|Count of qualifying click events|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

|entry_page|First qualifying page|
|---|---|
|exit_page|Last qualifying page|
|engaged_session|Configurable: e.g., meaningful event or minimum engagement|
|bounce / single-page session|Define explicitly; do not mix SPA behavior with legacy bounce<br>formulas|
|inactivity_timeout|Configured portal timeout used for sessionization|
|returning_session|Session from previously known eligible visitor/patient|



## **8. Clickstream Analytics — Mandatory** 

The development team must not implement a single global click counter. Every meaningful interactive element must emit a structured event so HHA can count, segment and reconstruct navigation behavior. 

### **8.1 Standard Click Event Schema** 

|**Field**|**Example**|
|---|---|
|event_name|ui_click|
|event_id|UUID|
|event_timestamp|ISO-8601 UTC|
|patient_id|Internal ID or null|
|anonymous_visitor_id|Pseudonymous ID|
|analytics_session_id|Session UUID|
|page_name|dashboard|
|page_path|/portal/dashboard|
|feature_area|appointments|
|element_id|book_telecare_btn|
|element_name|Book TeleCare|
|element_type|button/card/link/menu/tab|
|action|click|
|destination|/appointments/new|
|previous_page|/portal/dashboard|
|position|hero / nav / card-2|
|campaign_context|Optional|
|device_category|mobile/desktop/tablet|
|browser|Chrome|
|os|Windows/iOS/Android|
|viewport_bucket|Configured bucket|
|ip_geo_country|NG|
|ip_geo_region|Lagos|
|ip_geo_city|Lagos|
|event_version|1|



### **8.2 Elements That Must Be Instrumented** 

- Primary and secondary CTA buttons 

- Navigation menu items 

- Dashboard cards 

- Book Appointment / TeleCare / service CTAs 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Upload/View/Share Record controls 

- Lab result/view/download controls 

- Vitals entry/device-sync controls 

- Messages/support controls 

- Symptom Checker controls 

- Subscription/pricing/upgrade controls 

- Payment/checkout controls 

- Profile completion prompts 

- Notification links 

- Search results and zero-result actions 

- Help/FAQ/contact-support actions 

- Outbound partner links where appropriate 

### **8.3 Click Metrics** 

- Total clicks 

- Unique clickers 

- Clicks per patient 

- Clicks per session 

- Clicks per page 

- Clicks per feature 

- CTA impressions 

- CTA clicks 

- Click-through rate = unique/qualified clicks ÷ qualified impressions 

- First click in session 

- Last click before exit 

- Clicks before conversion 

- Dead-click/error-click count where detectable 

- Repeated/rage-click indicator only if explicitly designed and privacy-reviewed 

### **8.4 Click Path / Journey** 

Store ordered event timestamps so analytics can reconstruct journeys such as Home → TeleCare → Provider/Slot → Checkout → Confirmation. Provide top paths, path-to-conversion, path-to-abandonment, median steps to conversion and most common exit point. 

## **9. Page & Content Analytics** 

|**Metric**|**Definition**|
|---|---|
|page_view|Route/page becomes viewable under defined SPA routing rules|
|unique_page_view|Unique visitor/session/patient definition must be documented|
|time_on_page|Engaged time rather than raw tab-open time where feasible|
|scroll_depth|25/50/75/90/100% buckets for long content where useful|
|entry_page|First page in session|
|exit_page|Last page in session|
|page_conversion|Qualifying conversions attributable to page|
|page_error_rate|Page/API failures ÷ qualifying views|
|search_query|Sanitized portal search term; prevent PHI leakage into general<br>analytics|
|zero_result_search|Search with no matching result|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **10. Device, Browser & Technology Dimensions** 

- Device category: desktop/mobile/tablet 

- Operating system and major version 

- Browser and major version 

- Web vs mobile app 

- App version/build where applicable 

- Viewport/screen-size bucket 

- Connection/network category only if legitimately available and required 

- Language/locale 

- Timezone 

Do not implement invasive device fingerprinting merely to improve analytics. Use standard first-party telemetry and approved identifiers. 

## **11. Acquisition & Attribution** 

|**Field**|**Examples**|
|---|---|
|referrer_domain|google.com / partner domain|
|referrer_url|Sanitized; strip sensitive query parameters|
|landing_page|First portal/public page|
|utm_source|google / whatsapp / linkedin|
|utm_medium|cpc / social / referral|
|utm_campaign|campaign identifier|
|utm_term|Optional|
|utm_content|Creative/CTA variant|
|partner_code|Partner attribution|
|qr_code_id|Campaign/location QR|
|referral_code|Approved referral mechanism|
|first_touch_source|First known acquisition source|
|last_touch_source|Most recent source before conversion|



Persist attribution through registration and conversion so HHA can compare not only traffic but qualified registrations, appointments, paid conversions and retained users by source. 

## **12. Registration & OTP Funnel** 

|**Stage**|**Required Events / Fields**|
|---|---|
|Landing|landing_view; source/campaign/device/location|
|Registration Start|registration_start|
|Details|registration_step_view / registration_step_complete|
|OTP Request|otp_requested; channel; attempt number|
|OTP Delivery|otp_delivery_success/failure; latency; provider code|
|OTP Verify|otp_verify_success/failure; attempt count; failure reason|
|Consent|terms_viewed/accepted; privacy_notice_viewed; consent<br>state/version where applicable|
|Account Created|registration_complete|
|Profile|profile_completion_percent; required fields missing|
|First Login|login_success|
|Activation|first_meaningful_action|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

Dashboard must show counts, unique users, conversion %, abandonment %, median elapsed time, error rate and retry rate at every stage, segmented by country, state/region, device, browser, source and campaign. 

## **13. Patient Activation** 

Define portal activation as a completed registration followed by at least one approved meaningful health action within a configurable period. Qualifying actions may include booking an appointment, uploading a record, viewing a result, entering vitals, sending a message, completing the symptom checker, sharing a record, or activating a paid plan. 

Activation Rate = Activated Patients ÷ Completed Registrations × 100. The qualifying-event list and activation window must be configurable and versioned. 

## **14. Appointment & Service Conversion from Portal** 

Instrument the portal-facing journey even when fulfillment occurs in another system. 

- appointments_page_view 

- service_selected 

- provider_or_service_option_viewed 

- slot_search 

- slot_impression 

- slot_selected 

- booking_started 

- booking_validation_error 

- checkout_started 

- payment_attempted 

- payment_success/payment_failure 

- booking_confirmed 

- booking_cancelled 

- booking_rescheduled 

- appointment_outcome_received 

Required metrics: service-page CTR, slot-selection rate, booking-start rate, booking-completion rate, payment success rate, abandonment by step, time to booking, clicks to booking and conversion by demographic/location/source/device. 

## **15. Feature-Specific Analytics** 

|**Feature**|**Minimum Events**|
|---|---|
|Medical Records|records_view, upload_start/success/failure, record_view,<br>download, share_start/success|
|Results|result_available, notification_clicked, result_view,<br>result_download/share|
|Vitals/RPM|vitals_page_view, manual_entry_start/success,<br>sync_start/success/failure, trend_view|
|Messaging|message_compose, send_success/failure, thread_view,<br>reply_view|
|Symptom Checker|start, question_step, abandon, complete,<br>recommendation_view, CTA_click, booking_conversion|
|Emergency ID|view, edit, share/access event as product permits|
|Subscription|pricing_view, plan_compare, plan_select, checkout_start,<br>payment, activation, renewal, downgrade/cancel|
|Support|help_view, FAQ_view, support_start, ticket_created, resolution<br>event|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **16. Retention, Dormancy & Cohorts** 

- D1/D7/D30/D60/D90 retention where appropriate 

- Weekly/monthly returning users 

- Time to second session 

- Time to second meaningful action 

- Time to second service booking 

- Dormancy thresholds configurable by product 

- Reactivation after notification/campaign 

- Retention by registration cohort, location, source, device, plan and first feature used 

Cohort definitions must be immutable/versioned so historical retention reports do not change silently when business rules are modified. 

## **17. Engagement Score** 

If HHA implements an Engagement Score, it must be transparent and configurable rather than a hidden AI score. Example weighted signals may include recent login, profile completion, appointment booking, record upload, result view, vitals entry, messaging, subscription and repeat service use. 

- Store score version 

- Store component contributions 

- Do not include sensitive demographic attributes as hidden scoring weights 

- Define categories such as Highly Engaged, Engaged, Low Engagement, At Risk and Dormant 

- Allow Customer Success to drill into qualifying behaviors without exposing unnecessary clinical information 

## **18. Executive & Product Dashboards** 

|**Dashboard**|**Core Views**|
|---|---|
|Executive Portal Overview|Visitors, registrations, verified users, activated patients, MAU,<br>bookings, paid conversions, retention, top locations, top<br>features|
|Demographics & Geography|Age bands, sex/gender as collected, nationality, declared<br>country/state/LGA/city, access country/region/city, conversion<br>by geography|
|Acquisition & Funnel|Sources, campaigns, landing pages, registration/OTP funnel,<br>activation, appointment/payment funnel|
|Engagement & Clickstream|Sessions, clicks, unique clickers, pages/session, feature<br>adoption, top CTAs, paths, exits|
|Appointments & Services|Service interest, booking funnel, abandonment, conversion by<br>segment|
|Subscriptions & Payments|Pricing views, plan selection, checkout, success/failure,<br>upgrades, churn|
|Digital Experience|Device/browser, page speed, API errors, upload failures,<br>search zero-results, support activity|
|Security/Telemetry|Login failures, unusual location changes, IP/session<br>investigation — restricted role|



## **19. Mandatory Dashboard Filters** 

- Today / Yesterday / 7 Days / 30 Days / Month / Quarter / YTD / Custom 

- Country 

- State/region 

- City/LGA where reliable 

- Declared vs access location 

- Age band 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Sex/gender as collected 

- Nationality 

- Patient type 

- Subscription plan 

- New vs returning 

- Acquisition source 

- Campaign 

- Device 

- OS 

- Browser 

- Feature 

- Service 

- Anonymous vs registered vs activated 

Every filter must use governed dimension values. Free-text variants such as 'Lagos', 'lagos state' and 'LAGOS' must be normalized before reporting. 

## **20. Recommended Event Storage Model** 

Implement an append-oriented analytics event table or event stream separate from the core transactional patient tables. A representative logical schema is below; actual technology may vary. 

|**Column**|**Suggested Type / Rule**|
|---|---|
|event_id|UUID, primary/deduplication key|
|event_name|VARCHAR / controlled taxonomy|
|event_version|INTEGER|
|occurred_at_utc|TIMESTAMP|
|received_at_utc|TIMESTAMP|
|patient_id|Nullable internal ID|
|anonymous_visitor_id|Nullable pseudonymous ID|
|analytics_session_id|UUID|
|page_name / page_path|Sanitized|
|feature_area|Controlled vocabulary|
|element_id / element_type|For interaction events|
|action / outcome|Controlled vocabulary|
|source / campaign fields|Nullable attribution|
|device/browser/os fields|Normalized dimensions|
|declared_geo_keys|References to patient-declared dimensions|
|access_geo fields|IP-derived country/region/city|
|raw_ip_reference|Restricted field/table or encrypted value, architecture-<br>dependent|
|properties|JSON/structured extension with schema governance|
|ingestion_source|web/mobile/server|
|environment|production/staging/test|
|is_test_event|Boolean|



Production analytics must exclude staging/test users and synthetic monitoring by default while preserving an explicit classification so QA can validate telemetry. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **21. Event Naming & Versioning Standard** 

Use lowercase snake_case event names. Names describe completed observations, not UI labels. Examples: page_view, ui_click, registration_start, otp_requested, otp_verify_success, profile_completed, appointment_booking_started, payment_success, record_upload_success. 

- Never rename an event silently after release 

- Increment event_version when payload meaning changes 

- Maintain an event catalog with owner, trigger, fields, allowed values and sample payload 

- Deprecated events remain documented with retirement date 

- Front-end and server events must have clear ownership to prevent double counting 

## **22. Front-End Instrumentation Configuration** 

- Create a central analytics SDK/service wrapper rather than scattered ad-hoc logging calls. 

- Route changes in a single-page application must emit one governed page_view according to defined rules. 

- Reusable components must accept stable analytics element IDs; do not derive identity solely from visible button text. 

- Emit impression events only when the element satisfies the product's visibility rule. 

- Debounce duplicate click events and use event_id/idempotency rules where server ingestion may retry. 

- Queue events asynchronously so analytics failure does not block patient workflows. 

- Support offline/retry behavior for mobile only with bounded queues and duplicate protection. 

- Never place PHI, passwords, access tokens, free-form clinical text or full record contents in generic analytics properties. 

- Add environment and app-version fields to every event. 

## **23. Server-Side / API Instrumentation** 

- Use server-side events for authoritative outcomes such as registration_complete, otp delivery result, payment result and booking confirmation. 

- Do not rely solely on browser clicks to count completed transactions. 

- Capture trusted request IP using the documented reverse-proxy/load-balancer chain. 

- Normalize timestamps to UTC; retain user/local timezone as a dimension. 

- Generate correlation/trace IDs for troubleshooting where supported. 

- Validate event payload schemas server-side; reject or quarantine malformed events. 

- Apply rate limiting and abuse protection to telemetry ingestion endpoints. 

- Ensure telemetry ingestion failure is observable but does not break core patient care workflows. 

## **24. GeoIP Configuration** 

- Select an approved GeoIP provider/database and document licensing, update frequency and data-processing implications. 

- Perform geolocation server-side where feasible. 

- Store provider/database version or lookup date for reproducibility. 

- Normalize ISO country codes and approved state/region codes. 

- Map Nigeria state values to a controlled reference table; maintain LGA reference data separately when declared by the patient. 

- Do not infer LGA from IP unless the chosen provider reliably supplies an equivalent and HHA explicitly accepts the accuracy limitations. 

- Cache lookups where appropriate to reduce latency/cost. 

- Handle unknown/private/reserved IP ranges explicitly. 

- Treat VPN/proxy indicators as security context, not proof of patient location. 

## **25. Data Warehouse / Aggregation Configuration** 

Operational dashboards should read from analytics-optimized aggregates/materialized views or a warehouse rather than repeatedly scanning high-volume raw clickstream data. 

- Hourly/daily aggregate tables for page, click, feature, geography and funnel metrics 

- Distinct-user counting strategy documented 

- Late-arriving events handled consistently 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Timezone conversion performed at reporting layer using a defined business timezone 

- Backfill/reprocessing procedure documented 

- Metric jobs idempotent 

- Data freshness timestamp displayed on dashboards 

- Reconciliation job compares critical portal outcomes to transactional source records 

## **26. KPI Definitions — Minimum Required** 

|**KPI**|**Formula / Rule**|
|---|---|
|Registration Conversion|registration_complete unique users ÷ registration_start unique<br>users|
|OTP Verification Rate|otp_verify_success users ÷ otp_requested users|
|Activation Rate|activated patients ÷ completed registrations|
|MAU|Unique eligible patients with qualifying activity in<br>rolling/configured 30-day period|
|Clicks per Session|Qualifying ui_click events ÷ eligible sessions|
|Feature Adoption|Unique active patients using feature ÷ eligible active patients|
|CTA CTR|Qualified unique clicks ÷ qualified impressions|
|Booking Conversion|booking_confirmed users ÷ booking_started users|
|Payment Success|Successful payment attempts ÷ eligible payment attempts|
|D30 Retention|Eligible cohort members active in defined D30 window ÷<br>eligible cohort size|
|Location Conversion|Converted users in location ÷ eligible visitors/registrants in<br>same location|
|Error Rate|Failed qualifying actions ÷ total qualifying attempts|



For every KPI, the team must document numerator, denominator, exclusions, timestamp basis, dimensions, refresh interval, owner and version. 

## **27. Drill-Down Requirements** 

Aggregates must drill into progressively more detailed aggregate dimensions. Patient-level drill-down must be restricted to roles with legitimate operational need. 

- Country → State/Region → City/LGA 

- Source → Campaign → Landing Page 

- Feature → Page → Element/CTA 

- Funnel → Stage → Error/abandonment reason 

- Device → OS → Browser/version 

- Date → Day → Hour 

General executives should not need raw IP addresses or patient-level click histories to answer routine business questions. 

## **28. Privacy, Consent & Security Configuration** 

Before production release, HHA must document the lawful/privacy basis for each category of portal telemetry and update the patient-facing privacy/cookie disclosures where required. Analytics and security telemetry must be separated conceptually so optional product analytics controls do not disable security logging required to protect accounts. 

- Classify each event property as public, internal, personal, sensitive/restricted or prohibited. 

- Apply data minimization: collect only fields tied to a documented analytics/security purpose. 

- Restrict raw IP and patient-linked clickstream access through RBAC. 

- Encrypt telemetry in transit and protect at rest. 

- Audit access to restricted telemetry. 

- Define retention by data class rather than retaining all raw clickstream indefinitely. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Support de-identification/aggregation for long-term trend reporting. 

- Do not send sensitive health content to third-party analytics platforms without explicit architectural, privacy and contractual approval. 

- Never log passwords, OTP values, access tokens, secret keys, raw authentication cookies/session tokens or payment-card data. 

- Sanitize URLs/referrers/query strings so PHI or tokens cannot leak into analytics. 

## **29. Security Monitoring Rules** 

- Repeated failed login by patient/account 

- High-volume failures across many accounts from one or rotating IPs 

- Rapid country/region changes where materially suspicious 

- Concurrent or anomalous sessions based on approved rules 

- Password-reset abuse 

- OTP abuse/resend spikes 

- Unauthorized access responses 

- Telemetry tampering/schema abuse 

- Unexpected export of restricted analytics 

Security alerts must not automatically classify legitimate diaspora/VPN/travel behavior as malicious; they should create reviewable signals. 

## **30. QA & Validation Plan** 

|**Test Area**|**Acceptance Test**|
|---|---|
|Click instrumentation|Each governed CTA emits exactly one correct event per<br>qualifying click|
|Page views|SPA navigation does not double-count route views|
|Identity|Anonymous events remain pseudonymous and authorized<br>stitching works as designed|
|IP|Trusted proxy logic records correct client source; spoofed<br>headers are not accepted blindly|
|GeoIP|Known test IPs map to expected country/region within provider<br>limitations|
|Funnel|Synthetic journey reconciles stage counts and abandonment|
|Transactions|Server-authoritative booking/payment outcomes reconcile with<br>source system|
|Filters|Country/state/device/source filters return consistent totals|
|Deduplication|Retries do not inflate counts|
|Test exclusion|Staging/synthetic accounts excluded from production KPI<br>defaults|
|Privacy|Prohibited fields do not appear in payloads/logs|
|RBAC|Unauthorized roles cannot view raw IP/patient-linked<br>clickstream|
|Performance|Analytics does not materially delay portal interaction|
|Failure mode|Telemetry outage does not block login, booking, payment or<br>record access|



## **31. Implementation Phases** 

|**Phase**|**Scope**|**Exit Criteria**|
|---|---|---|
|Phase 0 — Governance|Metric/event dictionary, privacy<br>classification,RBAC,retention,|Approved specification and ownership|



Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

||declared-vs-access location model||
|---|---|---|
|Phase 1 — Foundation|Analytics SDK, event API,<br>identity/session model, raw event store,<br>GeoIP, environment tagging|Validated end-to-end event pipeline|
|Phase 2 — Core Journey|Page views, clicks, registration, OTP,<br>profile, login, acquisition|Registration/click dashboards reconcile|
|Phase 3 — Conversion|Appointments, services, records,<br>results, messaging,<br>subscription/payment events|Feature and conversion funnels<br>operational|
|Phase 4 — Geography & Cohorts|Country/state/city/LGA, demographics,<br>cohorts, retention|Drill-down and segmentation validated|
|Phase 5 — Experience & Alerts|Performance/errors, support,<br>anomaly/security rules|Operational alerts and experience<br>dashboard|
|Phase 6 — Intelligence|Trend detection,<br>forecasting/recommendations after<br>sufficient trusted history|Governed intelligence with traceable<br>evidence|



## **32. Development Deliverables** 

- Patient Portal Analytics Architecture Diagram 

- Event Taxonomy & Versioned Event Catalog 

- Demographic and Location Data Dictionary 

- Clickstream Instrumentation Map listing every tracked page/CTA/element 

- Identity and Sessionization Design 

- GeoIP Configuration Document 

- Database/Event Schema and aggregation design 

- KPI Dictionary with formulas 

- Dashboard wireframes 

- RBAC Matrix including raw-IP access 

- Privacy/Data Classification & Retention Matrix 

- QA test cases and automated telemetry tests 

- Data reconciliation plan 

- Monitoring/runbook for analytics pipeline failures 

- Production rollout and rollback plan 

## **33. Go-Live Acceptance Gate** 

The patient-portal analytics implementation must not be accepted based on dashboard appearance alone. The team must demonstrate an end-to-end test for representative journeys: 

- Anonymous visitor → registration → OTP → account creation → first login 

- Patient → dashboard → TeleCare CTA → booking → payment → confirmation 

- Patient → medical records → upload → successful completion 

- Patient → result notification → result view 

- Patient → subscription page → checkout → successful/failed payment 

- Access from controlled test locations/devices to validate geography and device segmentation 

For each journey, QA must show the raw events, identity/session linkage, derived dimensions, KPI calculation, dashboard rendering and applicable access controls. 

## **34. Required Management Questions the System Must Answer** 

- How many people visited the portal today, this week and this month? 

- How many were anonymous, registered, verified, activated and returning? 

- What countries are users accessing from? Which states/regions and cities are most active? 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Where do registered patients say they live, and how does that differ from access geography? 

- How many clicks occurred overall, per session, per patient, per page and per feature? 

- What are the top 20 buttons/cards/links by clicks and by unique clickers? 

- What percentage of users who saw a CTA clicked it? 

- What are the most common paths through the portal? 

- Where do users exit or abandon registration and booking? 

- Which demographic and geographic cohorts convert best? 

- Which sources/campaigns produce registrations, appointments, payments and retained patients? 

- What devices/browsers produce the most errors or abandonment? 

- How many patients are active, dormant and reactivated? 

- Which portal features are adopted and which are ignored? 

- Are OTP, booking, upload, payment or page errors increasing? 

- Can authorized security personnel investigate a suspicious session/IP without exposing raw IP broadly? 

## **35. Final Development Direction** 

The patient portal must be instrumented as a measurable digital health product. HHA must be able to understand WHO is using MyHealth Vault+, WHERE users declare they are located, WHERE portal sessions appear to originate, WHAT users click, HOW they navigate, WHERE they encounter friction, WHICH features they adopt, WHAT converts them into active/paid/returning patients, and HOW these patterns change over time. 

Raw telemetry must remain governed. Demographics, IP-derived geography and clickstream data are valuable precisely because they are granular; therefore their collection, retention, access, export and use must be intentionally designed rather than treated as ordinary application logs. 

## **Appendix A — Example Event Payload (Logical)** 

event_name: ui_click event_version: 1 event_id: <uuid> occurred_at_utc: <timestamp> patient_id: <internal-id-or-null> anonymous_visitor_id: <pseudonymous-id> analytics_session_id: <uuid> page_name: dashboard page_path: /portal/dashboard feature_area: appointments element_id: book_telecare_btn element_type: button action: click destination: /appointments/new device_category: mobile browser_family: Chrome os_family: Android ip_geo_country_code: NG ip_geo_region: Lagos ip_geo_city: Lagos utm_source: <optional> utm_campaign: <optional> environment: production 

## **Appendix B — Implementation Note on Logging & Privacy** 

Industry security guidance recommends structured application logging with sufficient 'when, where, who and what' context, while avoiding unnecessary sensitive data and protecting logs against unauthorized access or tampering. Session correlation should avoid storing raw authentication session identifiers. IP addresses can be useful for detection and response but should be treated as 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** potentially identifying information. HHA should validate the final implementation against applicable privacy, healthcare, contractual and jurisdictional requirements before production. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

## **GLOBAL GEOGRAPHIC ANALYTICS MANDATE — WORLDWIDE REQUIREMENT** 

**This section supersedes any interpretation that the MyHealth Vault+™ geographic analytics model is Nigeria-centric. The Patient Portal analytics architecture MUST support worldwide use from inception.** 

The geographic model shall support all continents and countries/territories represented by the approved global geographic reference dataset. At the dashboard level, HHA must be able to begin at a World view and drill down through Continent → Country/Territory → State/Province/Region → Secondary Administrative Division → City/Locality, with postal area and approximate IPderived coordinates used only where available, appropriate, and privacy-governed. 

### **A. Supported Continents** 

- Africa 

- Asia 

- Europe 

- North America 

- South America 

- Oceania 

- Antarctica — supported when returned by the approved geographic dataset, even though routine patient volume is expected to be negligible. 

### **B. Mandatory Global Geographic Hierarchy** 

|**Level**|**Canonical Field**|**Examples**|**Implementation**<br>**Requirement**|
|---|---|---|---|
|0|world|World|Top-level global aggregate|
|1|continent|Africa, Europe, Asia, North<br>America, South America,<br>Oceania|Required for every resolvable<br>country/territory|
|2|country|Nigeria, United States, United<br>Kingdom, India, Brazil,<br>Australia|Use standardized country<br>code and display name|
|3|admin_level_1|State, Province, Region,<br>Emirate, Prefecture, etc.|Generic storage field;<br>country-specific display label|
|4|admin_level_2|County, LGA, District,<br>Department, Municipality,<br>etc.|Generic storage field; do not<br>hard-code 'LGA' globally|
|5|locality|City, Town, Locality|Use provider/reference data<br>where available|
|6|postal_area|ZIP/Postcode/Postal Code|Optional; privacy-governed|
|7|approx_geo|Approximate<br>latitude/longitude centroid|IP-derived only; never present<br>as GPS-precise location|



Country-specific terminology should be a presentation-layer label. For example, Nigeria may display State → LGA; the United States may display State → County; other jurisdictions may use Province, District, Department, Prefecture, Municipality, Parish, Canton, Emirate, or another equivalent. 

### **C. Global Geographic Reference Standards** 

Use ISO 3166-compatible country and principal subdivision identifiers as the canonical reference wherever supported by the selected data provider. The internal schema must not depend on English country names as keys. Store stable codes plus localized/display names. Reference datasets must be updateable because geopolitical and administrative names/codes can change. 

- country_code_alpha2 

- country_code_alpha3 where useful 

- country_numeric_code where useful 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- admin_level_1_code / standardized subdivision code where available 

- continent_code and continent_name 

- timezone 

- geo_reference_version / GeoIP database version 

- normalized display name and optional localized name 

### **D. Worldwide Declared Geography vs Access Geography** 

The system MUST preserve two independent geographic dimensions for every eligible patient/session: 

|**Dimension**|**Meaning**|**Examples**|
|---|---|---|
|Patient-Declared Geography|Residence/location supplied by the<br>patient|Nigeria → Lagos → Eti-Osa → Ikoyi|
|Portal Access Geography|Approximate geography inferred from<br>session IP|United States → Illinois → DuPage County<br>→ Naperville|



These values MUST NOT overwrite one another. The portal must support analysis of declared residence independently from access geography and allow authorized comparison between them. 

### **E. Global Geography Metrics at Every Drill-Down Level** 

- Visitors / unique visitors 

- Anonymous visitors 

- Registered patients 

- New registrations 

- OTP-verified patients 

- Activated patients 

- Active patients 

- Returning patients 

- Dormant/reactivated patients 

- Sessions 

- Total clicks 

- Unique clickers 

- Clicks per session 

- Page views 

- Average session duration 

- Top pages 

- Top features 

- CTA impressions and clicks 

- Click-through rate 

- Appointments initiated 

- Bookings completed 

- Booking conversion rate 

- Checkout starts 

- Successful payments 

- Paid conversions 

- Revenue where applicable 

- 7/30/60/90-day retention 

- Error/failure rate 

### **F. Required Global Maps & Visualizations** 

- Global Patient Distribution Map — based on patient-declared geography. 

- Global Portal Access Map — based on IP-derived access geography. 

- Global Registration Map — new registrations by country/region. 

- Global Engagement Map — sessions, clicks and active users. 

- Global Conversion Map — activation, booking and paid conversion rates. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Global Service Interest Map — TeleCare, MinuteCare, CareTest, HealthConsult, TravelSafe, DispatchCare portal interactions. 

- Global Acquisition Map — traffic and conversions by campaign/source and geography. 

Maps must support World → Continent → Country → administrative subdivision drill-down. Heatmaps must use aggregated values and must not expose exact patient addresses or raw IP coordinates. 

### **G. Worldwide Clickstream + Geography Correlation** 

Every qualifying click event should inherit the normalized geographic dimensions available for the session so HHA can answer questions such as: 

- Which continents generate the most portal traffic and clicks? 

- Which countries generate the most registrations? 

- Which states/provinces/regions have the highest activation rate? 

- Which cities/localities generate the highest appointment conversion? 

- Which features are most frequently used in each continent or country? 

- How many clicks are required to reach booking by geography? 

- Where is registration or OTP abandonment highest? 

- Which geographic cohorts are primarily mobile vs desktop? 

- Which campaigns produce retained patients in each country? 

- Where do diaspora access patterns differ from declared residence? 

### **H. Global Geo Event Fields — Required** 

|**Field**|**Requirement**|
|---|---|
|continent_code|Canonical continent identifier|
|continent_name|Display name|
|country_code_alpha2|Canonical country/territory code|
|country_code_alpha3|Optional standardized code|
|country_name|Display name|
|admin_level_1_code|State/province/region code where available|
|admin_level_1_name|State/province/region display name|
|admin_level_2_code|County/LGA/district equivalent where available|
|admin_level_2_name|Secondary subdivision display name|
|locality_name|City/town/locality|
|postal_area|Optional and restricted as needed|
|timezone|IANA-style timezone where provider supports|
|approx_latitude|Approximate GeoIP centroid only|
|approx_longitude|Approximate GeoIP centroid only|
|geo_accuracy_level|country/region/city/unknown|
|geo_source|declared / geoip / other approved source|
|geo_provider|Provider/database name|
|geo_provider_version|Database/version/date|



### **I. Global Normalization & Configuration Rules** 

- Do not hard-code Nigeria, Lagos, State, or LGA as universal schema concepts. 

- Use generic admin_level_1 and admin_level_2 storage concepts with jurisdiction-specific labels. 

- Normalize country identifiers using the approved international reference dataset. 

- Maintain aliases and normalization for user-entered geography without destroying the original patient-entered value. 

- Store UTC event timestamps and a separate timezone dimension. 

- Allow dashboards to render dates/times using HHA business timezone or selected geographic timezone. 

- Support IPv4 and IPv6. 

- Handle VPN, proxy, carrier NAT, private IP, reserved IP and unknown GeoIP results explicitly. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- 

- 

- 

   - Never infer exact home address from IP. 

   - Never use IP-derived city as a replacement for patient-declared city. 

   - Reference data updates must be deployable without application schema changes. 

- Historical events should preserve the normalized geographic values used at event time or sufficient version metadata for reproducibility. 

### **J. Global Dashboard Filters** 

- World / Continent / Country / Territory 

- State / Province / Region (Admin Level 1) 

- County / LGA / District / equivalent (Admin Level 2) 

- City / Locality 

- Declared Geography vs Access Geography 

- Timezone 

- Age Band 

- Sex/Gender as collected 

- Nationality 

- Patient Type 

- Subscription Plan 

- Anonymous / Registered / Verified / Activated / Returning 

- Acquisition Source / Campaign 

- Device / OS / Browser 

- Feature / CTA / Page 

- Date range and comparison period 

### **K. Global Geography QA / Acceptance Tests** 

|**Continent**|**Country**|**Admin Level 1 Example**|**Acceptance Objective**|
|---|---|---|---|
|Africa|Nigeria|Lagos|Verify<br>continent/country/admin1 and<br>Nigeria-specific LGA display|
|North America|United States|Illinois|Verify State and County-style<br>secondary subdivision support|
|Europe|United Kingdom|England|Verify non-Nigerian<br>administrative naming|
|Asia|India|Maharashtra|Verify state/region and locality<br>mapping|
|South America|Brazil|São Paulo|Verify diacritics/localized<br>names and hierarchy|
|Oceania|Australia|New South Wales|Verify<br>continent/country/state/locality|



QA must also validate unknown/reserved IPs, VPN/proxy scenarios, IPv6, missing city data, territories, Unicode/diacritics, timezone boundaries, daylight-saving behavior where relevant, and reference-data updates. 

### **L. Global Geographic Go-Live Acceptance Criteria** 

- A World-level dashboard is available. 

- All supported continents can be selected and drilled into. 

- Country-level analytics are not restricted to Nigeria. 

- Admin Level 1 works across countries using country-appropriate labels. 

- Admin Level 2 is generic in storage and can display LGA, County, District or equivalent. 

- Patient-declared and IP-derived access geography are independently reportable. 

- Click counts and unique clickers can be segmented by continent/country/region/city. 

- Registration, activation, booking and payment funnels can be segmented globally. 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

**HEALTH-HUB AFRICA®  |  MYHEALTH VAULT+™ PATIENT PORTAL** 

- Raw IP access remains restricted while derived geography is available to authorized business dashboards. 

- GeoIP uncertainty and missing values are handled without fabricating precision. 

- Global maps do not expose exact patient addresses or raw IP locations. 

- At least one QA journey from each major inhabited continent has been validated before production acceptance. 

### **M. Development Directive** 

**MyHealth Vault+™ must be built as a GLOBAL patient portal analytics platform. Nigeria is an important operating market, but the analytics data model, event schema, dashboards, GeoIP pipeline, clickstream segmentation and reporting hierarchy must support worldwide patient access without redesign.** 

Patient Portal Analytics Implementation & Configuration Specification  |  Confidential 

