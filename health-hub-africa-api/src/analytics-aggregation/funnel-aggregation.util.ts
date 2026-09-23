import { PrismaService } from '../prisma/prisma.service';

export interface FunnelEventRow {
  eventName: string;
  patientId: string | null;
  anonymousVisitorId: string | null;
  analyticsSessionId: string | null;
}

export interface FunnelDailyBucket {
  eventName: string;
  count: number;
  uniqueUsers: number;
  uniqueSessions: number;
}

/** Same production-event-filter / day-window convention every other
 * aggregation query in this file uses. Selects every distinct eventName
 * that occurred that day, not a fixed list — matches the live dashboards'
 * "group by whatever eventName values exist" philosophy (see
 * docs/ANALYTICS-PRIVACY-GOVERNANCE.md §4, "Adding a new event: no backend
 * change required"), so a newly-instrumented event gets aggregated
 * automatically, not only after someone remembers to add it here too. */
export async function fetchFunnelEventRowsForDay(prisma: PrismaService, start: Date, end: Date): Promise<FunnelEventRow[]> {
  return prisma.patientActivityEvent.findMany({
    where: { isTestEvent: false, occurredAt: { gte: start, lt: end } },
    select: { eventName: true, patientId: true, anonymousVisitorId: true, analyticsSessionId: true },
  });
}

/** Same unique-user counting convention every dashboard in AnalyticsService
 * uses (see docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md §2): a Set
 * keyed by patientId, else `anon:<anonymousVisitorId>` — one rule,
 * everywhere, so this aggregate's numbers mean the same thing as the live
 * funnel query's numbers for the same day. */
export function aggregateFunnelEventRows(rows: FunnelEventRow[]): FunnelDailyBucket[] {
  const byEvent = new Map<string, { count: number; users: Set<string>; sessions: Set<string> }>();

  for (const row of rows) {
    const bucket = byEvent.get(row.eventName) ?? { count: 0, users: new Set<string>(), sessions: new Set<string>() };
    bucket.count++;
    const userKey = row.patientId ?? (row.anonymousVisitorId ? `anon:${row.anonymousVisitorId}` : undefined);
    if (userKey) bucket.users.add(userKey);
    if (row.analyticsSessionId) bucket.sessions.add(row.analyticsSessionId);
    byEvent.set(row.eventName, bucket);
  }

  return Array.from(byEvent.entries()).map(([eventName, b]) => ({
    eventName,
    count: b.count,
    uniqueUsers: b.users.size,
    uniqueSessions: b.sessions.size,
  }));
}
