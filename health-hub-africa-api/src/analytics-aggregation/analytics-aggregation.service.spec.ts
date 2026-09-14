import { ServiceType, PaymentGateway } from '@prisma/client';
import { AnalyticsAggregationService } from './analytics-aggregation.service';

function buildService(overrides: {
  appointments?: Array<{ serviceType: ServiceType; patientId: string; status: string; durationMinutes: number }>;
  dispatches?: Array<{ patientId: string; status: string; createdAt: Date; closedAt: Date | null }>;
  travelSafeTrips?: Array<{ patientId: string; status: string }>;
  payments?: Array<{ gateway: PaymentGateway; status: string; amountKobo: number; refundAmountKobo: number | null }>;
} = {}) {
  const prisma = {
    appointment: { findMany: jest.fn().mockResolvedValue(overrides.appointments ?? []) },
    dispatchRequest: { findMany: jest.fn().mockResolvedValue(overrides.dispatches ?? []) },
    travelSafeTrip: { findMany: jest.fn().mockResolvedValue(overrides.travelSafeTrips ?? []) },
    payment: { findMany: jest.fn().mockResolvedValue(overrides.payments ?? []) },
    serviceUsageDaily: { upsert: jest.fn().mockResolvedValue({}) },
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

  it('propagates errors instead of swallowing them', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findMany.mockRejectedValue(new Error('db down'));

    await expect(service.runDailyAggregation(new Date('2026-01-02T00:00:00Z'))).rejects.toThrow('db down');
  });
});
