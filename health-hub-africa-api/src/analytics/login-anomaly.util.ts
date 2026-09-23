import { PrismaService } from '../prisma/prisma.service';

// login_events has no Prisma model (raw table — see the
// 20260901170000_add_marketing_attribution migration), so both the Security
// dashboard (AdminService.getSecurityAnalytics) and the cross-country login
// alert (AlertsService) need the same $queryRaw shape and the same anomaly
// definition. Shared here once rather than duplicated — the query and the
// detection logic are the parts worth keeping in exact agreement between a
// dashboard number and the alert that fires from the same data.

export interface LoginAttemptRow {
  userId: string;
  email: string;
  occurredAt: Date;
  countryCode: string | null;
  success: boolean;
}

export interface LoginLocationAnomaly {
  userId: string;
  email: string;
  fromCountry: string;
  toCountry: string;
  occurredAt: Date;
}

export async function fetchLoginAttemptsSince(prisma: PrismaService, since: Date): Promise<LoginAttemptRow[]> {
  return prisma.$queryRaw<LoginAttemptRow[]>`
    SELECT le."user_id" AS "userId", u."email", le."occurred_at" AS "occurredAt",
      le."country_code" AS "countryCode", le."success"
    FROM "login_events" le
    INNER JOIN "users" u ON u."id" = le."user_id"
    WHERE le."occurred_at" >= ${since}
      AND u."deleted_at" IS NULL
    ORDER BY le."user_id", le."occurred_at" ASC
  `;
}

// Pure — requires rows already ordered by (userId, occurredAt ASC), which
// fetchLoginAttemptsSince guarantees, so the previous row is the previous
// chronological login for the same user exactly when userId is unchanged
// (no separate grouping pass needed).
//
// Anomaly = a successful login from a different country than this same
// user's immediately preceding successful login. Failed attempts don't
// update the "previous country" — a wrong password from a new country isn't
// the account's new normal location, and would otherwise mask the very next
// successful login's anomaly.
export function detectLoginLocationAnomalies(attempts: LoginAttemptRow[]): LoginLocationAnomaly[] {
  const anomalies: LoginLocationAnomaly[] = [];
  let prevUserId: string | null = null;
  let prevCountry: string | null = null;

  for (const a of attempts) {
    if (!a.success) continue;

    const country = a.countryCode?.toUpperCase() ?? null;
    if (a.userId === prevUserId && prevCountry && country && country !== prevCountry) {
      anomalies.push({ userId: a.userId, email: a.email, fromCountry: prevCountry, toCountry: country, occurredAt: a.occurredAt });
    }
    prevUserId = a.userId;
    if (country) prevCountry = country;
  }

  return anomalies;
}
