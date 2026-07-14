# Provider Name Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop provider titles ("Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Miss") from getting baked into `firstName`/`lastName` and duplicated when synced from OpenEMR or entered by an admin, by normalizing at every write path, centralizing display-name assembly, cleaning up existing bad rows once, and adding real validation where none currently exists.

**Architecture:** A single pure utility (`normalizeProviderName` / `buildProviderDisplayName`) in `health-hub-africa-api/src/common/utils/provider-name.util.ts` becomes the one place that understands title prefixes. Every provider-creating/updating code path (OpenEMR bulk import, manual admin import, provider self-service create/update) calls `normalizeProviderName` before writing to the DB. Every place across the API and both frontends that currently hand-concatenates `` `${title} ${firstName} ${lastName}` `` calls `buildProviderDisplayName` instead. A one-off `ts-node` script re-normalizes existing rows once. The `Provider.title` column already exists in Prisma — this is a data-hygiene and code-centralization fix, not a schema change.

**Tech Stack:** NestJS (API), Prisma/PostgreSQL, Next.js ×2 (patient portal + admin dashboard), Jest (API only — neither frontend has a unit-test runner; patient portal only has Playwright e2e, admin has none), ts-node (existing `prisma:seed` pattern).

---

## Key facts from research (don't re-derive these)

- `Provider.title` is already a dedicated column: `title String @default("Dr.")` in `health-hub-africa-api/prisma/schema.prisma` (Provider model, ~line 386-424). **No migration needed for storage** — the column already exists.
- OpenEMR sync enters the system at `OpenemrService.fetchPractitioners()` (`health-hub-africa-api/src/openemr/openemr.service.ts:252-288`), mapping FHIR `Practitioner.name.given[0]` → `firstName`, `.family` → `lastName`, `.prefix[0]` → `title` (defaults `'Dr.'` if empty). OpenEMR clinic staff sometimes type "Dr. Jane" straight into the given-name field, so `given[0]` can already contain an embedded title alongside a separately-set `title` — this is the concrete duplication source.
- Three write paths touch `firstName`/`lastName`/`title` with zero normalization today:
  1. `AdminService.importProvidersFromOpenemr()` — `health-hub-africa-api/src/admin/admin.service.ts:1568-1642` (create at 1621-1630)
  2. `AdminService.importProviderManually()` — `health-hub-africa-api/src/admin/admin.service.ts:1507-1566` (create at 1540-1550) — **its controller endpoint currently has zero request validation** because `admin.controller.ts:358-367` types `@Body() dto` as an inline object literal, not a class-validator class, so Nest's global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true` in `main.ts:98-105`) can't validate it at all.
  3. `ProvidersService.create()`/`update()` — `health-hub-africa-api/src/providers/providers.service.ts:101-118` and `:219-238` (title here comes from a `TITLE_BY_TYPE` map, `:37-44`, so less exposed, but `firstName`/`lastName` are still copied through raw).
- No existing tests for provider sync or name formatting anywhere in the repo. The only Nest spec file is `subscriptions.service.spec.ts`.
- Existing pure-function utility style to mirror: `health-hub-africa-api/src/common/utils/record-ref.util.ts` (plain exported function, no class, lives in `common/utils/`).
- No `scripts/` folder or Nest CLI-command pattern exists for one-off data fixes. The closest convention is `health-hub-africa-api/prisma/seed.ts`, run via `ts-node` (`"prisma:seed": "ts-node prisma/seed.ts"` in `package.json`).
- Neither frontend app (`health-hub-africa`, `health-hub-africa-admin`) has a unit-test runner, so frontend tasks in this plan rely on `tsc --noEmit` + manual verification, not new unit tests — matching what's already there rather than introducing new test infra speculatively.

---

### Task 1: Core name-normalization utility (TDD)

**Files:**
- Create: `health-hub-africa-api/src/common/utils/provider-name.util.ts`
- Create: `health-hub-africa-api/src/common/utils/provider-name.util.spec.ts`

**Step 1: Write the failing tests**

Create `health-hub-africa-api/src/common/utils/provider-name.util.spec.ts`:

```ts
import { normalizeProviderName, buildProviderDisplayName } from './provider-name.util';

describe('normalizeProviderName', () => {
  it('leaves a clean name and title unchanged', () => {
    expect(normalizeProviderName('Jane', 'Smith', 'Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('does not misread a name that merely starts with title-like letters', () => {
    // "Drew" starts with "Dr" but must never be read as a title prefix.
    expect(normalizeProviderName('Drew', 'Barrymore', 'Dr.')).toEqual({
      firstName: 'Drew',
      lastName: 'Barrymore',
      title: 'Dr.',
    });
  });

  it('strips a title embedded in firstName into the title field', () => {
    expect(normalizeProviderName('Dr. Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('strips a title embedded in lastName into the title field', () => {
    expect(normalizeProviderName('Jane', 'Dr. Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('prefers an explicit, already-clean title over one embedded in the name', () => {
    expect(normalizeProviderName('Prof. Jane', 'Smith', 'Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('collapses a duplicated title string ("Dr. Dr." -> "Dr.")', () => {
    expect(normalizeProviderName('Jane', 'Smith', 'Dr. Dr.')).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('collapses a title repeated inside firstName ("Dr. Dr. Jane")', () => {
    expect(normalizeProviderName('Dr. Dr. Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it('defaults to "Dr." when nothing is supplied and nothing is embedded', () => {
    expect(normalizeProviderName('Jane', 'Smith', undefined)).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      title: 'Dr.',
    });
  });

  it.each([
    ['Prof. Jane', 'Prof.'],
    ['Mr. Jane', 'Mr.'],
    ['Mrs. Jane', 'Mrs.'],
    ['Ms. Jane', 'Ms.'],
    ['Miss Jane', 'Miss'],
    ['Dr Jane', 'Dr.'], // no period, space-only separator
  ])('recognizes "%s" as title %s', (rawFirstName, expectedTitle) => {
    const result = normalizeProviderName(rawFirstName, 'Smith', undefined);
    expect(result.title).toBe(expectedTitle);
    expect(result.firstName).toBe('Jane');
  });
});

describe('buildProviderDisplayName', () => {
  it('joins title, firstName, and lastName with single spaces', () => {
    expect(buildProviderDisplayName({ title: 'Dr.', firstName: 'Jane', lastName: 'Smith' })).toBe(
      'Dr. Jane Smith',
    );
  });

  it('omits the title segment when title is missing', () => {
    expect(buildProviderDisplayName({ title: null, firstName: 'Jane', lastName: 'Smith' })).toBe(
      'Jane Smith',
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd health-hub-africa-api && npx jest src/common/utils/provider-name.util.spec.ts`
Expected: FAIL — `Cannot find module './provider-name.util'`

**Step 3: Write the implementation**

Create `health-hub-africa-api/src/common/utils/provider-name.util.ts`:

```ts
// Provider titles get typed straight into firstName/lastName by OpenEMR
// clinic staff (e.g. "Dr. Jane" in the given-name field) or by admins
// doing manual imports. This is the one place that understands how to
// pull a title back out and canonicalize it, so it never gets doubled
// (e.g. title="Dr." + firstName="Dr. Jane" -> "Dr. Dr. Jane").

const TITLE_ALIASES: Record<string, string> = {
  professor: 'Prof.',
  prof: 'Prof.',
  doctor: 'Dr.',
  dr: 'Dr.',
  mrs: 'Mrs.',
  ms: 'Ms.',
  miss: 'Miss',
  mr: 'Mr.',
};

const TITLE_TOKENS = Object.keys(TITLE_ALIASES).sort((a, b) => b.length - a.length);

// A recognised title at the very start of a string, followed by either a
// period (optionally + trailing whitespace) or at least one whitespace
// character. The mandatory separator is what stops "Drew" or "Mrsomething"
// from being misread as a title ("Dr"/"Mr") glued onto the rest of a name —
// without it, "Drew" would false-positive-match "Dr" + "ew".
const LEADING_TITLE_RE = new RegExp(
  `^(${TITLE_TOKENS.join('|')})(?:\\.\\s*|\\s+)(?=\\S)`,
  'i',
);

function canonicalizeBareToken(value: string): string | null {
  const key = value.toLowerCase().replace(/\.$/, '');
  return key in TITLE_ALIASES ? key : null;
}

/**
 * Repeatedly strips a leading title token from `value` — repeatedly so an
 * accidentally-doubled prefix ("Dr. Dr. Jane") collapses fully, not just
 * one layer. Returns the cleaned string and the last token stripped.
 */
function stripLeadingTitles(value: string): { rest: string; token: string | null } {
  let rest = (value ?? '').trim();
  let token: string | null = null;
  for (;;) {
    const match = rest.match(LEADING_TITLE_RE);
    if (!match) break;
    token = match[1].toLowerCase();
    rest = rest.slice(match[0].length).trim();
  }
  return { rest, token };
}

export interface NormalizedProviderName {
  firstName: string;
  lastName: string;
  title: string;
}

/**
 * Normalizes a provider's name/title triple: strips any professional
 * title embedded in firstName/lastName out into the dedicated title
 * field, and canonicalizes/deduplicates a supplied title so the same
 * prefix is never doubled up.
 *
 * Precedence when title info comes from more than one place: an
 * explicit, already-clean title (e.g. "Dr." from OpenEMR's FHIR prefix
 * field) wins over a title merely embedded in firstName/lastName — the
 * dedicated field is trusted over a name-field data-entry artifact.
 */
export function normalizeProviderName(
  rawFirstName: string,
  rawLastName: string,
  rawTitle?: string | null,
): NormalizedProviderName {
  const { rest: firstName, token: firstNameToken } = stripLeadingTitles(rawFirstName ?? '');
  const { rest: lastName, token: lastNameToken } = stripLeadingTitles(rawLastName ?? '');

  const trimmedRawTitle = (rawTitle ?? '').trim();
  const cleanedTitleToken = canonicalizeBareToken(trimmedRawTitle);
  const { token: doubledTitleToken } = stripLeadingTitles(trimmedRawTitle);

  const resolvedToken = cleanedTitleToken ?? doubledTitleToken ?? firstNameToken ?? lastNameToken;
  const title = resolvedToken ? TITLE_ALIASES[resolvedToken] : trimmedRawTitle || 'Dr.';

  return { firstName, lastName, title };
}

/**
 * Assembles "Title FirstName LastName" from the dedicated fields. Always
 * call this instead of hand-concatenating a provider's title into a
 * display string — every ad hoc `${title} ${firstName} ${lastName}` in
 * this codebase is exactly the pattern that let duplicate titles hide.
 */
export function buildProviderDisplayName(provider: {
  title?: string | null;
  firstName: string;
  lastName: string;
}): string {
  return [provider.title?.trim(), provider.firstName?.trim(), provider.lastName?.trim()]
    .filter(Boolean)
    .join(' ');
}
```

**Step 4: Run tests to verify they pass**

Run: `cd health-hub-africa-api && npx jest src/common/utils/provider-name.util.spec.ts`
Expected: PASS — all 14 tests green.

**Step 5: Commit**

```bash
git add health-hub-africa-api/src/common/utils/provider-name.util.ts health-hub-africa-api/src/common/utils/provider-name.util.spec.ts
git commit -m "feat(providers): add provider name/title normalization utility"
```

---

### Task 2: Wire normalization into the OpenEMR bulk import

**Files:**
- Modify: `health-hub-africa-api/src/admin/admin.service.ts:1568-1642` (`importProvidersFromOpenemr`)

**Step 1: Add the import**

At the top of `admin.service.ts`, alongside the other relative imports, add:

```ts
import { normalizeProviderName } from '../common/utils/provider-name.util';
```

**Step 2: Normalize before the create call**

In `importProvidersFromOpenemr()`, the loop body currently does (lines 1621-1630):

```ts
          await tx.provider.create({
            data: {
              userId: user.id,
              firstName: p.firstName,
              lastName: p.lastName,
              title: p.title,
              specialty: p.specialty,
              openemrProviderUuid: p.openemrId,
            },
          });
```

Change to:

```ts
          const normalized = normalizeProviderName(p.firstName, p.lastName, p.title);

          await tx.provider.create({
            data: {
              userId: user.id,
              firstName: normalized.firstName,
              lastName: normalized.lastName,
              title: normalized.title,
              specialty: p.specialty,
              openemrProviderUuid: p.openemrId,
            },
          });
```

Also update the two `results.push(...)` calls in the same loop (lines ~1596, 1607, 1633) that currently record `firstName: p.firstName, lastName: p.lastName` for the admin-facing import summary — leave the `skipped` pushes (1596, 1607) as-is since those happen before normalization even runs (they're pre-creation early-outs), but change the `imported` push at line 1633 to use the normalized values so the summary the admin sees matches what was actually stored:

```ts
          results.push({ email, tempPassword, firstName: normalized.firstName, lastName: normalized.lastName, status: 'imported' });
```

**Step 3: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors.

**Step 4: Commit**

```bash
git add health-hub-africa-api/src/admin/admin.service.ts
git commit -m "fix(admin): normalize provider names during OpenEMR bulk import"
```

---

### Task 3: Add real validation + wire normalization into manual provider import

This closes the validation gap found in research: `POST /admin/providers/manual-import` currently accepts an untyped inline object with zero `class-validator` checks.

**Files:**
- Create: `health-hub-africa-api/src/admin/dto/import-provider-manually.dto.ts`
- Modify: `health-hub-africa-api/src/admin/admin.controller.ts:348-370`
- Modify: `health-hub-africa-api/src/admin/admin.service.ts:1507-1566` (`importProviderManually`)

**Step 1: Create the DTO class**

Create `health-hub-africa-api/src/admin/dto/import-provider-manually.dto.ts`:

```ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportProviderManuallyDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  specialty: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  openemrProviderUuid?: string;
}
```

**Step 2: Update the controller to use the class**

In `health-hub-africa-api/src/admin/admin.controller.ts`, add the import near the other DTO imports:

```ts
import { ImportProviderManuallyDto } from './dto/import-provider-manually.dto';
```

Replace the inline-typed body (lines 358-367):

```ts
  importProviderManually(
    @Body() dto: {
      email: string;
      firstName: string;
      lastName: string;
      title: string;
      specialty: string;
      licenseNumber?: string;
      openemrProviderUuid?: string;
    },
  ) {
    return this.adminService.importProviderManually(dto);
  }
```

with:

```ts
  importProviderManually(@Body() dto: ImportProviderManuallyDto) {
    return this.adminService.importProviderManually(dto);
  }
```

**Step 3: Update the service to accept the DTO and normalize**

In `health-hub-africa-api/src/admin/admin.service.ts`, add the import:

```ts
import { ImportProviderManuallyDto } from './dto/import-provider-manually.dto';
```

Change the method signature and body (currently lines 1507-1516):

```ts
  async importProviderManually(dto: {
    email: string;
    firstName: string;
    lastName: string;
    title: string;
    specialty: string;
    licenseNumber?: string;
    openemrProviderUuid?: string;
  }) {
    const { email, firstName, lastName, title, specialty, licenseNumber, openemrProviderUuid } = dto;
```

to:

```ts
  async importProviderManually(dto: ImportProviderManuallyDto) {
    const { email, specialty, licenseNumber, openemrProviderUuid } = dto;
    const { firstName, lastName, title } = normalizeProviderName(dto.firstName, dto.lastName, dto.title);
```

(The `normalizeProviderName` import was already added to this file in Task 2 — reuse it.)

The rest of the method body (the transaction, the `tx.provider.create({...firstName, lastName, title, specialty...})` call, and the return object) is unchanged — it already destructures `firstName`/`lastName`/`title` from local variables, which now hold the normalized values instead of the raw ones.

**Step 4: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors.

**Step 5: Commit**

```bash
git add health-hub-africa-api/src/admin/dto/import-provider-manually.dto.ts health-hub-africa-api/src/admin/admin.controller.ts health-hub-africa-api/src/admin/admin.service.ts
git commit -m "fix(admin): validate and normalize manual provider import"
```

---

### Task 4: Wire normalization into ProvidersService create/update

**Files:**
- Modify: `health-hub-africa-api/src/providers/providers.service.ts:101-118` (`create`) and `:219-238` (`update`)

**Step 1: Add the import**

At the top of `providers.service.ts`:

```ts
import { normalizeProviderName } from '../common/utils/provider-name.util';
```

**Step 2: Normalize in `create()`**

Current (lines 101-118):

```ts
      return tx.provider.create({
        data: {
          userId: targetUser.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          title: TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
          specialty: dto.specialization ?? dto.providerType,
          licenseNumber: dto.licenseNumber,
          yearsExperience: dto.yearsOfExperience ?? 0,
          bio: buildBio(dto),
          isAvailable: dto.acceptsVirtualConsults ?? true,
          profilePhotoUrl: dto.profilePhotoUrl,
        },
        select: this.safeSelect(),
      });
```

Change to (normalize the raw names first, and let the normalizer's title only apply if `TITLE_BY_TYPE` didn't already give an explicit one — pass the type-derived title in as the "explicit" title so it wins over anything accidentally embedded in the name, consistent with Task 1's precedence rule):

```ts
      const normalized = normalizeProviderName(
        dto.firstName,
        dto.lastName,
        TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
      );

      return tx.provider.create({
        data: {
          userId: targetUser.id,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          title: normalized.title,
          specialty: dto.specialization ?? dto.providerType,
          licenseNumber: dto.licenseNumber,
          yearsExperience: dto.yearsOfExperience ?? 0,
          bio: buildBio(dto),
          isAvailable: dto.acceptsVirtualConsults ?? true,
          profilePhotoUrl: dto.profilePhotoUrl,
        },
        select: this.safeSelect(),
      });
```

**Step 3: Normalize in `update()`**

Current (lines 219-236, relevant part):

```ts
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.providerType !== undefined && {
          title: TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
        }),
        ...(dto.specialization !== undefined && { specialty: dto.specialization }),
        ...(dto.licenseNumber !== undefined && { licenseNumber: dto.licenseNumber }),
        ...(dto.yearsOfExperience !== undefined && { yearsExperience: dto.yearsOfExperience }),
        ...(bio !== undefined && { bio }),
        ...(dto.acceptsVirtualConsults !== undefined && {
          isAvailable: dto.acceptsVirtualConsults,
        }),
        ...(dto.profilePhotoUrl !== undefined && { profilePhotoUrl: dto.profilePhotoUrl }),
        ...(isCredentialChange && { verifiedAt: null, verifiedBy: null }),
      },
```

`firstName`/`lastName`/`title` can each be updated independently (any subset may be `undefined`), so normalization needs the *current* stored values as fallback for whichever field isn't part of this particular update. Add this just before the `prisma.provider.update` call (after the existing `isCredentialChange` computation, using the `provider` record already fetched at the top of the method — extend that earlier `findUnique` select to include `firstName`, `lastName`, `title` so they're available here):

First, update the earlier fetch (near line 199-202):

```ts
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
```

to:

```ts
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { id: true, userId: true, firstName: true, lastName: true, title: true },
    });
```

Then, immediately before the `prisma.provider.update` call, add:

```ts
    const normalized = normalizeProviderName(
      dto.firstName ?? provider.firstName,
      dto.lastName ?? provider.lastName,
      dto.providerType !== undefined ? (TITLE_BY_TYPE[dto.providerType] ?? 'Dr.') : provider.title,
    );
```

And change the `data` block's first three conditional spreads to:

```ts
        ...(dto.firstName !== undefined && { firstName: normalized.firstName }),
        ...(dto.lastName !== undefined && { lastName: normalized.lastName }),
        ...((dto.firstName !== undefined || dto.lastName !== undefined || dto.providerType !== undefined) && {
          title: normalized.title,
        }),
```

(This also fixes a pre-existing gap: previously, editing just `firstName` with an embedded title and no `providerType` change wouldn't touch `title` at all — now any name-affecting edit re-normalizes.)

**Step 4: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors.

**Step 5: Commit**

```bash
git add health-hub-africa-api/src/providers/providers.service.ts
git commit -m "fix(providers): normalize names on provider create/update"
```

---

### Task 5: Replace API-side display-name concatenation with buildProviderDisplayName

**Files:**
- Modify: `health-hub-africa-api/src/telecare/telecare.service.ts:79`
- Modify: `health-hub-africa-api/src/appointments/appointments.service.ts:573-575`
- Modify: `health-hub-africa-api/src/appointments/appointment-reminders.processor.ts:75-77`
- Modify: `health-hub-africa-api/src/admin/admin.service.ts:770`, `:830`, `:1755`

**Step 1: telecare.service.ts**

Add the import at the top:

```ts
import { buildProviderDisplayName } from '../common/utils/provider-name.util';
```

Line 79, current:

```ts
      participantName = `${session.provider.title} ${session.provider.firstName} ${session.provider.lastName}`;
```

Change to:

```ts
      participantName = buildProviderDisplayName(session.provider);
```

**Step 2: appointments.service.ts**

Add the import at the top:

```ts
import { buildProviderDisplayName } from '../common/utils/provider-name.util';
```

Lines 573-575, current:

```ts
    const providerName = appt.provider ? `${appt.provider.title} ${appt.provider.firstName} ${appt.provider.lastName}` : null;
```

Change to:

```ts
    const providerName = appt.provider ? buildProviderDisplayName(appt.provider) : null;
```

**Step 3: appointment-reminders.processor.ts**

Add the import at the top:

```ts
import { buildProviderDisplayName } from '../common/utils/provider-name.util';
```

Lines 75-77, same pattern as Step 2 — replace the `${...} ${...} ${...}` ternary with `appt.provider ? buildProviderDisplayName(appt.provider) : null` (adjust the exact local variable name to match what's already there at that call site).

**Step 4: admin.service.ts (3 sites)**

`buildProviderDisplayName` import already present from Task 2.

Line 770 (`listAppointments`), current:

```ts
        r.provider ? `${r.provider.title ?? ''} ${r.provider.firstName} ${r.provider.lastName}`.trim() : undefined
```

Change to:

```ts
        r.provider ? buildProviderDisplayName(r.provider) : undefined
```

Line 830 (`listTelecareSessions`) — same replacement pattern.

Line 1755 (`getClinicalQueue`), current:

```ts
        `${r.provider.firstName} ${r.provider.lastName}`
```

This one currently omits `title` entirely (a pre-existing inconsistency found in research). Change to:

```ts
        buildProviderDisplayName(r.provider)
```

so the clinical queue now shows the title too, consistent with every other admin view.

**Step 5: Typecheck**

Run: `cd health-hub-africa-api && npx tsc --noEmit --pretty false`
Expected: no new errors. If any call site's `provider` object shape (from a Prisma `select`) doesn't include `title`, add `title: true` to that select alongside the existing `firstName`/`lastName`.

**Step 6: Run the API test suite**

Run: `cd health-hub-africa-api && npm test`
Expected: PASS (no existing tests reference these call sites, so this just confirms nothing else broke).

**Step 7: Commit**

```bash
git add health-hub-africa-api/src/telecare/telecare.service.ts health-hub-africa-api/src/appointments/appointments.service.ts health-hub-africa-api/src/appointments/appointment-reminders.processor.ts health-hub-africa-api/src/admin/admin.service.ts
git commit -m "refactor(providers): build display names via buildProviderDisplayName instead of string concatenation"
```

---

### Task 6: Patient portal — shared display-name util + replace concatenation sites

**Files:**
- Create: `health-hub-africa/lib/providerName.ts`
- Modify: `health-hub-africa/components/screens/PublicShareScreen.tsx:41-43`
- Modify: `health-hub-africa/components/screens/RecordsScreen.tsx:152-154`
- Modify: `health-hub-africa/components/screens/AppointmentsScreen.tsx:206-208`, `:317`
- Modify: `health-hub-africa/components/screens/DashboardScreen.tsx:454`
- Modify: `health-hub-africa/components/panels/DashboardPanel.tsx:215`, `:220`, `:267`
- Modify: `health-hub-africa/components/panels/AppointmentsPanel.tsx:61`

No normalization logic is needed client-side (the API now always returns clean data) — just the display-name assembly, so patients/providers never see the pattern that let this bug hide in the first place.

**Step 1: Create the util**

Create `health-hub-africa/lib/providerName.ts`:

```ts
/** Assembles "Title FirstName LastName" from the dedicated fields. Always
 * use this instead of hand-concatenating a provider's title into a
 * display string. */
export function buildProviderDisplayName(provider: {
  title?: string | null
  firstName: string
  lastName: string
}): string {
  return [provider.title?.trim(), provider.firstName?.trim(), provider.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
}
```

**Step 2: PublicShareScreen.tsx**

Add the import: `import { buildProviderDisplayName } from '@/lib/providerName'`

Current (lines 41-43):

```tsx
  const providerName = record.provider
    ? `${record.provider.title} ${record.provider.firstName} ${record.provider.lastName}`
    : null
```

Change to:

```tsx
  const providerName = record.provider ? buildProviderDisplayName(record.provider) : null
```

**Step 3: RecordsScreen.tsx**

Add the same import. Current (lines 152-154) — note this one previously omitted `firstName`, a pre-existing inconsistency:

```tsx
              const providerName = record.provider
                ? `${record.provider.title} ${record.provider.lastName}`
                : null
```

Change to:

```tsx
              const providerName = record.provider ? buildProviderDisplayName(record.provider) : null
```

**Step 4: AppointmentsScreen.tsx**

Add the same import. Line 206-208 (same firstName-omitting inconsistency as Step 3) — replace with `buildProviderDisplayName(appt.provider)` following the same pattern. Line 317, current:

```tsx
{p.title ? `${p.title} ` : ''}{p.firstName} {p.lastName}
```

Change to:

```tsx
{buildProviderDisplayName(p)}
```

**Step 5: DashboardScreen.tsx**

Add the same import. Line 454, current:

```tsx
{nextAppt.provider.title} {nextAppt.provider.firstName} {nextAppt.provider.lastName}
```

Change to:

```tsx
{buildProviderDisplayName(nextAppt.provider)}
```

(Lines 447/450, which use only `firstName`/`lastName` for an avatar seed/alt text, are unaffected — no title involved there, leave as-is.)

**Step 6: DashboardPanel.tsx**

Add the same import. Three sites (lines 215, 220, 267), e.g. line 220:

```tsx
`${selectedProvider.title ? selectedProvider.title + ' ' : ''}${selectedProvider.firstName} ${selectedProvider.lastName}`
```

Change each to `buildProviderDisplayName(selectedProvider)` (or the appropriate local variable name at each site).

**Step 7: AppointmentsPanel.tsx**

Add the same import. Line 61, current:

```tsx
{nextAppt.provider.title} {nextAppt.provider.firstName} {nextAppt.provider.lastName}
```

Change to:

```tsx
{buildProviderDisplayName(nextAppt.provider)}
```

**Step 8: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no new errors.

**Step 9: Commit**

```bash
git add health-hub-africa/lib/providerName.ts health-hub-africa/components/screens/PublicShareScreen.tsx health-hub-africa/components/screens/RecordsScreen.tsx health-hub-africa/components/screens/AppointmentsScreen.tsx health-hub-africa/components/screens/DashboardScreen.tsx health-hub-africa/components/panels/DashboardPanel.tsx health-hub-africa/components/panels/AppointmentsPanel.tsx
git commit -m "refactor(providers): build display names dynamically in patient portal"
```

---

### Task 7: Admin dashboard — shared display-name util + replace concatenation sites

**Files:**
- Create: `health-hub-africa-admin/lib/providerName.ts`
- Modify: `health-hub-africa-admin/app/(dashboard)/providers/page.tsx:38`, `:375`
- Modify: `health-hub-africa-admin/app/(dashboard)/scheduling/page.tsx:93`, `:226`
- Modify: `health-hub-africa-admin/app/(dashboard)/provider/telecare/components/TransferModal.tsx:140`
- Modify: `health-hub-africa-admin/app/(dashboard)/operations/appointments/page.tsx:442`

**Step 1: Create the util**

Create `health-hub-africa-admin/lib/providerName.ts` with the identical content as `health-hub-africa/lib/providerName.ts` in Task 6, Step 1 (same function, no shared package between the two Next.js apps, so it's duplicated by necessity — matches the existing lack of code-sharing between `health-hub-africa` and `health-hub-africa-admin`).

**Step 2: providers/page.tsx**

Add the import: `import { buildProviderDisplayName } from '@/lib/providerName'`

Lines 38 and 375, both currently:

```tsx
{provider.title} {provider.firstName} {provider.lastName}
```
```tsx
{prov.title} {prov.firstName} {prov.lastName}
```

Change each to `{buildProviderDisplayName(provider)}` / `{buildProviderDisplayName(prov)}` respectively. (Lines 32/369, avatar `name` props using only firstName+lastName, are unaffected.)

**Step 3: scheduling/page.tsx**

Add the same import. Lines 93 and 226, currently:

```tsx
{p.title} {p.firstName} {p.lastName}
```
```tsx
{group.provider.title} {group.provider.firstName} {group.provider.lastName}
```

Change to `{buildProviderDisplayName(p)}` and `{buildProviderDisplayName(group.provider)}` respectively.

**Step 4: TransferModal.tsx**

Add the same import. Line 140, currently:

```tsx
{p.title} {p.firstName} {p.lastName}
```

Change to `{buildProviderDisplayName(p)}`.

**Step 5: operations/appointments/page.tsx**

Add the same import. Line 442, currently:

```tsx
{p.title} {p.firstName} {p.lastName}
```

Change to `{buildProviderDisplayName(p)}`.

**Step 6: Typecheck**

Run: `cd health-hub-africa-admin && npx tsc --noEmit --pretty false`
Expected: no new errors.

**Step 7: Commit**

```bash
git add health-hub-africa-admin/lib/providerName.ts "health-hub-africa-admin/app/(dashboard)/providers/page.tsx" "health-hub-africa-admin/app/(dashboard)/scheduling/page.tsx" "health-hub-africa-admin/app/(dashboard)/provider/telecare/components/TransferModal.tsx" "health-hub-africa-admin/app/(dashboard)/operations/appointments/page.tsx"
git commit -m "refactor(providers): build display names dynamically in admin dashboard"
```

---

### Task 8: One-time cleanup script for existing provider rows

**Files:**
- Create: `health-hub-africa-api/scripts/cleanup-provider-titles.ts`
- Modify: `health-hub-africa-api/package.json` (add npm script)

This is a standalone `ts-node` script (mirroring the existing `prisma/seed.ts` convention — plain `PrismaClient`, no Nest bootstrapping) rather than a raw SQL migration, so it reuses the exact same `normalizeProviderName` logic already covered by Task 1's tests — no risk of a hand-written SQL regex drifting out of sync with the real detection logic.

**Step 1: Write the script**

Create `health-hub-africa-api/scripts/cleanup-provider-titles.ts`:

```ts
// One-time cleanup: re-normalizes every existing Provider row through the
// same logic new writes go through (see src/common/utils/provider-name.util.ts),
// so any title baked into firstName/lastName before that normalization
// existed gets pulled out, and any doubled title ("Dr. Dr.") collapses.
//
// Safe to re-run: only rows whose normalized values differ from what's
// stored get updated, and normalizing already-clean data is a no-op.
//
// Usage:
//   ts-node scripts/cleanup-provider-titles.ts            # dry run, prints planned changes
//   ts-node scripts/cleanup-provider-titles.ts --apply     # actually writes the changes

import { PrismaClient } from '@prisma/client';
import { normalizeProviderName } from '../src/common/utils/provider-name.util';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'Running in APPLY mode — rows will be updated.' : 'Running in DRY-RUN mode — no writes will happen. Pass --apply to write.');

  const providers = await prisma.provider.findMany({
    select: { id: true, firstName: true, lastName: true, title: true },
  });

  let changed = 0;

  for (const provider of providers) {
    const normalized = normalizeProviderName(provider.firstName, provider.lastName, provider.title);
    const isDifferent =
      normalized.firstName !== provider.firstName ||
      normalized.lastName !== provider.lastName ||
      normalized.title !== provider.title;

    if (!isDifferent) continue;

    changed++;
    console.log(
      `Provider ${provider.id}: ` +
        `"${provider.title}" "${provider.firstName}" "${provider.lastName}" -> ` +
        `"${normalized.title}" "${normalized.firstName}" "${normalized.lastName}"`,
    );

    if (apply) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          title: normalized.title,
        },
      });
    }
  }

  console.log(`\n${changed} of ${providers.length} provider row(s) ${apply ? 'updated' : 'would be updated'}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 2: Add the npm script**

In `health-hub-africa-api/package.json`, alongside the existing `prisma:seed` entry:

```json
    "cleanup:provider-titles": "ts-node scripts/cleanup-provider-titles.ts"
```

**Step 3: Dry-run against your local/dev database**

Run: `cd health-hub-africa-api && npm run cleanup:provider-titles`
Expected: prints a `"..." -> "..."` line for every row that would change, then a summary count. Review the output — every printed change should look like a legitimate title extraction/dedup, not an unexpected mangling of a normal name.

**Step 4: Apply**

Once the dry-run output looks correct (do this against a database backup or staging first if this is ever run against production data):

Run: `cd health-hub-africa-api && npm run cleanup:provider-titles -- --apply`
Expected: same output as the dry run, but rows are now actually updated; final line confirms the count written.

**Step 5: Commit**

```bash
git add health-hub-africa-api/scripts/cleanup-provider-titles.ts health-hub-africa-api/package.json
git commit -m "chore(providers): add one-time cleanup script for duplicated provider titles"
```

---

### Task 9: Final verification

**Step 1: Run the full API test suite**

Run: `cd health-hub-africa-api && npm test`
Expected: PASS, including the 14 new tests from Task 1.

**Step 2: Typecheck all three apps**

Run:
```bash
cd health-hub-africa-api && npx tsc --noEmit --pretty false
cd ../health-hub-africa && npx tsc --noEmit --pretty false
cd ../health-hub-africa-admin && npx tsc --noEmit --pretty false
```
Expected: no errors in any of the three.

**Step 3: Manual smoke test checklist**

Since there's no existing test harness for provider display screens (patient portal only has Playwright e2e for an unrelated flow; admin has no tests at all), verify by hand:

- [ ] In a dev/staging environment, create a provider via `POST /admin/providers/manual-import` with `firstName: "Dr. Jane"`, `lastName: "Smith"`, `title: "Dr."` — confirm the stored row has `firstName: "Jane"`, not `"Dr. Jane"`.
- [ ] Try the same endpoint with a missing/blank `firstName` — confirm it now returns a 400 validation error (previously this endpoint accepted anything).
- [ ] View that provider's name in the patient portal (Appointments screen, Records screen, Dashboard) and in the admin dashboard (Providers page, Scheduling page) — confirm it reads "Dr. Jane Smith" everywhere, never "Dr. Dr. Jane Smith" or "Jane Smith" (missing title).
- [ ] Run `npm run cleanup:provider-titles` (dry run) against a copy of production data if available, and review the printed diffs before ever running `--apply` against real data.

**Step 4: Nothing to commit in this task** — it's verification only.
