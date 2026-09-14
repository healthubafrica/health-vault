import { ServiceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Spec §25 (Data Warehouse / Aggregation Configuration) — daily rollups for
 * ServiceUsageDaily. Kept as pure functions over query results (rather than
 * inline in the aggregation service) so the shaping logic can be unit tested
 * without a database.
 *
 * Coverage note (deliberately scoped, not silently partial): ServiceType has
 * 8 members. Six of them (MinuteCare, TeleCare, CareTest, HealthConsult,
 * ExpertReview, NeuroFlex) are booked through the `Appointment` table and are
 * covered here. The remaining two run through dedicated tables with no
 * `serviceType` column:
 *   - DispatchCare → `DispatchRequest` (ambulance dispatch, no appointment)
 *   - TravelSafe   → `TravelSafeTrip` (travel prep, no appointment)
 * Both are aggregated by their own functions below so all 8 ServiceType
 * values are covered by this first slice.
 */

export interface UsageBucket {
  serviceType: ServiceType;
  totalSessions: number;
  uniquePatients: number;
  completedCount: number;
  cancelledCount: number;
  avgDurationSeconds: number | null;
}

interface AppointmentRow {
  serviceType: ServiceType;
  patientId: string;
  status: string;
  durationMinutes: number;
}

/** Pure: groups raw Appointment rows for one day into per-ServiceType buckets. */
export function aggregateAppointmentRows(rows: AppointmentRow[]): UsageBucket[] {
  const byType = new Map<
    ServiceType,
    { patients: Set<string>; completed: number; cancelled: number; durationSum: number; durationCount: number; total: number }
  >();

  for (const row of rows) {
    if (!byType.has(row.serviceType)) {
      byType.set(row.serviceType, { patients: new Set(), completed: 0, cancelled: 0, durationSum: 0, durationCount: 0, total: 0 });
    }
    const bucket = byType.get(row.serviceType)!;
    bucket.total += 1;
    bucket.patients.add(row.patientId);
    if (row.status === 'completed') bucket.completed += 1;
    if (row.status === 'cancelled') bucket.cancelled += 1;
    if (typeof row.durationMinutes === 'number') {
      bucket.durationSum += row.durationMinutes * 60;
      bucket.durationCount += 1;
    }
  }

  return Array.from(byType.entries()).map(([serviceType, b]) => ({
    serviceType,
    totalSessions: b.total,
    uniquePatients: b.patients.size,
    completedCount: b.completed,
    cancelledCount: b.cancelled,
    avgDurationSeconds: b.durationCount > 0 ? Math.round(b.durationSum / b.durationCount) : null,
  }));
}

interface DispatchRow {
  patientId: string;
  status: string;
  createdAt: Date;
  closedAt: Date | null;
}

/** Pure: DispatchRequest has no `cancelled` status in DispatchStatus — only
 * `closed` reads as terminal/completed, so cancelledCount is always 0 here
 * (documented, not a silent omission). */
export function aggregateDispatchRows(rows: DispatchRow[]): UsageBucket | null {
  if (rows.length === 0) return null;

  const patients = new Set<string>();
  let completed = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const row of rows) {
    patients.add(row.patientId);
    if (row.status === 'closed') completed += 1;
    if (row.closedAt) {
      durationSum += (row.closedAt.getTime() - row.createdAt.getTime()) / 1000;
      durationCount += 1;
    }
  }

  return {
    serviceType: ServiceType.DispatchCare,
    totalSessions: rows.length,
    uniquePatients: patients.size,
    completedCount: completed,
    cancelledCount: 0,
    avgDurationSeconds: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
  };
}

interface TravelSafeRow {
  patientId: string;
  status: string;
}

/** Pure: TravelSafeTrip has no per-trip "duration" comparable to a session
 * (it spans a whole trip, departure→return) — avgDurationSeconds is always
 * null for this ServiceType, deliberately, not a bug. */
export function aggregateTravelSafeRows(rows: TravelSafeRow[]): UsageBucket | null {
  if (rows.length === 0) return null;

  const patients = new Set<string>();
  let completed = 0;
  let cancelled = 0;

  for (const row of rows) {
    patients.add(row.patientId);
    if (row.status === 'completed') completed += 1;
    if (row.status === 'cancelled') cancelled += 1;
  }

  return {
    serviceType: ServiceType.TravelSafe,
    totalSessions: rows.length,
    uniquePatients: patients.size,
    completedCount: completed,
    cancelledCount: cancelled,
    avgDurationSeconds: null,
  };
}

/** Fetches the raw rows for one UTC day [start, end) needed to build all
 * ServiceUsageDaily buckets for that day. Split out from the pure aggregator
 * functions above purely so those stay unit-testable without a database. */
export async function fetchServiceUsageRowsForDay(
  prisma: PrismaService,
  start: Date,
  end: Date,
): Promise<{ appointments: AppointmentRow[]; dispatches: DispatchRow[]; travelSafeTrips: TravelSafeRow[] }> {
  const [appointments, dispatches, travelSafeTrips] = await Promise.all([
    prisma.appointment.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { serviceType: true, patientId: true, status: true, durationMinutes: true },
    }),
    prisma.dispatchRequest.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { patientId: true, status: true, createdAt: true, closedAt: true },
    }),
    prisma.travelSafeTrip.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { patientId: true, status: true },
    }),
  ]);

  return { appointments, dispatches, travelSafeTrips };
}
