import { ServiceType } from '@prisma/client';
import { aggregateAppointmentRows, aggregateDispatchRows, aggregateTravelSafeRows } from './service-usage-aggregation.util';

describe('aggregateAppointmentRows', () => {
  it('groups rows by serviceType with correct counts', () => {
    const buckets = aggregateAppointmentRows([
      { serviceType: ServiceType.MinuteCare, patientId: 'p1', status: 'completed', durationMinutes: 15 },
      { serviceType: ServiceType.MinuteCare, patientId: 'p1', status: 'completed', durationMinutes: 25 },
      { serviceType: ServiceType.MinuteCare, patientId: 'p2', status: 'cancelled', durationMinutes: 30 },
      { serviceType: ServiceType.TeleCare, patientId: 'p3', status: 'completed', durationMinutes: 40 },
    ]);

    const minuteCare = buckets.find((b) => b.serviceType === ServiceType.MinuteCare)!;
    expect(minuteCare.totalSessions).toBe(3);
    expect(minuteCare.uniquePatients).toBe(2);
    expect(minuteCare.completedCount).toBe(2);
    expect(minuteCare.cancelledCount).toBe(1);
    // (15+25+30)*60 / 3 = 1400
    expect(minuteCare.avgDurationSeconds).toBe(1400);

    const teleCare = buckets.find((b) => b.serviceType === ServiceType.TeleCare)!;
    expect(teleCare.totalSessions).toBe(1);
    expect(teleCare.avgDurationSeconds).toBe(2400);
  });

  it('returns an empty array for no rows', () => {
    expect(aggregateAppointmentRows([])).toEqual([]);
  });

  it('leaves avgDurationSeconds null when no duration data is present', () => {
    const buckets = aggregateAppointmentRows([
      { serviceType: ServiceType.CareTest, patientId: 'p1', status: 'requested', durationMinutes: undefined as unknown as number },
    ]);
    expect(buckets[0].avgDurationSeconds).toBeNull();
  });
});

describe('aggregateDispatchRows', () => {
  it('returns null when there are no rows for the day', () => {
    expect(aggregateDispatchRows([])).toBeNull();
  });

  it('counts closed status as completed and never sets cancelledCount', () => {
    const bucket = aggregateDispatchRows([
      { patientId: 'p1', status: 'closed', createdAt: new Date('2026-01-01T00:00:00Z'), closedAt: new Date('2026-01-01T00:30:00Z') },
      { patientId: 'p2', status: 'en_route', createdAt: new Date('2026-01-01T01:00:00Z'), closedAt: null },
    ]);
    expect(bucket).not.toBeNull();
    expect(bucket!.serviceType).toBe(ServiceType.DispatchCare);
    expect(bucket!.totalSessions).toBe(2);
    expect(bucket!.completedCount).toBe(1);
    expect(bucket!.cancelledCount).toBe(0);
    expect(bucket!.avgDurationSeconds).toBe(1800); // only the closed row has a duration
  });
});

describe('aggregateTravelSafeRows', () => {
  it('returns null when there are no rows for the day', () => {
    expect(aggregateTravelSafeRows([])).toBeNull();
  });

  it('counts completed and cancelled trips and leaves duration null', () => {
    const bucket = aggregateTravelSafeRows([
      { patientId: 'p1', status: 'completed' },
      { patientId: 'p2', status: 'cancelled' },
      { patientId: 'p3', status: 'active' },
    ]);
    expect(bucket).not.toBeNull();
    expect(bucket!.serviceType).toBe(ServiceType.TravelSafe);
    expect(bucket!.totalSessions).toBe(3);
    expect(bucket!.completedCount).toBe(1);
    expect(bucket!.cancelledCount).toBe(1);
    expect(bucket!.avgDurationSeconds).toBeNull();
  });
});
