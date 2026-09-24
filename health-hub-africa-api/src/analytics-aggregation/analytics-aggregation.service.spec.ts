import { ServiceType, PaymentGateway } from '@prisma/client';
import { AnalyticsAggregationService } from './analytics-aggregation.service';

function buildService(overrides: {
  appointments?: Array<{ serviceType: ServiceType; patientId: string; status: string; durationMinutes: number }>;
  dispatches?: Array<{ patientId: string; status: string; createdAt: Date; closedAt: Date | null }>;
  travelSafeTrips?: Array<{ patientId: string; status: string }>;
  payments?: Array<{ gateway: PaymentGateway; status: string; amountKobo: number; refundAmountKobo: number | null }>;
  funnelEvents?: Array<{ eventName: string; patientId: string | null; anonymousVisitorId: string | null; analyticsSessionId: string | null }>;
  dimensionEvents?: Array<{
    eventName: string;
    pagePath: string | null;
    elementId: string | null;
    featureArea: string | null;
    countryCode: string | null;
    patientId: string | null;
    anonymousVisitorId: string | null;
    analyticsSessionId: string | null;
  }>;
} = {}) {
  const prisma = {
    appointment: { findMany: jest.fn().mockResolvedValue(overrides.appointments ?? []) },
    dispatchRequest: { findMany: jest.fn().mockResolvedValue(overrides.dispatches ?? []) },
    travelSafeTrip: { findMany: jest.fn().mockResolvedValue(overrides.travelSafeTrips ?? []) },
    payment: { findMany: jest.fn().mockResolvedValue(overrides.payments ?? []) },
    // Distinguished by select shape, not call order: fetchDimensionEventRowsForDay
    // selects pagePath, fetchFunnelEventRowsForDay doesn't.
    patientActivityEvent: {
      findMany: jest.fn().mockImplementation(({ select }: any) =>
        Promise.resolve('pagePath' in select ? (overrides.dimensionEvents ?? []) : (overrides.funnelEvents ?? [])),
      ),
    },
    serviceUsageDaily: { upsert: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(null) },
    funnelEventDaily: { upsert: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(null) },
    dimensionDailyMetric: { upsert: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(null) },
    revenueSummary: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const queue = { getRepeatableJobs: jest.fn().mockResolvedValue([]), removeRepeatableByKey: jest.fn(), add: jest.fn() };
  const service = new AnalyticsAggregationService(prisma as any, queue as any);
  return { service, prisma, queue };
}

describe('AnalyticsAggregationService.onModuleInit', () => {
  it('clears any stale repeatable job and registers the daily cron', async () => {
    const { service, queue } = buildService();
    queue.getRepeatableJobs.mockResolvedValue([{ name: 'aggregate-daily', key: 'stale-key' }]);

    await service.onModuleInit();

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('stale-key');
    expect(queue.add).toHaveBeenCalledWith(
      'aggregate-daily',
      {},
      expect.objectContaining({ repeat: { cron: '15 1 * * *' } }),
    );
  });
});

describe('AnalyticsAggregationService.runDailyAggregation', () => {
  it('upserts a ServiceUsageDaily row per ServiceType with data that day', async () => {
    const { service, prisma } = buildService({
      appointments: [
        { serviceType: ServiceType.MinuteCare, patientId: 'p1', status: 'completed', durationMinutes: 20 },
      ],
      dispatches: [
        { patientId: 'p2', status: 'closed', createdAt: new Date('2026-01-01T00:00:00Z'), closedAt: new Date('2026-01-01T00:15:00Z') },
      ],
      travelSafeTrips: [{ patientId: 'p3', status: 'completed' }],
    });

    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    expect(prisma.serviceUsageDaily.upsert).toHaveBeenCalledTimes(3);
    const serviceTypes = prisma.serviceUsageDaily.upsert.mock.calls.map((call: any) => call[0].create.serviceType);
    expect(serviceTypes.sort()).toEqual([ServiceType.DispatchCare, ServiceType.MinuteCare, ServiceType.TravelSafe].sort());
  });

  it('does not write a ServiceUsageDaily row for a ServiceType with no activity that day', async () => {
    const { service, prisma } = buildService({ appointments: [], dispatches: [], travelSafeTrips: [] });
    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));
    expect(prisma.serviceUsageDaily.upsert).not.toHaveBeenCalled();
  });

  it('aggregates the prior UTC day, not the reference date itself', async () => {
    const { service, prisma } = buildService();
    await service.runDailyAggregation(new Date('2026-03-10T09:30:00Z'));

    const appointmentsCallArgs = prisma.appointment.findMany.mock.calls[0][0];
    expect(appointmentsCallArgs.where.createdAt.gte).toEqual(new Date('2026-03-09T00:00:00Z'));
    expect(appointmentsCallArgs.where.createdAt.lt).toEqual(new Date('2026-03-10T00:00:00Z'));
  });

  it('creates a RevenueSummary row per gateway with serviceType null when none exists yet', async () => {
    const { service, prisma } = buildService({
      payments: [{ gateway: PaymentGateway.Paystack, status: 'paid', amountKobo: 500000, refundAmountKobo: null }],
    });

    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    expect(prisma.revenueSummary.create).toHaveBeenCalledTimes(1);
    expect(prisma.revenueSummary.update).not.toHaveBeenCalled();
    const call = prisma.revenueSummary.create.mock.calls[0][0];
    expect(call.data.serviceType).toBeNull();
    expect(call.data.gateway).toBe(PaymentGateway.Paystack);
    expect(call.data.grossRevenueKobo).toBe(500000n);
  });

  it('updates the existing RevenueSummary row instead of creating a duplicate on re-run', async () => {
    const { service, prisma } = buildService({
      payments: [{ gateway: PaymentGateway.Paystack, status: 'paid', amountKobo: 500000, refundAmountKobo: null }],
    });
    prisma.revenueSummary.findFirst.mockResolvedValue({ id: 'existing-id' });

    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    expect(prisma.revenueSummary.create).not.toHaveBeenCalled();
    expect(prisma.revenueSummary.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'existing-id' } }),
    );
  });

  it('upserts a FunnelEventDaily row per distinct event name with unique-user/session counts', async () => {
    const { service, prisma } = buildService({
      funnelEvents: [
        { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'v1', analyticsSessionId: 's1' },
        { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'v2', analyticsSessionId: 's2' },
        { eventName: 'otp_verify_success', patientId: 'p1', anonymousVisitorId: null, analyticsSessionId: 's1' },
      ],
    });

    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    expect(prisma.funnelEventDaily.upsert).toHaveBeenCalledTimes(2);
    const otpRequestedCall = prisma.funnelEventDaily.upsert.mock.calls.find(
      (call: any) => call[0].create.eventName === 'otp_requested',
    );
    expect(otpRequestedCall[0].create).toMatchObject({ count: 2, uniqueUsers: 2, uniqueSessions: 2 });
  });

  it('upserts a DimensionDailyMetric row per dimension/value pair observed that day', async () => {
    const { service, prisma } = buildService({
      dimensionEvents: [
        {
          eventName: 'page_view',
          pagePath: '/dashboard',
          elementId: null,
          featureArea: 'dashboard',
          countryCode: 'NG',
          patientId: 'p1',
          anonymousVisitorId: null,
          analyticsSessionId: 's1',
        },
      ],
    });

    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    const dimensions = prisma.dimensionDailyMetric.upsert.mock.calls.map((call: any) => call[0].create.dimension);
    expect(dimensions.sort()).toEqual(['country', 'feature_area', 'page'].sort());
  });

  it('excludes test events from the funnel aggregate query, same as every other dashboard', async () => {
    const { service, prisma } = buildService();
    await service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'));

    expect(prisma.patientActivityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isTestEvent: false }) }),
    );
  });

  it('propagates errors instead of swallowing them', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findMany.mockRejectedValue(new Error('db down'));

    await expect(service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'))).rejects.toThrow('db down');
  });
});

describe('AnalyticsAggregationService.runBackfill', () => {
  it('runs runDailyAggregation once per day in the inclusive range, offset by one day', async () => {
    const { service } = buildService();
    const spy = jest.spyOn(service, 'runDailyAggregation');

    const results = await service.runBackfill(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-03T00:00:00Z'));

    expect(spy.mock.calls.map((call) => call[0]?.toISOString())).toEqual([
      new Date('2026-01-02T00:00:00Z').toISOString(),
      new Date('2026-01-03T00:00:00Z').toISOString(),
      new Date('2026-01-04T00:00:00Z').toISOString(),
    ]);
    expect(results).toEqual([
      { reportDate: '2026-01-01', status: 'ok' },
      { reportDate: '2026-01-02', status: 'ok' },
      { reportDate: '2026-01-03', status: 'ok' },
    ]);
  });

  it('records a day as errored without aborting the rest of the range', async () => {
    const { service } = buildService();
    jest.spyOn(service, 'runDailyAggregation').mockImplementation(async (forDate?: Date) => {
      if (forDate?.toISOString() === new Date('2026-01-03T00:00:00Z').toISOString()) {
        throw new Error('relation does not exist');
      }
    });

    const results = await service.runBackfill(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-03T00:00:00Z'));

    expect(results).toEqual([
      { reportDate: '2026-01-01', status: 'ok' },
      { reportDate: '2026-01-02', status: 'error', error: 'relation does not exist' },
      { reportDate: '2026-01-03', status: 'ok' },
    ]);
  });

  it('rejects a range where "from" is after "to"', async () => {
    const { service } = buildService();
    await expect(
      service.runBackfill(new Date('2026-01-03T00:00:00Z'), new Date('2026-01-01T00:00:00Z')),
    ).rejects.toThrow('must not be after');
  });

  it('rejects a range wider than the max backfill window without running anything', async () => {
    const { service } = buildService();
    const spy = jest.spyOn(service, 'runDailyAggregation');

    await expect(
      service.runBackfill(new Date('2026-01-01T00:00:00Z'), new Date('2026-06-01T00:00:00Z')),
    ).rejects.toThrow('too large');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('AnalyticsAggregationService.getPipelineHealth', () => {
  it('reports the most recent updatedAt across the 4 pre-aggregate tables', async () => {
    const { service, prisma } = buildService();
    prisma.serviceUsageDaily.findFirst.mockResolvedValue({
      updatedAt: new Date('2026-09-20T01:16:00Z'),
      reportDate: new Date('2026-09-19T00:00:00Z'),
    });
    prisma.dimensionDailyMetric.findFirst.mockResolvedValue({
      updatedAt: new Date('2026-09-21T01:16:00Z'), // the latest of the 4
      reportDate: new Date('2026-09-20T00:00:00Z'),
    });

    const health = await service.getPipelineHealth();

    expect(health).toEqual({
      lastRunAt: '2026-09-21T01:16:00.000Z',
      lastReportDate: '2026-09-20',
      isStale: expect.any(Boolean),
    });
  });

  it('is not stale when the most recent run is within the last 30 hours', async () => {
    const { service, prisma } = buildService();
    prisma.funnelEventDaily.findFirst.mockResolvedValue({
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      reportDate: new Date(),
    });

    const health = await service.getPipelineHealth();
    expect(health.isStale).toBe(false);
  });

  it('is stale when the most recent run is more than 30 hours old', async () => {
    const { service, prisma } = buildService();
    prisma.funnelEventDaily.findFirst.mockResolvedValue({
      updatedAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
      reportDate: new Date(),
    });

    const health = await service.getPipelineHealth();
    expect(health.isStale).toBe(true);
  });

  it('reports stale with null timestamps when no pre-aggregate table has any rows yet', async () => {
    const { service } = buildService();
    const health = await service.getPipelineHealth();
    expect(health).toEqual({ lastRunAt: null, lastReportDate: null, isStale: true });
  });
});
