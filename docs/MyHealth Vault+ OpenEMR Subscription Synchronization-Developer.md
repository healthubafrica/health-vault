# **MyHealth Vault+ → OpenEMR Subscription Synchronization** 

## **Objective** 

Implement automatic synchronization of patient subscription information from the standalone **MyHealth Vault+ patient portal** into **OpenEMR 8.2** . 

The patient portal will remain the **source of truth** for subscription, payment, renewal, and plan status. 

OpenEMR will receive and store a synchronized clinical-facing copy so doctors and authorized staff can see the patient's current subscription information in the OpenEMR Demographics page. 

Do not require staff to manually enter or maintain subscription information in OpenEMR. 

## **Current State** 

OpenEMR already contains the required HHA subscription fields in `patient_data` . 

Existing fields include: 

- <mark>`Subscription`</mark> 

- 

- <mark>`sub_start_date`</mark> 

- <mark>`sub_end_date`</mark> 

- <mark>`sub_status`</mark> 

- <mark>`sub_renewal_reminder`</mark> 

- <mark>`sub_renewal_owner`</mark> 

- 

- 

- <mark>`sub_renewal_notes`</mark> 

- <mark>`sub_access_level`</mark> 

- <mark>`sub_alert_flag`</mark> 

- <mark>`sub_renewal_status`</mark> 

- <mark>`sub_last_contact_date`</mark> 

- <mark>`sub_payment_status`</mark> 

- 

- 

- 

- 

```
sub_last_payment_date
```

- <mark>`sub_next_payment_due`</mark> 

```
sub_payment_method
```

```
sub_payment_reference
```

- <mark>`Preferred_Payment_Method`</mark> 

- <mark>`subscription_plan`</mark> 

The OpenEMR Demographics layout already contains subscription, payment, renewal, and access-level fields. 

1 

The issue is that the standalone MyHealth Vault+ patient portal is not currently populating these OpenEMR fields. 

For example, a patient can have an active plan in MyHealth Vault+, while the corresponding OpenEMR record shows: 

- Subscription Plan: Unassigned 

- Subscription Status: blank 

- Start Date: blank 

- Expiry Date: blank 

- Access Level: blank 

- Payment Status: blank 

- Renewal Status: blank 

# **1. Architecture** 

Implement the following flow: 

```
MyHealth Vault+ Patient Portal
            |
            | authenticated HTTPS API call
            v
OpenEMR HHA Subscription Sync API
            |
            | validate patient + payload
            v
patient_data
            |
            +----> subscription fields updated
            |
            +----> audit record written
            |
            v
OpenEMR Demographics
```

The patient portal must initiate synchronization whenever any relevant subscription event occurs. 

Examples: 

- New subscription • Plan upgrade • Plan downgrade • Renewal 

- Cancellation 

2 

- Suspension 

- Expiration 

- Payment successful 

- Payment failed 

- Payment status changed 

- Renewal date changed 

- Access level changed 

# **2. OpenEMR Implementation Location** 

Do **not modify OpenEMR core REST controllers** . 

Extend the existing HHA custom module: 

```
/interface/modules/custom_modules/
oe-module-hha-ai-clinical-assistant/
```

Primary implementation file currently used for HHA REST extensions: 

```
src/Bootstrap.php
```

The module already uses: 

```
RestApiCreateEvent
RestApiSecurityCheckEvent
HttpRestRequest
```

Use the same REST extension architecture already being used by the HHA After-Visit Summary API. 

# **3. New API Endpoint** 

Create: 

```
POST /api/hha/subscription/sync
```

Content type: 

3 

```
application/json
```

The endpoint must only accept authenticated requests from the authorized MyHealth Vault+ integration client. 

Do not create a publicly callable unauthenticated endpoint. 

# **4. Patient Identification** 

The synchronization endpoint must require a stable patient identifier. 

Preferred identifiers: 

```
pid
```

and/or: 

```
HHA_ID
```

Do not match a patient using only: 

- first name 

- last name 

- email 

- phone number 

- date of birth 

Those may be used as secondary verification data, but never as the sole patient identity mechanism. 

Recommended request: 

```
{
"pid":27,
"hha_id":"HHA-000027"
}
```

If both identifiers are supplied, verify they belong to the same patient before making any update. 

If they conflict: 

4 

```
HTTP 409
```

and do not update anything. 

# **5. Request Payload** 

Recommended payload: 

```
{
"pid":27,
"hha_id":"HHA-000027",
"subscription_plan":"BASICCARE",
"subscription_status":"active",
"start_date":"2026-08-01",
"expiry_date":"2027-07-31",
"access_level":"basiccare",
"payment_status":"paid",
"last_payment_date":"2026-08-01",
"next_payment_due":"2026-09-01",
"payment_method":"card",
"payment_reference":"MV-123456",
"renewal_status":"current",
"renewal_reminder_date":"2027-07-01",
"source_updated_at":"2026-08-11T20:45:00Z"
}
```

Fields may be nullable when legitimately unavailable. 

# **6. OpenEMR Field Mapping** 

Use the following canonical mapping: 

|MyHealth Vault+|OpenEMR<br>`patient_data`|
|---|---|
|`subscription_plan`|`Subscription`|
|`subscription_status`|`sub_status`|
|`start_date`|`sub_start_date`|
|`expiry_date`|`sub_end_date`|



5 

|MyHealth Vault+|OpenEMR<br>`patient_data`|
|---|---|
|`access_level`|`sub_access_level`|
|`payment_status`|`sub_payment_status`|
|`last_payment_date`|`sub_last_payment_date`|
|`next_payment_due`|`sub_next_payment_due`|
|`payment_method`|`sub_payment_method`|
|`payment_reference`|`sub_payment_reference`|
|`renewal_status`|`sub_renewal_status`|
|`renewal_reminder_date`|`sub_renewal_reminder`|



Do not use <mark>`subscription_plan`</mark> as the primary plan field for the new integration. 

Use: 

```
Subscription
```

as the canonical HHA subscription-plan column. 

The duplicate <mark>`subscription_plan`</mark> field should not be deleted during this project. Leave it in place until HHA confirms that no legacy workflow depends on it. 

# **7. Validation** 

The API must validate all incoming values. 

## **Patient** 

Confirm: 

```
patient_data.pid = submitted pid
```

If <mark>`HHA_ID`</mark> is supplied, verify it belongs to the same row. 

6 

## **Dates** 

Accept ISO format: 

```
YYYY-MM-DD
```

Reject malformed dates. 

Where appropriate: 

```
expiry_date >= start_date
next_payment_due >= start_date
```

## **Subscription Status** 

Use an allowlist. 

Example: 

```
active
pending
suspended
expired
cancelled
inactive
```

Use values consistent with the existing OpenEMR `hha_subscription_status` list. 

## **Payment Status** 

Use an allowlist consistent with: 

```
hha_payment_status
```

Examples may include: 

```
paid
pending
```

7 

```
failed
overdue
refunded
waived
```

Developer must verify the actual option values in the existing OpenEMR list before implementation. 

## **Renewal Status** 

Use values from: 

```
hha_renewal_status
```

Do not invent values that do not exist in the OpenEMR list. 

# **8. Security** 

Reuse the existing HHA OpenEMR OAuth/API authentication architecture. 

The existing HHA module already has an API security listener. 

Add subscription synchronization security separately and explicitly. 

The new security rule should apply only to: 

```
/api/hha/subscription/
```

Do not create a broad security bypass for: 

```
/api/hha/
```

Do not disable OpenEMR authentication globally. 

Do not accept subscription updates based solely on: 

```
X-API-Key
```

unless HHA explicitly approves a separate machine-to-machine authentication architecture. 

8 

Preferred implementation: 

```
OAuth2 authenticated client
+
approved client ID
+
authorized user/client context
+
HTTPS
```

Any <mark>`skipSecurityCheck(true)`</mark> logic must be limited to the exact approved HHA subscription endpoint after successful authentication and client validation. 

# **9. Database Audit Table** 

Create: 

```
hha_subscription_sync_audit
```

Recommended schema: 

```
CREATETABLEhha_subscription_sync_audit(
idBIGINTUNSIGNEDNOTNULLAUTO_INCREMENT,
pidBIGINTNOTNULL,
hha_idVARCHAR(255)NULL,
actionVARCHAR(50)NOTNULL,
sourceVARCHAR(50)NOTNULLDEFAULT'myhealth_vault',
subscription_planVARCHAR(100)NULL,
subscription_statusVARCHAR(50)NULL,
payment_statusVARCHAR(50)NULL,
payment_referenceVARCHAR(255)NULL,
request_payloadLONGTEXTNULL,
previous_valuesLONGTEXTNULL,
new_valuesLONGTEXTNULL,
client_idVARCHAR(255)NULL,
source_updated_atDATETIMENULL,
created_atDATETIMENOTNULLDEFAULTCURRENT_TIMESTAMP,
PRIMARYKEY(id),
INDEXidx_hha_subscription_audit_pid(pid),
INDEXidx_hha_subscription_audit_created(created_at)
);
```

9 

Use JSON where supported/preferred, but ensure compatibility with the deployed MariaDB version. 

Do not store credentials, OAuth tokens, card numbers, CVVs, or sensitive payment credentials in this table. 

# **10. Transaction Handling** 

Each update must be atomic. 

Use: 

### `BEGIN` 

1. Read current subscription values. 

2. Validate patient. 

3. Update <mark>`patient_data` .</mark> 

4. Insert audit record. 

5. Commit. 

If any operation fails: 

### `ROLLBACK` 

Do not allow a patient record to update without a corresponding audit entry. 

# **11. Idempotency** 

The portal may retry requests. 

The endpoint must therefore tolerate duplicate synchronization calls. 

If the incoming subscription state is identical to the state already stored: 

- return success; 

- do not create unnecessary conflicting updates; 

- • optionally record the request as <mark>`NO_CHANGE` .</mark> 

Recommended action values: 

```
CREATED
UPDATED
```

10 

```
NO_CHANGE
REJECTED
```

Consider supporting an idempotency key supplied by the portal. 

Example: 

```
subscription_event_id
```

# **12. API Response** 

Successful synchronization: 

```
{
"status":"ok",
"pid":27,
"subscription_plan":"BASICCARE",
"subscription_status":"active",
"payment_status":"paid",
"synced_at":"2026-08-12T03:30:00Z"
}
```

Patient not found: 

```
{
"status":"error",
"code":"PATIENT_NOT_FOUND"
}
```

Identifier conflict: 

```
{
"status":"error",
"code":"PATIENT_IDENTITY_MISMATCH"
}
```

Validation failure: 

11 

```
{
"status":"error",
"code":"VALIDATION_ERROR",
"message":"Invalid subscription status"
}
```

Authentication failure must return the appropriate HTTP 401/403 response. 

# **13. HTTP Response Codes** 

Use: 

```
200 - synchronized successfully
200 - no change / idempotent repeat
400 - malformed payload
401 - unauthenticated
403 - authenticated but unauthorized client
404 - patient not found
409 - patient identifier conflict
422 - validation failure
500 - internal synchronization failure
```

# **14. Logging** 

Log: 

- synchronization timestamp 

- patient PID 

- HHA ID 

- action 

- integration client 

- result 

- error code where applicable 

Do not log: 

- OAuth access tokens 

- secrets 

- full payment card numbers 

- CVV 

- passwords 

12 

# **15. MyHealth Vault+ Portal Changes** 

The standalone patient portal must call the new OpenEMR endpoint after any successful subscription transaction or subscription-state change. 

Examples: 

```
Subscription created
        ↓
Save portal subscription
        ↓
POST OpenEMR subscription sync
        ↓
Confirm success
```

Same requirement applies to: 

```
Renewal
Upgrade
Downgrade
Cancellation
Expiration
Payment
Failed payment
Manual administrative subscription change
```

# **16. Retry Handling** 

If OpenEMR is temporarily unavailable: 

1. Do not lose the subscription transaction. 

2. Save the portal transaction successfully. 

3. Mark OpenEMR synchronization as pending. 

4. Retry asynchronously. 

5. Record retry attempts. 

6. Alert operations after the retry threshold is exceeded. 

Suggested retry pattern: 

13 

```
1 minute
5 minutes
15 minutes
1 hour
```

Then move to an exception queue requiring investigation. 

# **17. Source-of-Truth Rule** 

The standalone MyHealth Vault+ subscription system is the authoritative source for: 

- subscription plan • subscription lifecycle 

- payment state • renewal state 

- subscription dates • entitlement/access level 

OpenEMR is a synchronized consumer. 

Clinical users may view the subscription information in OpenEMR, but normal clinical workflows should not create an independent conflicting subscription state. 

# **18. Testing** 

Use a test patient first. 

Recommended existing OpenEMR test: 

```
PID: 27
```

Before test: 

```
Subscription = blank
sub_status = blank
sub_start_date = blank
sub_end_date = blank
sub_access_level = blank
sub_payment_status = blank
```

14 

Test payload: 

```
{
"pid":27,
"subscription_plan":"BASICCARE",
"subscription_status":"active",
"start_date":"2026-08-01",
"expiry_date":"2027-07-31",
"access_level":"basiccare",
"payment_status":"paid",
"last_payment_date":"2026-08-01",
"next_payment_due":"2026-09-01",
"payment_method":"card",
"payment_reference":"TEST-MV-0001",
"renewal_status":"current"
}
```

Verify directly in OpenEMR: 

```
SELECT
pid,
Subscription,
sub_status,
sub_start_date,
sub_end_date,
sub_access_level,
sub_payment_status,
sub_last_payment_date,
sub_next_payment_due,
sub_payment_method,
sub_payment_reference,
sub_renewal_status
FROMpatient_data
WHEREpid=27;
```

Then verify visually: 

```
Patient → Demographics → Subscription & Coverage
```

The OpenEMR screen should reflect the subscription immediately after successful synchronization. 

15 

# **19. Required Test Cases** 

Developer must demonstrate all of the following before production release: 

- Valid active subscription sync 

- Plan upgrade 

- Plan downgrade 

- Renewal 

- Cancellation 

- Expiration 

- Failed payment 

- Payment recovery 

- Duplicate API request 

- Missing PID 

- Invalid PID 

- Mismatched PID/HHA ID 

- Invalid plan 

- Invalid status 

- Invalid date 

- Unauthorized API client 

- OpenEMR unavailable during portal transaction 

- Retry after temporary failure 

- Audit entry creation 

- No-change synchronization 

# **20. Production Safety** 

Before modifying the HHA module: 

Create a timestamped backup of: 

```
src/Bootstrap.php
```

Do not overwrite existing AVS functionality. 

Existing endpoints such as: 

```
GET /api/hha/avs/status
GET /api/hha/avs/published/encounter/:encounter
POST /api/hha/avs/published/encounter/:encounter/ack
```

must continue functioning unchanged. 

16 

Run PHP syntax validation before deployment. 

Example: 

```
php-lsrc/Bootstrap.php
```

Do not deploy if syntax validation fails. 

# **21. Container Persistence** 

The HHA module is already host-mounted into the OpenEMR application container. 

Changes should be made to the persistent host-side module source, not only to ephemeral files inside the container. 

Do not place the new integration exclusively in a container filesystem that will disappear after recreation. 

# **22. Acceptance Criteria** 

The work is complete when: 

- A patient activates or changes a subscription in MyHealth Vault+. 

- The portal automatically sends the new state to OpenEMR. 

- OpenEMR updates the correct <mark>`patient_data`</mark> record. 

- OpenEMR Demographics reflects the subscription without manual intervention. 

- Failed synchronization does not lose the portal subscription transaction. 

- Failed synchronization is retried. 

- Every successful change is auditable. 

- Unauthorized callers cannot update subscription information. 

- Existing HHA AVS APIs continue working. • Existing clinical records are unaffected. 

- OpenEMR core source is not modified. 

# **23. Developer Deliverables** 

Provide HHA with: 

1. Updated HHA OpenEMR module source. 

2. Database migration for <mark>`hha_subscription_sync_audit` .</mark> 

17 

3. API endpoint documentation. 

4. Authentication requirements. 

5. Sample request and response. 

6. Portal-side synchronization implementation. 

7. Retry/error-handling implementation. 

8. Test results for all acceptance criteria. 

9. Rollback procedure. 

10. Deployment notes. 

11. Confirmation that no OpenEMR core files were modified. 

12. Confirmation that no payment-card credentials or authentication secrets are stored in OpenEMR. 

18 

