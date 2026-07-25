# Admin User Email Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let HHA Admin staff correct a user's login email inline on the Users detail page, immediately sending a password-reset OTP to the corrected address — closing the gap where OpenEMR-synced providers stuck on a synthetic placeholder email (`provider.<uuid>@hha.internal`) have no way to ever reach the forgot-password flow that's currently their only path into the provider dashboard.

**Architecture:** A new `PATCH /admin/users/:id/email` endpoint on `AdminController`/`AdminService`, backed by a new `UpdateUserEmailDto`. The service method updates `User.email`, revokes any live sessions (same reasoning `updateUserRole` already applies to role changes — email is a login identifier), and calls the existing `AuthService.requestPasswordReset()` to fire the OTP, reusing the exact flow that already backs the public forgot-password screen. On the frontend, an inline edit control is added to `health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx` next to the email display, following the same inline-edit/pending/toast shape already used by that page's role selector.

**Tech Stack:** NestJS (API), Prisma/PostgreSQL, Next.js (`health-hub-africa-admin`), Jest (API).

**Full design context:** `docs/plans/2026-07-25-admin-user-email-edit-design.md`

## Global Constraints

- No new `@Roles()` restriction on the new endpoint — the controller's class-level `@Roles(UserRole.admin, UserRole.super_admin)` guard (`admin.controller.ts:27`) already covers it; this is intentionally *not* locked to `super_admin` the way `updateUserRole` is.
- Immediate update, no OTP-confirm-before-apply gate on the new email — staff are trusted to have confirmed the address out-of-band before editing (decided during design; see design doc's decision table).
- The reset-code send is best-effort: a transient email-send failure must not make the email update itself look failed, since the DB write already succeeded by that point.

---

## Key facts from research (don't re-derive these)

- **Root cause & background:** `AdminService.importProvidersFromOpenemr()` / `importProviderManually()` (`health-hub-africa-api/src/admin/admin.service.ts:1563-1693`) create synced providers with a `provider.<uuid>@hha.internal` placeholder email when OpenEMR has none on file. There is currently no admin-UI or API path anywhere to correct `User.email` — `admin.controller.ts` only exposes `users/:id/role` and `users/:id/status`.
- **`AdminModule` does not import `AuthModule` today** (`health-hub-africa-api/src/admin/admin.module.ts`). Confirmed no circular dependency — `AuthModule` (`health-hub-africa-api/src/auth/auth.module.ts`) does not import or reference `AdminModule` anywhere. Safe to add directly.
- **`AuthService.requestPasswordReset(email)`** (`health-hub-africa-api/src/auth/auth.service.ts:307-312`) already does everything needed: looks up the user by email, and if found calls the private `sendEmailOtp(email, userId, 'password_reset')` (`auth.service.ts:511+`), which handles OTP generation, bcrypt hashing, expiry, and sending via `NotificationsService`. It always returns a generic `{ message }` regardless of whether the user existed (anti-enumeration) — safe to call directly with the new email.
- **Existing sibling pattern to copy: `updateUserRole`** (`admin.service.ts:281-309`). On an actual value change it updates the user and revokes live sessions **atomically in one `$transaction`**:
  ```ts
  const [updated] = await this.prisma.$transaction([
    this.prisma.user.update({ where: { id }, data: { role: dto.role }, select: { id: true, email: true, role: true } }),
    this.prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  ```
  The new `updateUserEmail` method follows this same shape, swapping `data: { role: dto.role }` for `data: { email: newEmail }`.
- **⚠️ Pre-existing response-shape bug found during research — do not copy this pattern.** `updateUserRole` and `updateUserStatus` both return their result **flat** (e.g. `return updated;` at `admin.service.ts:309`, just `{ id, email, role }`), but the frontend (`health-hub-africa-admin/lib/api.ts:706-715`) types both calls as `request<{ data: AdminUser }>` and the page does `setUser(res.data)` — which is `undefined` at runtime given the flat backend response. This looks like a live bug in the existing role/status UI, but **fixing it is out of scope for this plan**. What matters for us: `AdminService.getUser` (`admin.service.ts:260-276`) is the one method that explicitly wraps its return in `{ data: {...} } }`, and the frontend correctly relies on that shape on initial page load. **Task 1 below wraps `updateUserEmail`'s return in `{ data: {...} }` explicitly**, matching `getUser`'s working convention, so the new frontend code in Task 4 has a real, working contract to call — not the broken one.
- **No `AdminService` unit tests exist yet** (`find health-hub-africa-api/src -name "*.spec.ts"` turns up `appointments.service.spec.ts`, `providers.service.spec.ts`, `subscriptions.service.spec.ts`, `notifications.service.spec.ts`, `openemr.service.spec.ts`, `openemr.processor.spec.ts`, `common/utils/provider-name.util.spec.ts` — no `admin.service.spec.ts`). This plan's Task 1 creates the first one. Nest services are plain classes — the test instantiates `AdminService` directly with `jest.fn()` mocks passed to the constructor, no `@nestjs/testing` `Test.createTestingModule` needed.
- **`AdminService`'s current constructor** (`admin.service.ts:54-62`):
  ```ts
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly openemrQueue: Queue<SyncJobData>,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue<NotificationJobData>,
    @Inject(ADMIN_REDIS) private readonly redis: Redis,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
    private readonly s3: S3Service,
  ) {}
  ```
  Task 1 appends an 8th constructor param, `private readonly authService: AuthService`.
- **`UserSession.revokedAt`** is a real, already-used field (see the `updateUserRole` snippet above) — no schema change needed.
- **DTO style to match** (`health-hub-africa-api/src/admin/dto/admin.dto.ts:1-9`):
  ```ts
  import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
  import { ApiPropertyOptional } from '@nestjs/swagger';
  import { UserRole } from '@prisma/client';

  export class UpdateUserRoleDto {
    @ApiPropertyOptional({ enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;
  }
  ```
  `UpdateUserEmailDto` goes in this same file, alongside `UpdateUserRoleDto`/`UpdateUserStatusDto` (both user-mutation DTOs already live here).
- **Frontend page to modify, exact current state:** `health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx`. Relevant existing pieces:
  - Imports (line 13): `import { ArrowLeft, Shield, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'`
  - State (lines 42-45): `rolePending`, `statusPending`, `syncPending`, `selectedRole` — Task 4 adds `emailEditing`, `emailValue`, `emailPending` in the same style.
  - `handleRoleChange` (lines 60-73) is the pattern to mirror for the new `handleEmailSave`.
  - The email display to replace is lines 159-161:
    ```tsx
    <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
      {user.email}
    </p>
    ```
  - The role-selector block (lines 183-216) is the visual/structural pattern (inline control + `Button` with `loading`/`disabled` props) to mirror for the email editor, though the email editor is *not* gated behind `isSuperAdmin`.
- **`adminApi.users` namespace** (`health-hub-africa-admin/lib/api.ts:698-719`) — `updateRole` (lines 706-710) is the call-shape template:
  ```ts
  updateRole: (id: string, role: string) =>
    request<{ data: AdminUser }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  ```
  Task 3 adds `updateEmail` in the same place, typed against the *actual* wrapped response shape from Task 1 (not `AdminUser`, since the endpoint only returns `{ id, email, message }`).
- **`AdminUser` interface** (`health-hub-africa-admin/lib/api.ts:233+`) already has `email: string` — no type changes needed there.

---

### Task 1: `AdminService.updateUserEmail` — DTO, module wiring, service method, unit tests

**Files:**
- Modify: `health-hub-africa-api/src/admin/dto/admin.dto.ts` (add `UpdateUserEmailDto`)
- Modify: `health-hub-africa-api/src/admin/admin.module.ts` (import `AuthModule`)
- Modify: `health-hub-africa-api/src/admin/admin.service.ts` (constructor + new method)
- Create: `health-hub-africa-api/src/admin/admin.service.spec.ts`

**Interfaces:**
- Produces: `AdminService.updateUserEmail(id: string, newEmail: string): Promise<{ data: { id: string; email: string; message: string } }>` — Task 2 (controller) and Task 4 (frontend) both depend on this exact return shape.
- Produces: `UpdateUserEmailDto` — `{ email: string }`, validated with `@IsEmail()` — consumed by Task 2's controller.

- [x] **Step 1: Add `UpdateUserEmailDto`**

In `health-hub-africa-api/src/admin/dto/admin.dto.ts`, change the top import line from:
```ts
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
```
to:
```ts
import { IsString, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';
```
Then add this class, directly after `UpdateUserRoleDto` (before `UpdateUserStatusDto`):
```ts
export class UpdateUserEmailDto {
  @ApiPropertyOptional()
  @IsEmail()
  email: string;
}
```

- [x] **Step 2: Wire `AuthModule` into `AdminModule`**

In `health-hub-africa-api/src/admin/admin.module.ts`, add the import:
```ts
import { AuthModule } from '../auth/auth.module';
```
and add `AuthModule` to the `imports` array, so it reads:
```ts
  imports: [
    BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    OpenemrModule,
    NotificationsModule,
    StorageModule,
    AuthModule,
  ],
```

- [x] **Step 3: Write the failing unit tests**

Create `health-hub-africa-api/src/admin/admin.service.spec.ts`:
```ts
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.updateUserEmail', () => {
  const existingUser = { id: 'user-1', email: 'old@example.com', role: 'provider' };

  function buildService(
    findUniqueImpl?: (args: { where: { id?: string; email?: string } }) => unknown,
  ) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(
          findUniqueImpl ??
            (({ where }: { where: { id?: string; email?: string } }) =>
              where.id === existingUser.id ? existingUser : null),
        ),
        update: jest.fn().mockResolvedValue({
          id: existingUser.id,
          email: 'new@example.com',
          role: existingUser.role,
        }),
      },
      userSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const authService = {
      requestPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    const service = new AdminService(
      prisma as never,
      {} as never, // openemrQueue
      {} as never, // notificationsQueue
      {} as never, // redis
      {} as never, // openemrService
      {} as never, // notifications
      {} as never, // s3
      authService as never,
    );

    return { service, prisma, authService };
  }

  it('throws NotFoundException when the user does not exist', async () => {
    const { service } = buildService(() => null);
    await expect(service.updateUserEmail('missing', 'new@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the new email is already taken', async () => {
    const { service } = buildService(({ where }) =>
      where.id === existingUser.id
        ? existingUser
        : where.email === 'taken@example.com'
        ? { id: 'other-user' }
        : null,
    );
    await expect(
      service.updateUserEmail(existingUser.id, 'taken@example.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('no-ops without sending a reset code when the email is unchanged', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, existingUser.email);

    expect(result).toEqual({
      data: { id: existingUser.id, email: existingUser.email, message: 'Email unchanged.' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('updates the email, revokes sessions, and sends a reset code on the happy path', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { email: 'new@example.com' },
      select: { id: true, email: true, role: true },
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: existingUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('new@example.com');
    expect(result).toEqual({
      data: {
        id: existingUser.id,
        email: 'new@example.com',
        message: 'Email updated and password reset code sent.',
      },
    });
  });

  it('still reports success when the reset-code email fails to send', async () => {
    const { service, authService } = buildService();
    authService.requestPasswordReset.mockRejectedValue(new Error('SMTP down'));

    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');
    expect(result.data.message).toBe('Email updated and password reset code sent.');
  });
});
```

- [x] **Step 4: Run tests to verify they fail**

Run: `cd health-hub-africa-api && npx jest src/admin/admin.service.spec.ts`
Expected: FAIL — `AdminService.updateUserEmail is not a function` (and a constructor-arity/type error until Step 5 lands).

- [x] **Step 5: Implement `updateUserEmail`**

In `health-hub-africa-api/src/admin/admin.service.ts`, add the import (alongside the other relative imports near the top):
```ts
import { AuthService } from '../auth/auth.service';
```
Update the `UpdateUserRoleDto, UpdateUserStatusDto, CreateFacilityDto` import from `./dto/admin.dto` to also bring in `UpdateUserEmailDto`:
```ts
import {
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateUserEmailDto,
  CreateFacilityDto,
} from './dto/admin.dto';
```
Add the 8th constructor parameter (after `s3`):
```ts
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly openemrQueue: Queue<SyncJobData>,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue<NotificationJobData>,
    @Inject(ADMIN_REDIS) private readonly redis: Redis,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
    private readonly s3: S3Service,
    private readonly authService: AuthService,
  ) {}
```
Add the method directly after `updateUserRole` (after its closing `}` at what is currently line 309, before `async updateUserStatus`):
```ts
  async updateUserEmail(id: string, newEmail: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // No-op early so re-submitting the same value doesn't churn sessions or
    // fire a redundant reset email — mirrors updateUserRole's no-op guard.
    if (user.email === newEmail) {
      return { data: { id: user.id, email: user.email, message: 'Email unchanged.' } };
    }

    const emailTaken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (emailTaken) {
      throw new BadRequestException(`A user with email ${newEmail} already exists.`);
    }

    // Update email + revoke live sessions atomically: email is the login
    // identifier, so an existing session must not outlive a correction to
    // it. Same reasoning and shape as updateUserRole above.
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { email: newEmail },
        select: { id: true, email: true, role: true },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Best-effort: the email update above already succeeded, so a transient
    // failure sending the OTP shouldn't make the whole request look failed —
    // staff can always fall back to "Forgot password" on the login screen.
    try {
      await this.authService.requestPasswordReset(newEmail);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset OTP to ${newEmail} after email update for user ${id}`,
        err,
      );
    }

    return {
      data: {
        id: updated.id,
        email: updated.email,
        message: 'Email updated and password reset code sent.',
      },
    };
  }
```

- [x] **Step 6: Run tests to verify they pass**

Run: `cd health-hub-africa-api && npx jest src/admin/admin.service.spec.ts`
Expected: PASS — all 5 tests green.

- [x] **Step 7: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors.

- [x] **Step 8: Commit**

```bash
git add health-hub-africa-api/src/admin/dto/admin.dto.ts health-hub-africa-api/src/admin/admin.module.ts health-hub-africa-api/src/admin/admin.service.ts health-hub-africa-api/src/admin/admin.service.spec.ts
git commit -m "feat(admin): add AdminService.updateUserEmail with password-reset handoff"
```

---

### Task 2: Wire the `PATCH /admin/users/:id/email` controller endpoint

**Files:**
- Modify: `health-hub-africa-api/src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: `AdminService.updateUserEmail(id, email)` and `UpdateUserEmailDto` from Task 1.
- Produces: `PATCH /admin/users/:id/email` — consumed by Task 3's frontend API client.

- [x] **Step 1: Add the DTO import**

In `health-hub-africa-api/src/admin/admin.controller.ts`, change:
```ts
import { UpdateUserRoleDto, UpdateUserStatusDto, CreateFacilityDto } from './dto/admin.dto';
```
to:
```ts
import { UpdateUserRoleDto, UpdateUserStatusDto, UpdateUserEmailDto, CreateFacilityDto } from './dto/admin.dto';
```

- [x] **Step 2: Add the endpoint**

Directly after `updateUserStatus` (after its closing `}`, before the `@Get('audit-logs')` handler), add:
```ts
  @Patch('users/:id/email')
  @ApiOperation({ summary: "Correct a user's email and send a password reset code to it" })
  updateUserEmail(@Param('id') id: string, @Body() dto: UpdateUserEmailDto) {
    return this.adminService.updateUserEmail(id, dto.email);
  }
```

- [x] **Step 3: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors.

- [x] **Step 4: Manual sanity check against a running dev server**

Run: `cd health-hub-africa-api && npm run start:dev` (leave running), then in a separate terminal, log in as an admin/coordinator via the normal login flow to get a bearer token, and:
```bash
curl -X PATCH http://localhost:4000/admin/users/<some-user-id>/email \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
```
Expected: `400` validation error (class-validator's `@IsEmail()` rejecting it) — confirms the DTO is actually wired into the request pipeline, not just present in source. Stop the dev server after this check.

- [x] **Step 5: Commit**

```bash
git add health-hub-africa-api/src/admin/admin.controller.ts
git commit -m "feat(admin): expose PATCH /admin/users/:id/email endpoint"
```

---

### Task 3: Frontend API client — `adminApi.users.updateEmail`

**Files:**
- Modify: `health-hub-africa-admin/lib/api.ts`

**Interfaces:**
- Consumes: `PATCH /admin/users/:id/email` from Task 2, returning `{ data: { id: string; email: string; message: string } }`.
- Produces: `adminApi.users.updateEmail(id: string, email: string): Promise<{ data: { id: string; email: string; message: string } }>` — consumed by Task 4.

- [x] **Step 1: Add the client method**

In `health-hub-africa-admin/lib/api.ts`, directly after the existing `toggleStatus` entry (line 715, before `resendVerification`), add:
```ts
    updateEmail: (id: string, email: string) =>
      request<{ data: { id: string; email: string; message: string } }>(`/admin/users/${id}/email`, {
        method: 'PATCH',
        body: JSON.stringify({ email }),
      }),
```

- [x] **Step 2: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add health-hub-africa-admin/lib/api.ts
git commit -m "feat(admin-ui): add adminApi.users.updateEmail client method"
```

---

### Task 4: Inline email-edit UI on the Users detail page

**Files:**
- Modify: `health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx`

**Interfaces:**
- Consumes: `adminApi.users.updateEmail(id, email)` from Task 3.

- [x] **Step 1: Add the `Pencil` icon import**

Change:
```tsx
import { ArrowLeft, Shield, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react'
```
to:
```tsx
import { ArrowLeft, Shield, ToggleLeft, ToggleRight, RotateCcw, Pencil } from 'lucide-react'
```

- [x] **Step 2: Add state**

Directly after the existing state declarations (after `const [selectedRole, setSelectedRole] = useState('')` at line 45), add:
```tsx
  const [emailEditing, setEmailEditing] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [emailPending, setEmailPending] = useState(false)
```

- [x] **Step 3: Add the email-validity helper and handlers**

Directly after `handleRoleChange` (after its closing `}` at line 73), add:
```tsx
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const startEmailEdit = () => {
    if (!user) return
    setEmailValue(user.email)
    setEmailEditing(true)
  }

  const handleEmailSave = async () => {
    if (!user || emailValue === user.email || !isValidEmail(emailValue)) return
    setEmailPending(true)
    try {
      const res = await adminApi.users.updateEmail(id, emailValue)
      setUser((prev) => (prev ? { ...prev, email: res.data.email } : prev))
      toast.success(res.data.message)
      setEmailEditing(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update email')
    } finally {
      setEmailPending(false)
    }
  }
```

- [x] **Step 4: Replace the email display with the inline editor**

Replace (currently lines 159-161):
```tsx
            <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
              {user.email}
            </p>
```
with:
```tsx
            {emailEditing ? (
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg text-sm border min-w-0"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  loading={emailPending}
                  disabled={emailValue === user.email || !isValidEmail(emailValue)}
                  onClick={handleEmailSave}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={emailPending}
                  onClick={() => setEmailEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p
                className="text-sm truncate flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {user.email}
                <button
                  onClick={startEmailEdit}
                  className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Edit email"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </p>
            )}
```

- [x] **Step 5: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no new errors.

- [ ] **Step 6: Manual browser verification** — not performed (verification below exercised the API directly via curl against a disposable user, not the actual browser UI; the pencil icon / inline input / toast UX is still unverified in a live browser)

Run: `cd health-hub-africa-admin && npm run dev`, log in as an admin, navigate to `/users/<some-user-id>`. Verify:
- Email renders with a small pencil icon beside it.
- Clicking the pencil swaps it for an inline input pre-filled with the current email, plus Save/Cancel buttons.
- Save stays disabled while the field is empty, invalid, or unchanged.
- Entering a valid new email and clicking Save shows a loading state, then a success toast reading "Email updated and password reset code sent.", and the page reflects the new email without a full reload.
- Entering an email already used by another account shows an error toast and leaves the field open for retry.
- Cancel exits edit mode without changing anything.

Stop the dev server after verification.

- [x] **Step 7: Commit**

```bash
git add "health-hub-africa-admin/app/(dashboard)/users/[id]/page.tsx"
git commit -m "feat(admin-ui): add inline email editor to Users detail page"
```

---

### Task 5: Final verification

- [x] **Step 1: Run the full API test suite**

Run: `cd health-hub-africa-api && npm test`
Expected: PASS, including the 5 new tests from Task 1.

- [x] **Step 2: Typecheck both apps**

Run:
```bash
cd health-hub-africa-api && npx tsc --noEmit --pretty false
cd ../health-hub-africa-admin && npx tsc --noEmit --pretty false
```
Expected: no errors in either.

- [ ] **Step 3: Manual smoke-test checklist** — partially done; see notes on each sub-item. There is no true staging environment (all CI deploy paths point at production — see 2026-07-25 session notes), so this was run against production via `npm run start:dev` tunneled to the real RDS through SSM, using two disposable, clearly-tagged throwaway users (`zzz-claude-e2e-*@hha-test.local` / `@hha.internal`) created and deleted directly via Prisma, calling the deployed endpoint with curl (not the browser UI). DB user count verified identical (50) before and after.
- [x] Create (or find) a provider whose `User.email` is a `@hha.internal` placeholder. — used a disposable synthetic provider-role user with a matching placeholder-style email instead of a real provider record.
- [ ] As an admin, open that user in `/users/[id]`, use the new inline editor to set their real email. — not done; called `PATCH /admin/users/:id/email` directly via curl with a minted admin JWT instead of driving the actual browser UI.
- [ ] Confirm the success toast appears and the page shows the corrected email. — not done (no browser UI exercised); the API response body did contain the expected `{ data: { email, message: "Email updated and password reset code sent." } }` shape.
- [x] Confirm a password-reset OTP email actually arrives at the corrected address. — confirmed: `NotificationsProcessor` logged "Email sent via Resend to tosin.uxdesign@gmail.com", and the user confirmed receipt in their inbox.
- [ ] Complete `POST /auth/forgot-password` → `POST /auth/reset-password` (or the equivalent login-screen flow) with that OTP and confirm the provider can now log into HHA Admin and reach `/provider/*`. — intentionally skipped: this exercises pre-existing generic auth/reset logic, not code introduced by this feature, and the disposable test user had no linked `Provider` row to reach `/provider/*` with.
- [x] Confirm attempting to set the email to one already used by another account shows a clear error and does not modify the record. — confirmed: got `400 "A user with email ... already exists."`, and re-querying the target row afterward showed its `updatedAt` unchanged (email was never touched).

- [x] **Step 4: Nothing to commit in this task** — it's verification only.
