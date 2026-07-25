# Admin User Email Edit — Design

**Goal:** Give HHA Admin staff a simple, in-UI way to correct a user's login email — closing the gap where OpenEMR-synced providers can get stuck with a synthetic placeholder address (`provider.<uuid>@hha.internal`) and have no way to receive the forgot-password OTP that's currently their only path into the provider dashboard (`app/(dashboard)/provider/*` in `health-hub-africa-admin`, gated by `User.role === 'provider'`).

**Architecture:** A new `PATCH /admin/users/:id/email` endpoint on the existing `AdminService`/`AdminController`, paired with an inline edit affordance on the Users detail page (`health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx`) next to the existing role-selector pattern. Saving immediately updates `User.email` and reuses `AuthService.requestPasswordReset()` (the same function backing the public forgot-password flow) to fire an OTP to the corrected address in the same action — one click for staff, no separate manual step to remember.

**Tech Stack:** NestJS (API), Prisma/PostgreSQL, Next.js (`health-hub-africa-admin`), Jest (API).

---

## Background

Root cause (from investigation): `AdminService.importProvidersFromOpenemr()` and `importProviderManually()` (`health-hub-africa-api/src/admin/admin.service.ts:1563-1693`) create a `User` row per synced provider. When OpenEMR has no email on file, the code falls back to `provider.<uuid>@hha.internal` — an address nobody can receive mail at. There is currently:
- No admin-UI or API path to edit `User.email` anywhere in the codebase (`admin.controller.ts` only exposes `users/:id/role` and `users/:id/status`).
- No self-service path either (`providers.controller.ts`'s `me/notification-emails` are additive CC addresses, not the login email).

So a provider with a placeholder email has no way to ever complete `forgot-password` (`POST /auth/forgot-password` → OTP → `POST /auth/reset-password`), since the OTP goes to an address they can't read.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Scope | General user-email-edit capability on the Users page (not provider-only) — more reusable, and the Users detail page is the natural home for it. |
| Permission | Same access level as viewing the Users page today (no extra role gate) — this is data-hygiene cleanup, not a privilege change, and shouldn't bottleneck on `super_admin` the way role changes do. |
| Verification | Immediate update, no OTP-confirm-before-apply step — staff are trusted to have confirmed the correct address with the provider directly before editing. Requiring the new email to already work would recreate the exact deadlock this feature exists to solve. |
| Post-update flow | Auto-send a password-reset OTP to the new email as part of the same save action, reusing `AuthService.requestPasswordReset()`. |

## UI/UX Flow

**Where:** `health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx`, next to the email display (currently plain text around line 160), following the same interaction language already used for the role selector at lines 183-211 (inline control + `pending` boolean + toast on completion).

1. Email renders as text with a small edit (pencil) icon beside it. No permanently-open input — most users never need this touched.
2. Click → inline editable field, pre-filled with the current email, with **Save**/**Cancel** buttons. No modal — matches the page's existing inline-edit pattern rather than introducing a new one.
3. **Save** is disabled until the value is a syntactically valid email and differs from the current value (mirrors the disabled-state logic already on the role-change button).
4. On save: button enters a loading state (new `emailPending` state, same shape as `rolePending`/`statusPending`) and calls the API.
   - **Success:** toast — `"Email updated. Password reset code sent to new@address.com"` — one message, so staff don't wonder whether a second step is needed. Page reloads the user record (same pattern as `handleRoleChange`) so the new value is reflected immediately.
   - **Failure** (e.g. email already used by another account): toast shows the specific error; field stays open and editable for retry.

## Backend API

**Endpoint:** `PATCH /admin/users/:id/email`, body `{ email: string }`.

**`UpdateUserEmailDto`** — single `@IsEmail() email: string` field (same shape as `provider-notification-email.dto.ts`'s validator).

**Controller** (`admin.controller.ts`, alongside `users/:id/role` and `users/:id/status`):
```ts
@Patch('users/:id/email')
@ApiOperation({ summary: "Update a user's email and send a password reset code to it" })
updateUserEmail(@Param('id') id: string, @Body() dto: UpdateUserEmailDto) {
  return this.adminService.updateUserEmail(id, dto.email);
}
```
No `@Roles()` restriction, per the permission decision above.

**`AdminService.updateUserEmail(id, newEmail)`:**
1. Look up the target user; `NotFoundException` if missing.
2. Check no *other* user already has `newEmail` (same conflict-check pattern as `importProviderManually`, admin.service.ts:1574-1579); `BadRequestException` if taken.
3. No-op safely (skip the OTP send, return early) if `newEmail === user.email` — though the UI already disables Save in this case, the service shouldn't assume the client always enforces that.
4. `prisma.user.update({ where: { id }, data: { email: newEmail } })`.
5. Call `this.authService.requestPasswordReset(newEmail)` — reuses the existing OTP generation/hashing/expiry/email-template logic (`auth.service.ts:307-312`) rather than writing new notification code, keeping behavior identical to the normal forgot-password flow the provider lands on next.
6. Wrap the OTP-send call so a transient failure there doesn't fail the whole request — the DB write already succeeded at that point, so treat step 5 as best-effort (log on failure) rather than part of the same failure domain as steps 1-4.
7. Return `{ email: newEmail, message: 'Email updated and password reset code sent.' }`.

## Wiring

`AdminModule` doesn't currently import `AuthModule` (confirmed no circular dependency — `AuthModule` doesn't reference `AdminModule` anywhere). Add:
```ts
// admin.module.ts
imports: [..., AuthModule],
```
`AdminService` constructor gains `private readonly authService: AuthService`.

## Testing

- `admin.service.spec.ts`: conflict case (email taken), not-found case, no-op case (same email), happy path asserting `authService.requestPasswordReset` was called with the new email and the OTP-send-failure doesn't fail the overall call.
- No new E2E suite — internal-only admin action. If a Playwright spec already covers the Users page, add one assertion there rather than standing up new test infra from scratch.

## Out of scope (for now)

- Fixing the root cause at import time (prompting for a real email during OpenEMR sync instead of falling back to a placeholder) — noted as a possible follow-up, not required to close this gap since the edit capability handles it after the fact regardless of how the bad email got there.
- OTP-confirm-before-apply for the new email — explicitly decided against; see table above.
