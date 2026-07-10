# Configurable Appointment Notification Recipients — Design

**Date:** 2026-07-09
**Status:** Approved

## Context

Appointment lifecycle notifications (`AppointmentsService.notifyAppointmentEvent()`) already email the patient and provider on their own account addresses — this is pre-existing and unaffected by this work. Separately, an "ops" fan-out (`NotificationsService.sendOpsAppointmentEmail`) sends to a single hardcoded address read from the `APPOINTMENTS_OPS_EMAIL` env var, currently `appointments@healthhubafrica.com`, and only on the `requested`/`cancelled`/`rescheduled` events.

Debugging session finding: emails were confirmed sent successfully (Resend accepted them) to that address for real appointments created 07-08 and 07-09 — there is no delivery bug. The gap is that the recipient is hardcoded to one address that requires a code change (env var + redeploy) to alter, and the practice wants multiple people notified (Operations, Front Desk, Nursing, Practice Manager) plus per-provider extras (e.g. a specific provider's nurse), manageable from the Admin Portal without code changes.

## Scope

**In scope:**
- A global, admin-managed list of notification-recipient emails (free-text label + email), replacing the single env var.
- A per-provider list of extra notification emails, manageable by admin (from the provider's admin detail view) and by the provider themselves (from their own Settings page).
- Expanding the ops fan-out to fire on every appointment status event (`requested`, `confirmed`, `cancelled`, `rescheduled`, `completed`, `no_show`) rather than just the current three.
- A one-time migration seeding the existing hardcoded address as the first global recipient row, so behavior doesn't regress at deploy time.

**Out of scope (explicitly deferred, confirmed via brainstorming):**
- Per-facility recipient scoping — global list applies platform-wide for now.
- Fixed role enum for global recipients — labels are free text, not a constrained dropdown.
- Any change to patient/provider's own notification emails (already working; user will separately verify test-account emails are set).
- SMS/push equivalents of this fan-out — email only, matching the existing `sendOpsAppointmentEmail` channel.

## Data Model

Two new Prisma models. Both are simple, independently auditable, and require no changes to existing tables.

```prisma
model NotificationRecipient {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  label     String              // free text, e.g. "Front Desk", "Nursing", "Practice Manager"
  email     String
  isActive  Boolean  @default(true) @map("is_active")
  createdBy String?  @map("created_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("notification_recipients")
}

model ProviderNotificationEmail {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  providerId String   @map("provider_id") @db.Uuid
  label      String?             // optional, e.g. "Dr. Okoye's Nurse"
  email      String
  isActive   Boolean  @default(true) @map("is_active")
  addedBy    String?  @map("added_by") @db.Uuid   // who added it (admin or the provider themself)
  createdAt  DateTime @default(now()) @map("created_at")

  provider   Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@index([providerId])
  @@map("provider_notification_emails")
}
```

`Provider` gains a back-relation: `notificationEmails ProviderNotificationEmail[]`.

**Migration seed:** insert one `NotificationRecipient` row with `label: 'Operations'`, `email: 'appointments@healthhubafrica.com'` (the current `APPOINTMENTS_OPS_EMAIL` default value), so the very first deploy of this feature sends to exactly the same address it already does today — zero-regression cutover. After this ships, `APPOINTMENTS_OPS_EMAIL` and `DEFAULT_APPOINTMENTS_OPS_EMAIL` (`appointments.service.ts`) are dead code to be removed as part of implementation, not left as an unused fallback — the whole point is DB becomes the single source of truth.

## Notification Fan-Out Rewrite

In `appointments.service.ts`'s `notifyAppointmentEvent()`, the existing block:

```ts
const opsEvents: AppointmentEmailEvent[] = ['requested', 'cancelled', 'rescheduled'];
if (opsEvents.includes(event)) {
  const opsEmail = this.config.get<string>('APPOINTMENTS_OPS_EMAIL', DEFAULT_APPOINTMENTS_OPS_EMAIL);
  ...
  await this.notifications.sendOpsAppointmentEmail(opsEmail, opsSubjects[event], opsData);
}
```

is replaced with: no event-type filter (fires for all six `AppointmentEmailEvent` values), fetches the recipient set for this specific appointment, and sends one email per recipient:

```ts
const recipients = await this.resolveOpsRecipients(appt.provider?.id ?? null);
for (const recipient of recipients) {
  await this.notifications.sendOpsAppointmentEmail(recipient.email, opsSubjects[event], opsData);
}
```

`resolveOpsRecipients(providerId)`: queries active `NotificationRecipient` rows (global) + active `ProviderNotificationEmail` rows where `providerId` matches (skipped if `providerId` is null, e.g. an appointment with no assigned provider yet), dedupes by lowercased email (a provider's extra email could coincidentally match a global one), returns the merged list. This is a new private method on `AppointmentsService` — no new service class needed, it's a straightforward extension of the existing notification path.

`opsSubjects`/`opsIntros` (currently local `Record<string, string>` maps covering only the 3 old events) are extended to all 6 by sourcing from the function's main `templates: Record<AppointmentEmailEvent, EventTemplate>` map (defined earlier in the same function, ~line 831) — that map already has `subject`/`intro`/`outro`/`sms` entries for all six events including `completed`/`no_show` (it's what patient emails use). The ops block reads `templates[event].subject` directly instead of maintaining a second, narrower copy; only the ops-specific `outro` ("View the full appointment in the admin operations dashboard.") and `recipientName: 'Team'` stay local to the ops block, since those are ops-specific, not shared with the patient template.

## Backend Endpoints

All new endpoints follow the existing `admin.controller.ts` / `providers.controller.ts` conventions (class-validator DTOs, `@Roles` guards, audit-logged via the existing admin-action audit middleware already applied to that controller).

**Global recipients** (`admin.controller.ts`, `@Roles(admin, super_admin)` — inherited from the controller class decorator):
- `GET /admin/notification-recipients` — list all (including inactive, admin needs to see the full picture)
- `POST /admin/notification-recipients` — `{ label: string, email: string }`
- `PATCH /admin/notification-recipients/:id` — `{ label?: string, email?: string, isActive?: boolean }`
- `DELETE /admin/notification-recipients/:id` — hard delete (not soft; this is a small reference list, not a record with history to preserve)

**Per-provider, admin-managed** (`admin.controller.ts`):
- `GET /admin/providers/:id/notification-emails`
- `POST /admin/providers/:id/notification-emails` — `{ label?: string, email: string }`
- `DELETE /admin/providers/:id/notification-emails/:emailId`

**Per-provider, self-managed** (`providers.controller.ts`, provider role, scoped to the caller's own provider record — look up `providerId` from `req.user` the same way `providers.service.ts`'s existing `findMyProfile()` does, never trust a client-supplied provider id):
- `GET /providers/me/notification-emails`
- `POST /providers/me/notification-emails` — `{ label?: string, email: string }`
- `DELETE /providers/me/notification-emails/:emailId` — service layer verifies the email row's `providerId` matches the caller before deleting (403 otherwise), same ownership-check pattern already used elsewhere in `providers.service.ts`.

Email validation: reuse `class-validator`'s `@IsEmail()` on all three POST DTOs, consistent with the rest of the codebase's DTO conventions.

## Frontend — Admin UI

**New page** `health-hub-africa-admin/app/(dashboard)/notification-recipients/page.tsx`: a table (label, email, active toggle, delete) plus an add form, mirroring the existing `/notifications` (NotificationDelivery log) page's structure and the `/feature-flags` page's simplicity. Linked from Settings → System tab via a new `LinkCard`, same pattern as the existing Feature Flags / Audit Logs links in `SystemTab.tsx`. Added to `AdminSidebar.tsx` under the existing "System" group.

**Provider admin detail**: `ProviderDetailDialog` (in `app/(dashboard)/providers/page.tsx`) gains a small "Notification Emails" section — list of the provider's extra emails with remove buttons, plus an inline add-email input. Uses the new `/admin/providers/:id/notification-emails` endpoints.

## Frontend — Provider Self-Service UI

`SettingsTabs`'s existing `NotificationsTab.tsx` gains an "Additional Recipients" `Card`, rendered only when `useAuthStore(s => s.user)?.role === 'provider'` (same role-gate pattern `SystemTab.tsx` already uses for `super_admin`). Lists the provider's own extra emails with add/remove, backed by `/providers/me/notification-emails`.

## Testing

- API: unit tests for `resolveOpsRecipients()` (dedup logic, null-provider handling, inactive-row exclusion) following the existing `notifications.service.spec.ts` pattern (plain instantiation with mocked Prisma, no NestJS TestingModule).
- API: e2e/manual verification against a real appointment status change per event type, confirming delivery to all configured recipients (global + provider-specific) — no existing e2e harness covers the API directly (this repo's Playwright suites are all `myvaultplus-web` marketing-site e2e; API changes are verified via manual curl/log inspection per this session's established pattern).
- Admin frontend: `tsc --noEmit` clean + manual browser verification of the new page and the provider-detail addition (no unit-test runner exists in `health-hub-africa-admin`, matching prior sessions' documented convention).

## Rollout Note

Because the migration seeds the current hardcoded address as the first recipient, deploying this feature alone changes nothing observable until an admin adds more recipients — safe to ship ahead of any UI polish iteration.
