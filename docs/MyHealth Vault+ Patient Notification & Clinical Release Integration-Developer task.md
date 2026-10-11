# **MyHealth Vault+ Multi-Channel Notification System** 

## **1. Objective** 

Build a centralized notification framework for MyHealth Vault+ that can notify patients through: 

- In-app notification 

- Patient portal notification 

- Email 

- SMS/text message 

The framework must be reusable for all major patient-facing events and must not require separate notification logic for each service. 

Initial priority use case: 

### **Published HHA After-Visit Summary** 

Future supported events should include: 

- Prescription ready 

- Lab result available 

- Appointment confirmation 

- Appointment reschedule 

- Appointment cancellation 

- Referral available 

- Document available 

- Care instruction available 

- Diagnostic result available 

- Subscription reminder 

- Payment reminder 

- Other patient-facing clinical updates 

- 

# **2. Core Design Principle** 

Use one centralized notification service. 

```
Clinical / Portal Event
        |
        v
```

1 

```
Notification Service
        |
        +------> Portal
        |
        +------> App
        |
        +------> Email
        |
        +------> SMS
```

Do not build separate notification engines for: 

• AVS • prescriptions • labs • appointments • subscriptions 

All modules should publish events into the same notification service. 

# **3. Notification Event Model** 

Every notification should originate from a structured event. 

Recommended event object: 

```
{
"event_type":"AVS_READY",
"patient_id":27,
"source_system":"openemr",
"source_record_id":"18",
"encounter_id":122,
"priority":"normal",
"created_at":"2026-08-12T03:00:00Z"
}
```

The notification service should determine: 

• recipient • channel • template • destination/deep link • delivery status • retry behavior 

2 

# **4. Supported Notification Channels** 

Support the following channel codes: 

```
IN_APP
PORTAL
EMAIL
SMS
```

App and portal may use the same backend notification record, but their UI presentation may differ. 

# **5. Patient Communication Preferences** 

Each patient should have notification preferences. 

Recommended fields: 

```
notify_in_app
notify_portal
notify_email
notify_sms
preferred_email
preferred_phone
notification_language
notification_quiet_hours
```

The notification engine must honor patient preferences unless the notification is classified as operationally mandatory. 

Do not assume consent for SMS or email. 

# **6. Notification Classes** 

Recommended categories: 

```
CLINICAL
APPOINTMENT
PRESCRIPTION
```

3 

```
LAB
DOCUMENT
SUBSCRIPTION
PAYMENT
GENERAL
```

This allows patients to manage notification preferences by category in the future. 

# **7. Event Types** 

Recommended initial event codes: 

```
AVS_READY
PRESCRIPTION_READY
LAB_RESULT_READY
APPOINTMENT_CREATED
APPOINTMENT_CHANGED
APPOINTMENT_CANCELLED
REFERRAL_READY
DOCUMENT_READY
CARE_INSTRUCTION_READY
SUBSCRIPTION_RENEWAL_DUE
SUBSCRIPTION_EXPIRED
PAYMENT_DUE
PAYMENT_FAILED
GENERAL_UPDATE
```

# **8. Notification Database Model** 

Create a centralized notification table. 

Recommended fields: 

```
id
patient_id
event_type
category
title
message
source_system
```

4 

```
source_record_id
encounter_id
action_url
priority
created_at
read_at
archived_at
metadata
```

Create a separate channel delivery table. 

Recommended fields: 

```
id
notification_id
channel
recipient
status
attempt_count
last_attempt_at
delivered_at
failed_at
provider_message_id
failure_reason
created_at
```

Recommended delivery statuses: 

```
pending
processing
delivered
failed
suppressed
```

# **9. Patient Portal Notification** 

Portal notification should include: 

- notification title 

- short safe message 

- unread/read indicator 

- date/time 

5 

• action button • deep link 

Example: 

```
Visit Summary Ready
Your TeleCare™ visit summary from
11 August 2026 is now available.
[View Visit Summary]
```

# **10. App Notification** 

If MyHealth Vault+ has a mobile app or progressive web app, the same notification record should appear in the application notification center. 

Do not maintain a separate notification database for app notifications. 

App display should use the same: 

```
notification_id
event_type
read status
action_url
```

# **11. Email Notifications** 

Email should notify the patient that information is available. 

Do not place unnecessarily detailed clinical information in email. 

Recommended example: 

Subject: 

```
Your MyHealth Vault+ Visit Summary Is Ready
```

Body: 

6 

```
Hello Samuel,
```

```
Your visit summary from your recent TeleCare™ consultation is now available in
MyHealth Vault+.
```

```
Sign in securely to review your visit summary and care instructions.
[View in MyHealth Vault+]
Health-Hub Africa
Speed. Agility. Access.
```

Do not include the full SOAP note, detailed diagnosis, sensitive lab result, or full medical history in the email. 

# **12. SMS/Text Notifications** 

SMS must remain short and privacy-conscious. 

Recommended: 

```
MyHealth Vault+: Your visit summary is now available. Sign in securely to review
it.
```

Avoid: 

```
Your diabetes diagnosis and metformin prescription are ready.
```

The SMS should direct the patient to authenticate before seeing clinical information. 

# **13. SMS Delivery Provider** 

The notification service should abstract the SMS provider. 

Create a provider interface such as: 

```
sendSms(phone, message)
```

7 

The rest of the application must not depend directly on a specific SMS vendor. 

This will allow HHA to change providers later without rewriting the notification engine. 

# **14. Email Delivery Provider** 

Similarly, use a mail service abstraction. 

Example: 

```
sendEmail(email, template, data)
```

Do not hard-code SMTP logic throughout the application. 

# **15. AVS Notification Trigger** 

A patient notification must only occur when the HHA AVS becomes: 

```
approved
AND
publication_status = ready
```

Do not notify when: 

- SOAP is saved 

- AVS draft is generated 

- AVS draft is edited 

- AVS is approved but not released 

- AI content is still under clinician review 

# **16. AVS Multi-Channel Flow** 

```
Doctor completes encounter
        |
        v
AVS generated
        |
```

8 

```
        v
Doctor reviews
        |
        v
AVS approved
        |
        v
AVS published / ready
        |
        v
Notification event created
        |
        +----> Portal notification
        |
        +----> App notification
        |
        +----> Email
        |
        +----> SMS
```

Channels should be determined by patient preferences. 

# **17. Deep Links** 

Each notification should contain an authenticated destination. 

Examples: 

```
AVS_READY
→ /records/visits/{visitId}/summary
PRESCRIPTION_READY
→ /records/prescriptions/{id}
LAB_RESULT_READY
→ /records/labs/{id}
APPOINTMENT_CHANGED
→ /appointments/{id}
```

Do not expose raw OpenEMR URLs directly to patients. 

9 

# **18. Security** 

All external clinical data should move: 

```
OpenEMR
   |
   v
MyHealth Vault+ backend
   |
   v
Patient
```

Do not expose OpenEMR credentials in browser JavaScript. 

Do not send client secrets to the frontend. 

All OpenEMR communication must be server-to-server. 

# **19. Patient Ownership Validation** 

Before showing any notification target, verify: 

```
logged-in patient
=
notification.patient_id
=
target clinical record patient
```

Do not rely only on URL IDs. 

# **20. Privacy Rules for Email and SMS** 

External channels should contain minimal information. 

Safe: 

```
A new visit summary is available.
```

10 

Safe: 

```
A new lab result is available in MyHealth Vault+.
```

Avoid including: 

- diagnosis 

- test value 

- HIV status 

- pregnancy status 

- mental-health diagnosis 

- medication name 

- detailed treatment plan 

- internal clinical notes 

unless HHA later establishes explicit rules and consent for such content. 

# **21. Notification Templates** 

Create reusable templates per event and channel. 

Example structure: 

```
templates/
    AVS_READY/
        portal
        app
        email
        sms
```

This allows the same event to produce different wording for each channel. 

# **22. Example AVS Templates** 

## **Portal/App** 

```
Visit Summary Ready
```

```
Your TeleCare™ visit summary is now available.
```

11 

```
[View Visit Summary]
```

## **Email** 

```
Your visit summary is now available in MyHealth Vault+.
```

```
Sign in securely to review your care instructions and follow-up information.
```

## **SMS** 

```
MyHealth Vault+: Your visit summary is ready. Sign in securely to review it.
```

# **23. Prescription Templates** 

## **Portal/App** 

```
New Prescription
```

```
A new prescription has been added to your care record.
```

```
[View Prescription]
```

## **Email** 

```
A new prescription is available in MyHealth Vault+.
```

```
Sign in securely to review the details.
```

## **SMS** 

```
MyHealth Vault+: A new prescription is available. Sign in securely to review it.
```

12 

# **24. Lab Result Templates** 

## **Portal/App** 

```
New Lab Result
```

```
A new test result is available in your health record.
[View Result]
```

## **Email** 

```
A new test result is available in MyHealth Vault+.
```

```
Sign in securely to review it.
```

## **SMS** 

```
MyHealth Vault+: A new test result is available. Sign in securely to review it.
```

# **25. Appointment Templates** 

## **Confirmation** 

```
Your TeleCare™ appointment has been confirmed.
```

## **Changed** 

```
Your appointment details have changed.
```

## **Cancelled** 

```
Your appointment has been cancelled.
```

Include date/time in portal and email where appropriate. 

13 

SMS may include appointment date/time if HHA approves. 

# **26. Retry Logic** 

Email and SMS delivery must support retries. 

Recommended: 

```
Attempt 1
1 minute
Attempt 2
5 minutes
Attempt 3
15 minutes
Attempt 4
1 hour
```

After the retry limit: 

```
status = failed
```

and send the event to an operations exception queue. 

# **27. Idempotency** 

Do not send the same notification repeatedly. 

Use a unique key based on: 

```
patient_id
event_type
source_record_id
source_version
channel
```

If the same event is processed twice, do not send duplicate email/SMS notifications. 

14 

# **28. Delivery Tracking** 

Track: 

```
queued
sent
delivered
failed
read
```

Where the provider supports delivery receipts, capture: 

```
provider_message_id
delivery_status
delivery_timestamp
```

# **29. Read Tracking** 

Portal/app notifications should support: 

```
unread
read
archived
```

When the patient opens the destination record: 

```
read_at = timestamp
```

# **30. Email Open Tracking** 

Do not make clinical workflows depend on email open tracking. 

Email open tracking can be unreliable and may create unnecessary privacy concerns. 

Treat successful provider delivery as the primary email-delivery status. 

15 

# **31. SMS Delivery Tracking** 

Use provider delivery receipts where supported. 

Track: 

```
accepted
sent
delivered
failed
```

Do not assume that <mark>`sent`</mark> means the patient read the SMS. 

# **32. Notification Preferences Screen** 

Add a section under: 

```
Settings → Notifications
```

Allow patients to control: 

```
In-app notifications
Portal notifications
Email notifications
SMS notifications
```

Optionally allow category preferences: 

```
Appointments
Clinical results
Prescriptions
Visit summaries
Subscription reminders
Payment reminders
```

16 

# **33. Mandatory vs Optional Notifications** 

The application should support: 

```
mandatory
optional
```

Example: 

Appointment cancellation may be operationally mandatory. 

Marketing notifications must always be separate from clinical/service notifications. 

Never use clinical consent as marketing consent. 

# **34. Quiet Hours** 

For SMS and push notifications, support optional quiet hours. 

Example: 

```
10:00 PM – 7:00 AM
```

Critical service notices may have separate policy. 

# **35. Contact Validation** 

Before sending: 

## **Email** 

Validate that the patient has a usable email address. 

## **SMS** 

Normalize phone numbers to international format. 

Example: 

17 

```
+234...
```

Do not send to invalid or obviously incomplete numbers. 

# **36. Failed Contact Handling** 

If email is missing: 

```
email channel = suppressed
reason = no_email
```

If SMS number is invalid: 

```
sms channel = suppressed
reason = invalid_phone
```

Other channels should still proceed. 

# **37. Notification Worker** 

Use an asynchronous worker/queue. 

Do not send email or SMS synchronously inside the clinical API request. 

Preferred: 

```
Event created
    |
    v
Notification queued
    |
    v
Worker
    |
    +----> email
    +----> SMS
```

18 

```
    +----> portal
    +----> app
```

This prevents a slow SMS/email provider from slowing down the patient portal or clinical system. 

# **38. Queue Requirements** 

The queue should support: 

```
retry
delay
dead-letter / failed queue
deduplication
monitoring
```

# **39. Audit Trail** 

Record: 

```
event created
notification created
channel queued
channel sent
channel delivered
channel failed
notification read
deep link opened
acknowledgement sent to OpenEMR
```

# **40. Operations Dashboard** 

Provide internal visibility into: 

```
notifications today
email delivered
email failed
SMS delivered
```

19 

```
SMS failed
pending notifications
failed notifications
retry queue
```

Allow staff to search by: 

```
patient ID
notification type
date
delivery channel
status
```

# **41. Do Not Expose Raw Clinical Records** 

The notification framework must never be used to expose raw: 

```
SOAP
Clinical Notes
internal provider notes
draft AVS
AI working drafts
```

Only patient-released content may create a patient notification. 

# **42. Phase 1** 

Implement: 

```
AVS_READY
```

with: 

- Portal notification 

- App notification 

- Email 

- SMS 

- Read state 

- Deep linking 

20 

- Delivery tracking 

- Retry handling 

- Duplicate protection 

# **43. Phase 2** 

Extend to: 

```
PRESCRIPTION_READY
LAB_RESULT_READY
APPOINTMENT_CREATED
APPOINTMENT_CHANGED
APPOINTMENT_CANCELLED
DOCUMENT_READY
REFERRAL_READY
```

# **44. Phase 3** 

Extend to: 

```
SUBSCRIPTION_RENEWAL_DUE
PAYMENT_DUE
PAYMENT_FAILED
GENERAL_SERVICE_ALERTS
```

# **45. Required Developer Tests** 

Test: 

- AVS published → portal notification 

- AVS published → app notification 

- AVS published → email 

- AVS published → SMS 

- Draft AVS → no notification 

- Approved but not published AVS → no notification 

- Duplicate event → no duplicate messages 

- Patient opted out of SMS → no SMS 

21 

- Patient opted out of email → no email 

- Invalid phone number → SMS suppressed 

- Missing email → email suppressed 

- Email provider unavailable → retry 

- SMS provider unavailable → retry 

- Patient opens portal notification → marked read 

- 

- Wrong patient attempts deep link → access denied 

- OpenEMR unavailable → retry 

- Notification worker restarts → no event lost 

- 

- Sensitive clinical content does not appear in email/SMS 

# **46. Acceptance Criteria** 

The system is complete when a newly published patient-facing clinical event can automatically generate: 

```
Portal notification
App notification
Email notification
SMS notification
```

subject to patient preferences. 

The patient should receive a short safe message and be directed back into MyHealth Vault+ to view the actual clinical information securely. 

# **47. Final Required Architecture** 

```
OpenEMR
Clinical record
        |
        v
Approved / Published Patient Record
        |
        v
MyHealth Vault+ Backend
        |
        v
Central Notification Engine
        |
        +-------- Portal
        |
```

22 

```
        +-------- App
        |
        +-------- Email
        |
        +-------- SMS
```

The notification engine must be centralized, auditable, secure, retryable, and reusable across all HHA services. 

23 

