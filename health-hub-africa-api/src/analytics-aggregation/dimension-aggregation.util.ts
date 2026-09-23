import { PrismaService } from '../prisma/prisma.service';

export interface DimensionEventRow {
  eventName: string;
  pagePath: string | null;
  elementId: string | null;
  featureArea: string | null;
  countryCode: string | null;
  patientId: string | null;
  anonymousVisitorId: string | null;
  analyticsSessionId: string | null;
}

export interface DimensionDailyBucket {
  dimension: string;
  dimensionValue: string;
  count: number;
  uniqueUsers: number;
  uniqueSessions: number;
}

export async function fetchDimensionEventRowsForDay(prisma: PrismaService, start: Date, end: Date): Promise<DimensionEventRow[]> {
  return prisma.patientActivityEvent.findMany({
    where: { isTestEvent: false, occurredAt: { gte: start, lt: end } },
    select: {
      eventName: true,
      pagePath: true,
      elementId: true,
      featureArea: true,
      countryCode: true,
      patientId: true,
      anonymousVisitorId: true,
      analyticsSessionId: true,
    },
  });
}

interface DimensionSpec {
  name: string;
  /** Which column on the row this dimension groups by. */
  valueOf: (row: DimensionEventRow) => string | null;
  /** Optional — scope this dimension to a single eventName (page/click are
   * meaningless outside page_view/ui_click respectively); feature/country
   * are left unscoped since usage/geography cross every event type. */
  eventName?: string;
}

// Spec §25's remaining 3 aggregate categories (funnel already has its own
// table — see FunnelEventDaily/funnel-aggregation.util.ts). One generic
// bucketing pass over the day's rows instead of 3 near-duplicate
// aggregation functions — same unique-user/session counting convention as
// every other aggregate and live dashboard in this codebase.
const DIMENSION_SPECS: DimensionSpec[] = [
  { name: 'page', valueOf: (r) => r.pagePath, eventName: 'page_view' },
  { name: 'element', valueOf: (r) => r.elementId, eventName: 'ui_click' },
  { name: 'feature_area', valueOf: (r) => r.featureArea },
  { name: 'country', valueOf: (r) => r.countryCode },
];

export function aggregateDimensionEventRows(rows: DimensionEventRow[]): DimensionDailyBucket[] {
  // Nested by dimension name, then by value — avoids reconstructing a
  // composite key from a joined string, which would be ambiguous if a
  // dimension value ever contained the separator (e.g. a pagePath with a
  // query string).
  const buckets = new Map<string, Map<string, { count: number; users: Set<string>; sessions: Set<string> }>>();

  for (const row of rows) {
    for (const spec of DIMENSION_SPECS) {
      if (spec.eventName && row.eventName !== spec.eventName) continue;
      const value = spec.valueOf(row);
      if (!value) continue;

      const byValue = buckets.get(spec.name) ?? new Map<string, { count: number; users: Set<string>; sessions: Set<string> }>();
      const bucket = byValue.get(value) ?? { count: 0, users: new Set<string>(), sessions: new Set<string>() };
      bucket.count++;
      const userKey = row.patientId ?? (row.anonymousVisitorId ? `anon:${row.anonymousVisitorId}` : undefined);
      if (userKey) bucket.users.add(userKey);
      if (row.analyticsSessionId) bucket.sessions.add(row.analyticsSessionId);
      byValue.set(value, bucket);
      buckets.set(spec.name, byValue);
    }
  }

  const results: DimensionDailyBucket[] = [];
  for (const [dimension, byValue] of buckets) {
    for (const [dimensionValue, b] of byValue) {
      results.push({ dimension, dimensionValue, count: b.count, uniqueUsers: b.users.size, uniqueSessions: b.sessions.size });
    }
  }
  return results;
}
