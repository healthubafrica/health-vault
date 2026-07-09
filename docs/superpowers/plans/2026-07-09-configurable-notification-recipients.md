# Configurable Notification Recipients Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `APPOINTMENTS_OPS_EMAIL` single-address ops notification with an admin-managed global recipient list plus per-provider extra emails (editable by admin and by the provider themselves), and expand the ops fan-out to fire on all six appointment lifecycle events instead of three.

**Architecture:** Two new Prisma models (`NotificationRecipient` global list, `ProviderNotificationEmail` per-provider list) back three sets of REST endpoints (admin CRUD for both, provider self-service CRUD for their own list) in the existing `AdminModule`/`ProvidersModule`. `AppointmentsService.notifyAppointmentEvent()`'s hardcoded ops block is replaced with a `resolveOpsRecipients()` query that merges + dedupes both lists for the appointment's provider. Two admin-frontend surfaces (a new recipients page, a provider-detail addition) and one provider-frontend surface (a Settings tab addition) manage the data.

**Tech Stack:** NestJS 10, Prisma/PostgreSQL, class-validator DTOs, Next.js admin app (inline styles + Tailwind utility classes, existing component library).

## Global Constraints

- Global recipient labels are free text (no fixed role enum) — confirmed during brainstorming.
- Global recipients apply platform-wide (no per-facility scoping) — confirmed during brainstorming.
- Ops fan-out fires on all six `AppointmentEmailEvent` values: `requested`, `confirmed`, `cancelled`, `rescheduled`, `completed`, `no_show` — confirmed during brainstorming (expanded from the current 3).
- No changes to patient/provider's own appointment notifications (`sendAppointmentEmail` calls in `notifyAppointmentEvent`) — those already work and are out of scope.
- `APPOINTMENTS_OPS_EMAIL` env var and `DEFAULT_APPOINTMENTS_OPS_EMAIL` constant are removed entirely once the migration seeds the equivalent DB row — DB becomes the single source of truth, no fallback to env var.
- Email fields use `class-validator`'s `@IsEmail()`, matching every existing email DTO field in this codebase.
- Provider self-service endpoints must resolve the caller's own `providerId` from the JWT (`currentUser.providerId`, falling back to a `Provider.findUnique({ where: { userId } })` lookup if absent from an older token) — never trust a client-supplied provider id for the `/providers/me/*` routes.

---

### Task 1: Prisma schema, migration, and seed

**Files:**
- Modify: `health-hub-africa-api/prisma/schema.prisma`
- Create: `health-hub-africa-api/prisma/migrations/20260709140000_notification_recipients/migration.sql`

**Interfaces:**
- Consumes: nothing (first task)
- Produces (consumed by Tasks 2-4): Prisma models `NotificationRecipient` (fields: `id`, `label`, `email`, `isActive`, `createdBy`, `createdAt`, `updatedAt`) and `ProviderNotificationEmail` (fields: `id`, `providerId`, `label`, `email`, `isActive`, `addedBy`, `createdAt`), both accessible via `this.prisma.notificationRecipient` / `this.prisma.providerNotificationEmail` after `prisma generate`.

- [ ] **Step 1: Add the two models to schema.prisma**

Open `health-hub-africa-api/prisma/schema.prisma` and find the `model Provider {` block (search for `model Provider {`). Inside that block, find this line near the end of the relations section:

```prisma
  erFinalReports        ExpertReviewFinalReport[]
```

Add a new relation line immediately after it (before the closing `@@map("providers")` and `}`):

```prisma
  erFinalReports        ExpertReviewFinalReport[]
  notificationEmails    ProviderNotificationEmail[]
```

Then, immediately after the `model Provider { ... }` block's closing `}`, add the two new models:

```prisma
model NotificationRecipient {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  label     String
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
  label      String?
  email      String
  isActive   Boolean  @default(true) @map("is_active")
  addedBy    String?  @map("added_by") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")

  provider   Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@index([providerId])
  @@map("provider_notification_emails")
}
```

- [ ] **Step 2: Write the migration SQL by hand**

Create the directory and file `health-hub-africa-api/prisma/migrations/20260709140000_notification_recipients/migration.sql`:

```sql
-- CreateTable: notification_recipients
CREATE TABLE "notification_recipients" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "label"      TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable: provider_notification_emails
CREATE TABLE "provider_notification_emails" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider_id" UUID NOT NULL,
  "label"       TEXT,
  "email"       TEXT NOT NULL,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "added_by"    UUID,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_notification_emails_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "provider_notification_emails"
  ADD CONSTRAINT "provider_notification_emails_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "provider_notification_emails_provider_id_idx" ON "provider_notification_emails"("provider_id");

-- Seed: migrate the existing hardcoded APPOINTMENTS_OPS_EMAIL default so
-- behavior is unchanged the moment this ships — this address becomes an
-- editable row instead of an env var.
INSERT INTO "notification_recipients" ("id", "label", "email", "is_active", "updated_at")
VALUES (gen_random_uuid(), 'Operations', 'appointments@healthhubafrica.com', true, CURRENT_TIMESTAMP);
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `cd health-hub-africa-api && npx prisma generate`
Expected: `✔ Generated Prisma Client` with no errors. This only reads `schema.prisma` — it does not require database connectivity.

- [ ] **Step 4: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no errors (nothing consumes the new models yet, so this just confirms the schema change didn't break existing code).

- [ ] **Step 5: Commit**

```bash
git add health-hub-africa-api/prisma/schema.prisma health-hub-africa-api/prisma/migrations/20260709140000_notification_recipients/migration.sql
git commit -m "feat(notifications): add NotificationRecipient and ProviderNotificationEmail models"
```

---

### Task 2: Admin backend endpoints (global recipients + per-provider emails)

**Files:**
- Create: `health-hub-africa-api/src/admin/dto/notification-recipient.dto.ts`
- Create: `health-hub-africa-api/src/providers/dto/provider-notification-email.dto.ts`
- Modify: `health-hub-africa-api/src/admin/admin.service.ts`
- Modify: `health-hub-africa-api/src/admin/admin.controller.ts`

**Interfaces:**
- Consumes: `NotificationRecipient`/`ProviderNotificationEmail` Prisma models from Task 1.
- Produces (consumed by Task 5, the admin frontend): `GET/POST /admin/notification-recipients`, `PATCH/DELETE /admin/notification-recipients/:id`, `GET/POST /admin/providers/:id/notification-emails`, `DELETE /admin/providers/:id/notification-emails/:emailId`.
- Produces (consumed by Task 3): `CreateProviderNotificationEmailDto` (shared DTO, defined here but imported by `providers.controller.ts`).

- [ ] **Step 1: Create the global-recipient DTOs**

Create `health-hub-africa-api/src/admin/dto/notification-recipient.dto.ts`:

```ts
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationRecipientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}

export class UpdateNotificationRecipientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

- [ ] **Step 2: Create the shared provider-notification-email DTO**

Create `health-hub-africa-api/src/providers/dto/provider-notification-email.dto.ts` (lives in `providers/dto` since it's the provider domain's own DTO, imported by both `admin.controller.ts` and `providers.controller.ts` — cross-module DTO imports are a normal pattern in this codebase, e.g. `admin.controller.ts` already imports `ImportProviderManuallyDto` from its own `dto/` and DTOs are just plain classes):

```ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderNotificationEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}
```

- [ ] **Step 3: Add the service methods**

In `health-hub-africa-api/src/admin/admin.service.ts`, add this import near the other DTO imports at the top of the file (alongside the existing `import { ImportProviderManuallyDto } from './dto/import-provider-manually.dto';` — find that exact line and add these two lines directly after it):

```ts
import { CreateNotificationRecipientDto, UpdateNotificationRecipientDto } from './dto/notification-recipient.dto';
import { CreateProviderNotificationEmailDto } from '../providers/dto/provider-notification-email.dto';
```

Then add these methods to the `AdminService` class (append at the end of the class, immediately before the final closing `}` of `export class AdminService { ... }`):

```ts
  // ── Notification Recipients (global) ────────────────────────────────────

  async listNotificationRecipients() {
    return this.prisma.notificationRecipient.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createNotificationRecipient(dto: CreateNotificationRecipientDto, currentUser: JwtPayload) {
    return this.prisma.notificationRecipient.create({
      data: { label: dto.label, email: dto.email, createdBy: currentUser.sub },
    });
  }

  async updateNotificationRecipient(id: string, dto: UpdateNotificationRecipientDto) {
    const existing = await this.prisma.notificationRecipient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification recipient not found');
    return this.prisma.notificationRecipient.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteNotificationRecipient(id: string) {
    const existing = await this.prisma.notificationRecipient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Notification recipient not found');
    await this.prisma.notificationRecipient.delete({ where: { id } });
    return { message: 'Notification recipient deleted' };
  }

  // ── Provider Notification Emails (admin-managed) ─────────────────────────

  async listProviderNotificationEmails(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.prisma.providerNotificationEmail.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addProviderNotificationEmail(
    providerId: string,
    dto: CreateProviderNotificationEmailDto,
    currentUser: JwtPayload,
  ) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.prisma.providerNotificationEmail.create({
      data: { providerId, label: dto.label, email: dto.email, addedBy: currentUser.sub },
    });
  }

  async removeProviderNotificationEmail(providerId: string, emailId: string) {
    const row = await this.prisma.providerNotificationEmail.findUnique({ where: { id: emailId } });
    if (!row || row.providerId !== providerId) throw new NotFoundException('Notification email not found');
    await this.prisma.providerNotificationEmail.delete({ where: { id: emailId } });
    return { message: 'Notification email removed' };
  }
```

- [ ] **Step 4: Add the controller routes**

In `health-hub-africa-api/src/admin/admin.controller.ts`, add this import alongside the other DTO imports at the top (near `import { ImportProviderManuallyDto } from './dto/import-provider-manually.dto';`):

```ts
import { CreateNotificationRecipientDto, UpdateNotificationRecipientDto } from './dto/notification-recipient.dto';
import { CreateProviderNotificationEmailDto } from '../providers/dto/provider-notification-email.dto';
```

Then add these routes to the `AdminController` class (append near the end of the class, before its final closing `}`):

```ts
  // ── Notification Recipients ─────────────────────────────────────────────

  @Get('notification-recipients')
  @ApiOperation({ summary: 'List global appointment notification recipients' })
  listNotificationRecipients() {
    return this.adminService.listNotificationRecipients();
  }

  @Post('notification-recipients')
  @ApiOperation({ summary: 'Add a global appointment notification recipient' })
  createNotificationRecipient(
    @Body() dto: CreateNotificationRecipientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.createNotificationRecipient(dto, user);
  }

  @Patch('notification-recipients/:id')
  @ApiOperation({ summary: 'Update a global appointment notification recipient' })
  updateNotificationRecipient(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationRecipientDto,
  ) {
    return this.adminService.updateNotificationRecipient(id, dto);
  }

  @Delete('notification-recipients/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a global appointment notification recipient' })
  deleteNotificationRecipient(@Param('id') id: string) {
    return this.adminService.deleteNotificationRecipient(id);
  }

  // ── Provider Notification Emails (admin-managed) ─────────────────────────

  @Get('providers/:id/notification-emails')
  @ApiOperation({ summary: "List a provider's extra notification emails" })
  listProviderNotificationEmails(@Param('id') id: string) {
    return this.adminService.listProviderNotificationEmails(id);
  }

  @Post('providers/:id/notification-emails')
  @ApiOperation({ summary: 'Add an extra notification email for a provider' })
  addProviderNotificationEmail(
    @Param('id') id: string,
    @Body() dto: CreateProviderNotificationEmailDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.addProviderNotificationEmail(id, dto, user);
  }

  @Delete('providers/:id/notification-emails/:emailId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove a provider's extra notification email" })
  removeProviderNotificationEmail(
    @Param('id') id: string,
    @Param('emailId') emailId: string,
  ) {
    return this.adminService.removeProviderNotificationEmail(id, emailId);
  }
```

- [ ] **Step 5: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add health-hub-africa-api/src/admin/dto/notification-recipient.dto.ts health-hub-africa-api/src/providers/dto/provider-notification-email.dto.ts health-hub-africa-api/src/admin/admin.service.ts health-hub-africa-api/src/admin/admin.controller.ts
git commit -m "feat(admin): add global and per-provider notification recipient endpoints"
```

---

### Task 3: Provider self-service backend endpoints

**Files:**
- Modify: `health-hub-africa-api/src/providers/providers.service.ts`
- Modify: `health-hub-africa-api/src/providers/providers.controller.ts`

**Interfaces:**
- Consumes: `CreateProviderNotificationEmailDto` from Task 2 (`../providers/dto/provider-notification-email.dto`), `ProviderNotificationEmail` Prisma model from Task 1.
- Produces (consumed by Task 7, the provider-frontend Settings tab): `GET/POST /providers/me/notification-emails`, `DELETE /providers/me/notification-emails/:emailId`.

- [ ] **Step 1: Add the import**

In `health-hub-africa-api/src/providers/providers.service.ts`, add this import alongside the existing DTO imports at the top of the file:

```ts
import { CreateProviderNotificationEmailDto } from './dto/provider-notification-email.dto';
```

- [ ] **Step 2: Add the service methods**

Add these methods to the `ProvidersService` class (append near the end of the class, before its final closing `}`):

```ts
  // ── Notification Emails (self-service) ────────────────────────────────────

  async listMyNotificationEmails(currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    return this.prisma.providerNotificationEmail.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMyNotificationEmail(dto: CreateProviderNotificationEmailDto, currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    return this.prisma.providerNotificationEmail.create({
      data: { providerId, label: dto.label, email: dto.email, addedBy: currentUser.sub },
    });
  }

  async removeMyNotificationEmail(emailId: string, currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    const row = await this.prisma.providerNotificationEmail.findUnique({ where: { id: emailId } });
    if (!row || row.providerId !== providerId) throw new NotFoundException('Notification email not found');
    await this.prisma.providerNotificationEmail.delete({ where: { id: emailId } });
    return { message: 'Notification email removed' };
  }

  // Prefers the providerId already embedded in the JWT (set at login); falls
  // back to a DB lookup only for tokens issued before the provider row
  // existed. Never trusts a client-supplied provider id for /me routes.
  private async resolveOwnProviderId(currentUser: JwtPayload): Promise<string> {
    if (currentUser.providerId) return currentUser.providerId;
    const provider = await this.prisma.provider.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider.id;
  }
```

- [ ] **Step 3: Add the controller routes**

In `health-hub-africa-api/src/providers/providers.controller.ts`, add this import alongside the existing DTO imports:

```ts
import { CreateProviderNotificationEmailDto } from './dto/provider-notification-email.dto';
```

Then add these three routes directly after the existing `getMyProfile` route (find `@Get('me')` in the file — the new routes go right after that method's closing `}`, before `@Get(':id')`):

```ts
  @Get('me/notification-emails')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "List the authenticated provider's extra notification emails" })
  listMyNotificationEmails(@CurrentUser() user: JwtPayload) {
    return this.providersService.listMyNotificationEmails(user);
  }

  @Post('me/notification-emails')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Add an extra notification email for the authenticated provider' })
  addMyNotificationEmail(@Body() dto: CreateProviderNotificationEmailDto, @CurrentUser() user: JwtPayload) {
    return this.providersService.addMyNotificationEmail(dto, user);
  }

  @Delete('me/notification-emails/:emailId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "Remove one of the authenticated provider's extra notification emails" })
  removeMyNotificationEmail(@Param('emailId') emailId: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.removeMyNotificationEmail(emailId, user);
  }
```

- [ ] **Step 4: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add health-hub-africa-api/src/providers/providers.service.ts health-hub-africa-api/src/providers/providers.controller.ts
git commit -m "feat(providers): add self-service notification email endpoints"
```

---

### Task 4: Rewrite the ops fan-out (all 6 events, DB-driven recipients)

**Files:**
- Modify: `health-hub-africa-api/src/appointments/appointments.service.ts`
- Create: `health-hub-africa-api/src/appointments/appointments.service.spec.ts`

**Interfaces:**
- Consumes: `NotificationRecipient`/`ProviderNotificationEmail` Prisma models from Task 1.
- Produces: `AppointmentsService.resolveOpsRecipients(providerId: string | null): Promise<Array<{ email: string }>>` (private method, tested via `(service as any)` per this codebase's existing test convention in `notifications.service.spec.ts`).

- [ ] **Step 1: Write the failing unit test**

Create `health-hub-africa-api/src/appointments/appointments.service.spec.ts`:

```ts
import { AppointmentsService } from './appointments.service';

// resolveOpsRecipients only touches Prisma, so this constructs the service
// directly with a minimal mocked Prisma (matching notifications.service.spec.ts's
// pattern) rather than a full Nest TestingModule — openemrService, notifications,
// and reminderQueue are never exercised by this method.
function buildService(mockPrisma: any) {
  return new AppointmentsService(
    mockPrisma,
    {} as any,
    {} as any,
    {} as any,
  );
}

describe('AppointmentsService.resolveOpsRecipients', () => {
  it('returns global recipients when providerId is null (no provider query)', async () => {
    const providerFindMany = jest.fn();
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
      providerNotificationEmail: { findMany: providerFindMany },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients(null);

    expect(result).toEqual([{ email: 'ops@example.com' }]);
    expect(providerFindMany).not.toHaveBeenCalled();
  });

  it('merges global and provider-specific recipients', async () => {
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
      providerNotificationEmail: { findMany: jest.fn().mockResolvedValue([{ email: 'nurse@example.com' }]) },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients('provider-1');

    expect(result).toEqual([{ email: 'ops@example.com' }, { email: 'nurse@example.com' }]);
  });

  it('dedupes case-insensitively when the same address appears in both lists', async () => {
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'Ops@Example.com' }]) },
      providerNotificationEmail: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients('provider-1');

    expect(result).toEqual([{ email: 'Ops@Example.com' }]);
  });

  it('queries only active recipients', async () => {
    const globalFindMany = jest.fn().mockResolvedValue([]);
    const providerFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      notificationRecipient: { findMany: globalFindMany },
      providerNotificationEmail: { findMany: providerFindMany },
    };
    const service = buildService(prisma);

    await (service as any).resolveOpsRecipients('provider-1');

    expect(globalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(providerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 'provider-1', isActive: true } }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd health-hub-africa-api && npx jest src/appointments/appointments.service.spec.ts`
Expected: FAIL — `TypeError: (intermediate value).resolveOpsRecipients is not a function` (the method doesn't exist yet), and likely also a constructor-arity error since `AppointmentsService` currently takes 5 constructor args (including `config: ConfigService`, which this task removes) rather than the 4 the test passes. Both failures are expected at this stage.

- [ ] **Step 3: Remove the ConfigService dependency and the old ops block**

In `health-hub-africa-api/src/appointments/appointments.service.ts`, remove this line from the imports at the top of the file:

```ts
import { ConfigService } from '@nestjs/config';
```

Remove this constant (currently near the top of the file, right after `export const APPOINTMENT_REMINDERS_QUEUE = 'appointment-reminders';`):

```ts
const DEFAULT_APPOINTMENTS_OPS_EMAIL = 'appointments@healthhubafrica.com';
```

In the constructor, remove the `config` parameter:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @InjectQueue(APPOINTMENT_REMINDERS_QUEUE) private readonly reminderQueue: Queue,
  ) {}
```

becomes:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
    @InjectQueue(APPOINTMENT_REMINDERS_QUEUE) private readonly reminderQueue: Queue,
  ) {}
```

- [ ] **Step 4: Add `provider.id` to the appointment select**

Still in `appointments.service.ts`, inside `notifyAppointmentEvent()`, find the `provider: { select: {` block (it currently selects `firstName`, `lastName`, `title`, `user: { select: { email: true, id: true } }`). Add `id: true` as the first field:

```ts
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              user: { select: { email: true, id: true } },
            },
          },
```

- [ ] **Step 5: Replace the ops fan-out block**

Find this block (currently the "Ops mailbox fan-out" section, right after the provider-notification block and before the "Staff fan-out" comment):

```ts
      // Ops mailbox fan-out: appointments@healthhubafrica.com gets an email for
      // every create/cancel/reschedule, regardless of who or what triggered it
      // (patient self-service or admin/coordinator action) — this is the
      // operational record, distinct from the staff self-service alert below.
      const opsEvents: AppointmentEmailEvent[] = ['requested', 'cancelled', 'rescheduled'];
      if (opsEvents.includes(event)) {
        const opsEmail = this.config.get<string>(
          'APPOINTMENTS_OPS_EMAIL',
          DEFAULT_APPOINTMENTS_OPS_EMAIL,
        );
        const opsIntros: Record<string, string> = {
          requested: 'A new appointment was created.',
          cancelled: 'An appointment was cancelled.',
          rescheduled: 'An appointment was rescheduled.',
        };
        const opsSubjects: Record<string, string> = {
          requested: `Appointment created — ${appt.hhaRef}`,
          cancelled: `Appointment cancelled — ${appt.hhaRef}`,
          rescheduled: `Appointment rescheduled — ${appt.hhaRef}`,
        };
        const opsData: AppointmentNotificationData = {
          ...baseData,
          recipientName: 'Team',
          intro: opsIntros[event],
          outro: 'View the full appointment in the admin operations dashboard.',
          portalType: 'staff',
        };
        await this.notifications.sendOpsAppointmentEmail(opsEmail, opsSubjects[event], opsData);
      }
```

Replace it with:

```ts
      // Ops mailbox fan-out: every admin-configured recipient (global list +
      // this appointment's provider-specific extras) gets an email for every
      // lifecycle event — the operational record, distinct from the staff
      // self-service alert below. Recipients are DB-managed (see
      // NotificationRecipient / ProviderNotificationEmail), not hardcoded.
      const opsRecipients = await this.resolveOpsRecipients(appt.provider?.id ?? null);
      if (opsRecipients.length > 0) {
        const opsData: AppointmentNotificationData = {
          ...baseData,
          recipientName: 'Team',
          intro: t.intro,
          outro: 'View the full appointment in the admin operations dashboard.',
          portalType: 'staff',
        };
        for (const recipient of opsRecipients) {
          await this.notifications.sendOpsAppointmentEmail(recipient.email, t.subject, opsData);
        }
      }
```

- [ ] **Step 6: Add the `resolveOpsRecipients` method**

Add this private method to the `AppointmentsService` class, directly after `notifyAppointmentEvent()`'s closing `}` (which itself ends with the `catch` block that logs a failure — add this new method right after that whole method):

```ts
  // Merges the global recipient list with this appointment's provider-specific
  // extras, deduping case-insensitively (a provider's extra email could
  // coincidentally match a global one). providerId is null when an
  // appointment has no assigned provider yet — the provider query is skipped
  // entirely in that case rather than querying with an impossible filter.
  private async resolveOpsRecipients(providerId: string | null): Promise<Array<{ email: string }>> {
    const [globalRecipients, providerRecipients] = await Promise.all([
      this.prisma.notificationRecipient.findMany({
        where: { isActive: true },
        select: { email: true },
      }),
      providerId
        ? this.prisma.providerNotificationEmail.findMany({
            where: { providerId, isActive: true },
            select: { email: true },
          })
        : Promise.resolve([]),
    ]);

    const seen = new Set<string>();
    const result: Array<{ email: string }> = [];
    for (const recipient of [...globalRecipients, ...providerRecipients]) {
      const key = recipient.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(recipient);
    }
    return result;
  }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd health-hub-africa-api && npx jest src/appointments/appointments.service.spec.ts`
Expected: PASS — 4/4 tests green.

- [ ] **Step 8: Typecheck the whole project**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no errors. This also confirms no other file still references the removed `ConfigService` import or `DEFAULT_APPOINTMENTS_OPS_EMAIL` constant in `appointments.service.ts`.

- [ ] **Step 9: Remove the now-unused env var documentation**

In `health-hub-africa-api/.env.example`, remove this block (added in an earlier session, now obsolete):

```
# Ops mailbox notified on every appointment create/cancel/reschedule
APPOINTMENTS_OPS_EMAIL=appointments@healthhubafrica.com
```

- [ ] **Step 10: Commit**

```bash
git add health-hub-africa-api/src/appointments/appointments.service.ts health-hub-africa-api/src/appointments/appointments.service.spec.ts health-hub-africa-api/.env.example
git commit -m "feat(appointments): DB-driven ops recipients, fan out on all 6 lifecycle events"
```

---

### Task 5: Admin frontend — recipients page

**Files:**
- Modify: `health-hub-africa-admin/lib/api.ts`
- Create: `health-hub-africa-admin/app/(dashboard)/notification-recipients/page.tsx`
- Modify: `health-hub-africa-admin/app/(dashboard)/settings/tabs/SystemTab.tsx`
- Modify: `health-hub-africa-admin/components/layout/AdminSidebar.tsx`

**Interfaces:**
- Consumes: the 4 admin global-recipient endpoints from Task 2.
- Produces: `adminApi.notificationRecipients` client namespace (used only within this task's new page).

- [ ] **Step 1: Add the type and API client methods**

In `health-hub-africa-admin/lib/api.ts`, add this interface near the other admin interfaces (alongside `export interface FeatureFlag { ... }`):

```ts
export interface NotificationRecipient {
  id: string
  label: string
  email: string
  isActive: boolean
  createdAt: string
}
```

Then add a new namespace to the `adminApi` object, right after the existing `featureFlags: { ... },` block:

```ts
  notificationRecipients: {
    list: () => request<NotificationRecipient[]>('/admin/notification-recipients'),
    create: (label: string, email: string) =>
      request<NotificationRecipient>('/admin/notification-recipients', {
        method: 'POST',
        body: JSON.stringify({ label, email }),
      }),
    update: (id: string, patch: { label?: string; email?: string; isActive?: boolean }) =>
      request<NotificationRecipient>(`/admin/notification-recipients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      request<{ message: string }>(`/admin/notification-recipients/${id}`, { method: 'DELETE' }),
  },
```

- [ ] **Step 2: Create the recipients page**

Create `health-hub-africa-admin/app/(dashboard)/notification-recipients/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type NotificationRecipient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { RefreshCw, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationRecipientsPage() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.notificationRecipients.list()
      setRecipients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification recipients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !email.trim()) return
    setAdding(true)
    try {
      await adminApi.notificationRecipients.create(label.trim(), email.trim())
      setLabel('')
      setEmail('')
      toast.success('Recipient added')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add recipient')
    } finally {
      setAdding(false)
    }
  }, [label, email, load])

  const handleToggleActive = useCallback(async (r: NotificationRecipient) => {
    try {
      await adminApi.notificationRecipients.update(r.id, { isActive: !r.isActive })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update recipient')
    }
  }, [load])

  const handleRemove = useCallback(async (id: string) => {
    setRemovingId(id)
    try {
      await adminApi.notificationRecipients.remove(id)
      toast.success('Recipient removed')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove recipient')
    } finally {
      setRemovingId(null)
    }
  }, [load])

  return (
    <div className="max-w-[800px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Notification Recipients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Everyone in this list gets an email for every appointment created, confirmed, cancelled,
            rescheduled, completed, or missed — platform-wide.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
          {error}
        </div>
      )}

      <Card className="mb-5">
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
              Label
            </label>
            <FormInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Front Desk"
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="frontdesk@healthhubafrica.com"
            />
          </div>
          <Button type="submit" loading={adding} disabled={!label.trim() || !email.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </form>
      </Card>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Label', 'Email', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 180 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No recipients configured yet
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{r.label}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{r.email}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(r)}>
                        <Pill variant={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</Pill>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={removingId === r.id}
                        onClick={() => handleRemove(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Link from Settings → System tab**

In `health-hub-africa-admin/app/(dashboard)/settings/tabs/SystemTab.tsx`, add `Mail` to the existing lucide-react import (find `import { Flag, FileText, ArrowRight } from 'lucide-react'` and change it to):

```tsx
import { Flag, FileText, ArrowRight, Mail } from 'lucide-react'
```

Then add a new `LinkCard` inside the existing "Platform controls" `Card`'s grid, right after the `Audit logs` `LinkCard` (find the `<LinkCard href="/system/audit-logs" ... />` block and add this immediately after its closing `/>`):

```tsx
          <LinkCard
            href="/notification-recipients"
            icon={<Mail className="w-4 h-4" />}
            title="Notification recipients"
            description="Who gets emailed on every appointment event"
          />
```

- [ ] **Step 4: Add the sidebar entry**

In `health-hub-africa-admin/components/layout/AdminSidebar.tsx`, add `Mail` to the lucide-react import block (find the multi-line `import { ... } from 'lucide-react'` and add `Mail,` to the list, e.g. right after `Bell,`).

Then add a new nav item right after the existing Notifications entry (find `{ label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'super_admin'], group: 'System' },` and add immediately after it):

```tsx
  { label: 'Notification Recipients', href: '/notification-recipients', icon: Mail, roles: ['admin', 'super_admin'], group: 'System' },
```

- [ ] **Step 5: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add health-hub-africa-admin/lib/api.ts "health-hub-africa-admin/app/(dashboard)/notification-recipients/page.tsx" "health-hub-africa-admin/app/(dashboard)/settings/tabs/SystemTab.tsx" health-hub-africa-admin/components/layout/AdminSidebar.tsx
git commit -m "feat(admin): add Notification Recipients management page"
```

---

### Task 6: Admin frontend — per-provider extra emails

**Files:**
- Modify: `health-hub-africa-admin/lib/api.ts`
- Modify: `health-hub-africa-admin/app/(dashboard)/providers/page.tsx`

**Interfaces:**
- Consumes: the 3 admin per-provider endpoints from Task 2, `AdminProvider` type (already exists).
- Produces: `adminApi.providerNotificationEmails` client namespace.

- [ ] **Step 1: Add the type and API client methods**

In `health-hub-africa-admin/lib/api.ts`, add this interface near `NotificationRecipient` (added in Task 5):

```ts
export interface ProviderNotificationEmail {
  id: string
  providerId: string
  label: string | null
  email: string
  isActive: boolean
  createdAt: string
}
```

Add a new namespace to `adminApi`, right after the `providers: { ... },` block's closing brace:

```ts
  providerNotificationEmails: {
    list: (providerId: string) =>
      request<ProviderNotificationEmail[]>(`/admin/providers/${providerId}/notification-emails`),
    add: (providerId: string, label: string | undefined, email: string) =>
      request<ProviderNotificationEmail>(`/admin/providers/${providerId}/notification-emails`, {
        method: 'POST',
        body: JSON.stringify({ label, email }),
      }),
    remove: (providerId: string, emailId: string) =>
      request<{ message: string }>(`/admin/providers/${providerId}/notification-emails/${emailId}`, {
        method: 'DELETE',
      }),
  },
```

- [ ] **Step 2: Add the section to ProviderDetailDialog**

In `health-hub-africa-admin/app/(dashboard)/providers/page.tsx`, the current top-of-file imports (lines 1-14) are:

```tsx
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { adminApi, type AdminProvider, type AdminUser, type ImportProviderResult } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { FormInput } from '@/components/ui/FormInput'
import { RefreshCw, Search, Star, Users, Download, X, Copy, Info, Plus } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { formatDate } from '@/lib/utils'
import { buildProviderDisplayName } from '@/lib/providerName'
```

`useEffect`/`useState`/`useCallback`, `FormInput`, and `Plus` already exist — no changes needed to those. Make exactly two edits:

1. Add `type ProviderNotificationEmail` to the `@/lib/api` import:

```tsx
import { adminApi, type AdminProvider, type AdminUser, type ImportProviderResult, type ProviderNotificationEmail } from '@/lib/api'
```

2. Add `Mail` and `Trash2` to the `lucide-react` import:

```tsx
import { RefreshCw, Search, Star, Users, Download, X, Copy, Info, Plus, Mail, Trash2 } from 'lucide-react'
```

3. Add a new import line for `toast` (not currently imported in this file), placed right after the `'use client'` directive's blank line, before the `useEffect` import:

```tsx
import { toast } from 'sonner'
```

Then modify `ProviderDetailDialog` to add local state and fetch its provider's notification emails. Find the function signature:

```tsx
function ProviderDetailDialog({
  provider,
  onClose,
}: {
  provider: AdminProvider
  onClose: () => void
}) {
  return (
```

Change it to:

```tsx
function ProviderDetailDialog({
  provider,
  onClose,
}: {
  provider: AdminProvider
  onClose: () => void
}) {
  const [emails, setEmails] = useState<ProviderNotificationEmail[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [removingEmailId, setRemovingEmailId] = useState<string | null>(null)

  const loadEmails = useCallback(async () => {
    setLoadingEmails(true)
    try {
      const data = await adminApi.providerNotificationEmails.list(provider.id)
      setEmails(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load notification emails')
    } finally {
      setLoadingEmails(false)
    }
  }, [provider.id])

  useEffect(() => { loadEmails() }, [loadEmails])

  const handleAddEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setAddingEmail(true)
    try {
      await adminApi.providerNotificationEmails.add(provider.id, newLabel.trim() || undefined, newEmail.trim())
      setNewLabel('')
      setNewEmail('')
      await loadEmails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add notification email')
    } finally {
      setAddingEmail(false)
    }
  }, [provider.id, newLabel, newEmail, loadEmails])

  const handleRemoveEmail = useCallback(async (emailId: string) => {
    setRemovingEmailId(emailId)
    try {
      await adminApi.providerNotificationEmails.remove(provider.id, emailId)
      await loadEmails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove notification email')
    } finally {
      setRemovingEmailId(null)
    }
  }, [provider.id, loadEmails])

  return (
```

This requires `toast` from `sonner` — add `import { toast } from 'sonner'` to the file's top-level imports if not already present (check first; several other admin pages already import it, this file may not).

Finally, add the new section's JSX. Find the closing of the existing detail-fields block:

```tsx
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Provider ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{provider.id}</p>
          </div>
        </div>
```

Add a new section immediately after that `</div>` (still inside the dialog's `px-5 py-4 space-y-4` container, before its own closing `</div>`):

```tsx

        <div className="px-5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Extra Notification Emails
          </p>
          <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-faint)' }}>
            These addresses also get emailed for this provider&apos;s appointments, in addition to the global recipient list.
          </p>
          {loadingEmails ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {emails.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No extra emails added</p>
              ) : (
                emails.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
                        {e.label ? `${e.label} — ` : ''}{e.email}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={removingEmailId === e.id}
                      onClick={() => handleRemoveEmail(e.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
          <form onSubmit={handleAddEmail} className="flex items-end gap-2 flex-wrap">
            <FormInput
              value={newLabel}
              onChange={(ev) => setNewLabel(ev.target.value)}
              placeholder="Label (optional)"
              className="flex-1 min-w-[120px]"
            />
            <FormInput
              type="email"
              value={newEmail}
              onChange={(ev) => setNewEmail(ev.target.value)}
              placeholder="email@example.com"
              className="flex-1 min-w-[160px]"
            />
            <Button type="submit" size="sm" loading={addingEmail} disabled={!newEmail.trim()}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </form>
        </div>
```

Also add the two new imports this section needs: `import { FormInput } from '@/components/ui/FormInput'` and `import { adminApi, type AdminProvider, type ProviderNotificationEmail, ... } from '@/lib/api'` (add `ProviderNotificationEmail` to whatever the existing `@/lib/api` import line already destructures — check the file's current top-of-file import from `@/lib/api` first and extend it rather than adding a second import from the same module).

- [ ] **Step 3: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no errors. If duplicate-import errors appear (e.g. two `import ... from 'react'` lines), merge them into one per the notes in Step 2 above.

- [ ] **Step 4: Commit**

```bash
git add health-hub-africa-admin/lib/api.ts "health-hub-africa-admin/app/(dashboard)/providers/page.tsx"
git commit -m "feat(admin): manage per-provider extra notification emails from provider detail"
```

---

### Task 7: Provider self-service frontend

**Files:**
- Modify: `health-hub-africa-admin/lib/api.ts`
- Modify: `health-hub-africa-admin/app/(dashboard)/settings/tabs/NotificationsTab.tsx`

**Interfaces:**
- Consumes: the 3 provider self-service endpoints from Task 3, `ProviderNotificationEmail` type from Task 6.
- Produces: `providerSelf` top-level API client export (used only within this task).

- [ ] **Step 1: Add the API client namespace**

In `health-hub-africa-admin/lib/api.ts`, add a new top-level export (not nested inside `adminApi` — this is provider-role-only, hitting `/providers/me/*` not `/admin/*`). Add it right after the `adminApi` object's closing `}` (search for the line that closes `export const adminApi = { ... }` and add this immediately after):

```ts
export const providerSelf = {
  notificationEmails: {
    list: () => request<ProviderNotificationEmail[]>('/providers/me/notification-emails'),
    add: (label: string | undefined, email: string) =>
      request<ProviderNotificationEmail>('/providers/me/notification-emails', {
        method: 'POST',
        body: JSON.stringify({ label, email }),
      }),
    remove: (emailId: string) =>
      request<{ message: string }>(`/providers/me/notification-emails/${emailId}`, { method: 'DELETE' }),
  },
}
```

(This references `ProviderNotificationEmail`, defined in Task 6 — since Task 6 lands first in the plan's execution order, that type already exists in this file by the time this task runs. If executed out of order, add the `ProviderNotificationEmail` interface from Task 6, Step 1 here instead.)

- [ ] **Step 2: Add the "Additional Recipients" card**

In `health-hub-africa-admin/app/(dashboard)/settings/tabs/NotificationsTab.tsx`, update the imports at the top of the file:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { auth, providerSelf, type NotificationPrefs, type ProviderNotificationEmail } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/authStore'
import { Mail, Trash2, Plus } from 'lucide-react'
```

Add a new component at the end of the file (after the existing `Switch` function's closing `}`):

```tsx
function AdditionalRecipientsCard() {
  const [emails, setEmails] = useState<ProviderNotificationEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await providerSelf.notificationEmails.list()
      setEmails(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load notification emails')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    try {
      await providerSelf.notificationEmails.add(label.trim() || undefined, email.trim())
      setLabel('')
      setEmail('')
      toast.success('Recipient added')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add recipient')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (emailId: string) => {
    setRemovingId(emailId)
    try {
      await providerSelf.notificationEmails.remove(emailId)
      toast.success('Recipient removed')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove recipient')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Card>
      <CardTitle>Additional recipients</CardTitle>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Extra people who should also get an email when one of your appointments changes — e.g. your nurse or secretary.
      </p>
      {loading ? (
        <SkeletonBox className="h-14 rounded-xl" />
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {emails.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No additional recipients added</p>
          ) : (
            emails.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
                    {e.label ? `${e.label} — ` : ''}{e.email}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={removingId === e.id}
                  onClick={() => handleRemove(e.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap">
        <FormInput
          value={label}
          onChange={(ev) => setLabel(ev.target.value)}
          placeholder="Label (optional)"
          className="flex-1 min-w-[120px]"
        />
        <FormInput
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="email@example.com"
          className="flex-1 min-w-[160px]"
        />
        <Button type="submit" size="sm" loading={adding} disabled={!email.trim()}>
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </form>
    </Card>
  )
}
```

Then wire it into the main `NotificationsTab` render, gated to `provider` role only. Find the `NotificationsTab` function's return statement:

```tsx
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Channels</CardTitle>
```

Add the role check and card right before the closing `</div>` of the outer `flex flex-col gap-5` container — find:

```tsx
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          Save preferences
        </Button>
      </div>
    </div>
  )
}
```

Replace with:

```tsx
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          Save preferences
        </Button>
      </div>

      {isProvider && <AdditionalRecipientsCard />}
    </div>
  )
}
```

And add the `isProvider` check inside the `NotificationsTab` function body — find:

```tsx
export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
```

Change to:

```tsx
export function NotificationsTab() {
  const isProvider = useAuthStore((s) => s.user)?.role === 'provider'
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
```

- [ ] **Step 3: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add health-hub-africa-admin/lib/api.ts "health-hub-africa-admin/app/(dashboard)/settings/tabs/NotificationsTab.tsx"
git commit -m "feat(providers): self-service additional notification recipients in Settings"
```

---

## Self-Review Notes

**Spec coverage:** Global recipient CRUD → Task 2 + Task 5. Per-provider admin-managed emails → Task 2 + Task 6. Per-provider self-managed emails → Task 3 + Task 7. All-6-events fan-out + DB-driven recipients → Task 4. Migration seed for zero-regression cutover → Task 1. `APPOINTMENTS_OPS_EMAIL` removal → Task 4, Step 9. All in-scope spec items covered.

**Type consistency:** `resolveOpsRecipients(providerId: string | null): Promise<Array<{ email: string }>>` (Task 4) matches its test's expectations (Task 4, Step 1). `CreateProviderNotificationEmailDto` (Task 2, Step 2) is the single definition imported unchanged by Task 2's admin controller, Task 3's providers controller. `ProviderNotificationEmail` (frontend type, Task 6, Step 1) field names (`id`, `providerId`, `label`, `email`, `isActive`, `createdAt`) match the Prisma model from Task 1 exactly (Prisma's default JSON serialization of the model's own field names, no DTO reshaping on the backend for these simple list endpoints).

**No placeholders:** every step contains complete, runnable code — no TBDs.
