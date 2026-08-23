# Multi-Channel Notification System — Spec Reconciliation

> Companion to [MyHealth Vault+ Patient Notification & Clinical Release Integration-Developer task.md](./MyHealth%20Vault+%20Patient%20Notification%20%26%20Clinical%20Release%20Integration-Developer%20task.md).
> **Finding: do not build a new centralized notification engine.** One already exists (`NotificationsService` in `health-hub-africa-api`) and independently matches the spec's architecture almost field-for-field. Building the spec as written from scratch would create a second, competing notification pipeline — exactly the anti-pattern the spec itself warns against for AVS (§41: "never used to expose raw... draft AVS"). This doc maps spec → reality so any new work extends what exists.

## 1. Architecture — already matches

Spec's ask (§2): one event → fan out to Portal / App / Email / SMS, driven by patient preferences.

Reality: `NotificationsService.createPatientAlert()` (in-app/portal) + `sendEmail()`/`sendSms()`/`sendPush()` (outbound channels), all backed by a Bull queue (`NOTIFICATIONS_QUEUE`) so nothing blocks the triggering request — this already satisfies §37 ("do not send email/SMS synchronously inside the clinical API request").

## 2. Schema mapping

| Spec's proposed table/field (§8) | Existing equivalent | Gap |
|---|---|---|
| Notification (id, patient_id, event_type, category, title, message, source_system, source_record_id, action_url, priority, created_at, read_at, archived_at) | `PatientAlert` (id, patientId, severity, title, body, actionLabel, **actionUrl**, referenceType, referenceId, isRead, readAt, expiresAt, createdAt) | `referenceType` covers `category`; no `source_system`/`priority`/`archived_at` — not needed yet, nothing archives alerts today |
| Channel delivery table (id, notification_id, channel, recipient, status, attempt_count, delivered_at, failed_at, provider_message_id, failure_reason) | `NotificationDelivery` (id, userId, **alertId**, channel, recipient, status, providerRef, sentAt, deliveredAt, failedAt, failureReason) | Near-identical. No `attempt_count` column, but Bull's own job `attempts`/backoff config covers retry counting — redundant to duplicate in-table |
| Patient communication preferences (§5) | `NotificationPreference` (emailEnabled, smsEnabled, pushEnabled, whatsappEnabled, appointmentReminders, labResultAlerts, paymentReceipts, dispatchUpdates, expertReviewUpdates, marketingComms) | Already separates clinical categories from `marketingComms` exactly per §33's "never use clinical consent as marketing consent" rule. **No `notify_in_app`/`notify_portal` toggle** (in-app is implicitly always-on — reasonable default, not a gap worth closing yet) and **no quiet-hours field** (§34 — genuine small gap, P2) |
| Event codes (§7: `AVS_READY`, `PRESCRIPTION_READY`, `LAB_RESULT_READY`, `APPOINTMENT_*`, etc.) | `referenceType` on `PatientAlert`: `'appointment' \| 'lab' \| 'payment' \| 'record' \| 'telecare' \| 'alert' \| 'system'` | Coarser categories, not 1:1 event codes — fine, the spec's own §6 groups these into the same categories anyway |

## 3. Already-wired trigger points (Phase 1/2 from the spec, already shipped)

| Spec event | Wired at | Channels today |
|---|---|---|
| `APPOINTMENT_CREATED/CHANGED/CANCELLED` | `appointments.service.ts:862` | In-app + email (`sendAppointmentEmail`) |
| Appointment 24h/1h reminders | `appointment-reminders.processor.ts:123` | In-app + SMS |
| `LAB_RESULT_READY` | `labs.service.ts:184` | In-app |
| `PAYMENT_*` (success) | `payments.service.ts:361` | In-app + email (receipt) |

This is already most of the spec's Phase 2 (§43) scope, done before the spec existed — not a gap.

## 4. Real gaps found

| # | Gap | Spec ref | Priority | Notes |
|---|---|---|---|---|
| 1 | **`NotificationPreference` is stored but never checked.** `notificationPreference` is only referenced in `auth.service.ts` (set at registration). None of `sendEmail`/`sendSms`/`sendPush`/`createPatientAlert` consult it before sending. | §5 ("must honor patient preferences unless operationally mandatory"), §33 | **P0** | Same "built but not wired" pattern as the FCM push sender found earlier in this project. Every notification currently fires regardless of what the patient opted into — a real compliance gap, not just an incomplete feature |
| 2 | `sendPush()` has zero callers anywhere in the codebase (confirmed again today) | §4, §16 (push channel) | P0, tracked separately | Same finding as the mobile-app audit — needs device-token registration (mobile plan Gap #1) before it can be used regardless of this spec |
| 3 | `AVS_READY` specifically can't be wired yet — **nothing in `health-hub-africa-api` knows about AVS at all** (confirmed: zero matches for `avs`/`visit-summary` anywhere in `src/`) | §1, §15, §16 | Blocked | Depends on the Visit Summary/Clinical Note Release spec landing first (next in the work queue) — correctly sequenced, not a gap in this spec's own scope |
| 4 | No quiet-hours field/logic | §34 | P2 | Small, deferred — no channel is push/SMS-heavy enough yet to need this |
| 5 | No per-notification `attempt_count`/retry-count column | §26 | Not a gap | Already covered by Bull's own `attempts`/`backoff` config on each queued job — don't duplicate |

## 5. Recommendation

**Do not implement §2–§41 of the spec as a new system.** Concretely:

1. Fix gap #1 (preference enforcement) — this is the one piece of the spec's own explicit requirements that's genuinely unmet today, and it's a bounded, well-scoped change: gate each `send*` call on the relevant `NotificationPreference` flag before enqueueing. Touches every call site listed in §3 above (5 files) plus a category→flag mapping decision (e.g. does `sendOtpEmail`/`sendGuestOtpEmail` bypass preferences as "operationally mandatory" per §33? — yes, OTP/security codes should never be preference-gated).
2. When the Visit Summary/Clinical Note Release work lands, its `VISIT_SUMMARY_PUBLISHED` event becomes one more call to the *existing* `createPatientAlert()` + `sendEmail()`, exactly like the appointment/lab/payment triggers already are — not a new pipeline.
3. Leave `sendPush()` disconnected until the mobile app's device-token registration (Gap #1 in the mobile plan) exists — wiring it before there's anywhere for pushes to go is premature.

## 6. Gap #1 — implemented, deliberately scoped narrow

Added `NotificationsService.isNotificationAllowed(userId, channel, category?)` and wired it into the one call site where the fix is unambiguous and safe: the 24h/1h appointment reminder email + SMS in `appointment-reminders.processor.ts`, gated on `appointmentReminders` — the exact preference field the schema already has for exactly this purpose.

**Deliberately not touched in this pass** — auditing all ~20 `sendEmail`/`sendSms` call sites across 8 files surfaced a real subtlety that made a blanket fix risky:

- **Transactional vs. discretionary isn't a clean channel-level split.** OTP/2FA/password-reset (`auth.service.ts`, `admin.service.ts`), welcome email, data-export/account-deactivation confirmations, and booking confirmations are all direct responses to something the user just did — these must always send regardless of preference (disabling email notifications must never lock someone out of login). Only *proactive* nudges like reminders are cleanly preference-gated.
- **`userId` passed to `sendEmail`/`sendSms` isn't always the recipient.** `shares.service.ts`'s record-share emails/SMS go to a recipient the patient specifies (who may not even be an HHA user) — the `userId` param there is bookkeeping for the *sending* patient's audit trail, not the actual recipient's own preference. Gating on it would check the wrong person's opt-in.

Extending this further (lab-result alerts, payment receipts, ops-mailbox exclusions) is real, valuable follow-up work — but each site needs the same individual classification this reminder fix got, not a mechanical find-and-wrap. Flagging as a scoped next step rather than doing it as a sweep.
