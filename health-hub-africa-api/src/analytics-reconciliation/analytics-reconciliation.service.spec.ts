import { ServiceType } from '@prisma/client';
import { AnalyticsReconciliationService } from './analytics-reconciliation.service';

function buildService(overrides: {
  paymentSuccessEvents?: number;
  paymentFailureEvents?: number;
  bookingConfirmedEvents?: number;
  paymentCount?: number;
  paymentFailedCount?: number;
  appointmentCreatedCount?: number;
  appointmentCompletedCount?: number;
  revenueSummaryRows?: Array<{ netRevenueKobo: bigint | number }>;
  paymentRows?: Array<{ amountKobo: number; refundAmountKobo: number | null }>;
  serviceUsageRows?: Array<{ completedCount: number }>;
} = {}) {
  const eventCountByName: Record<string, number> = {
    payment_success: overrides.paymentSuccessEvents ?? 0,
    payment_failure: overrides.paymentFailureEvents ?? 0,
    booking_confirmed: overrides.bookingConfirmedEvents ?? 0,
  };
  const prisma = {
    patientActivityEvent: {
      count: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(eventCountByName[where.eventName] ?? 0)),
    },
    payment: {
      count: jest.fn().mockImplementation(({ where }: any) => {
        if (where.status === 'paid') return Promise.resolve(overrides.paymentCount ?? 0);
        if (where.status === 'failed') return Promise.resolve(overrides.paymentFailedCount ?? 0);
        return Promise.resolve(0);
      }),
      findMany: jest.fn().mockResolvedValue(overrides.paymentRows ?? []),
    },
    appointment: {
      count: jest.fn().mockImplementation(({ where }: any) => {
        if (where.status === 'completed') return Promise.resolve(overrides.appointmentCompletedCount ?? 0);
        return Promise.resolve(overrides.appointmentCreatedCount ?? 0);
      }),
    },
    revenueSummary: { findMany: jest.fn().mockResolvedValue(overrides.revenueSummaryRows ?? []) },
    serviceUsageDaily: { findMany: jest.fn().mockResolvedValue(overrides.serviceUsageRows ?? []) },
  };
  const alerts = { raise: jest.fn().mockResolvedValue(undefined) };
  const queue = { getRepeatableJobs: jest.fn().mockResolvedValue([]), removeRepeatableByKey: jest.fn(), add: jest.fn() };
  const service = new AnalyticsReconciliationService(prisma as any, alerts as any, queue as any);
  return { service, prisma, alerts, queue };
}

describe('AnalyticsReconciliationService.onModuleInit', () => {
  it('clears any stale repeatable job and registers the daily cron 75 minutes after the aggregation cron', async () => {
    const { service, queue } = buildService();
    queue.getRepeatableJobs.mockResolvedValue([{ name: 'reconcile-daily', key: 'stale-key' }]);

    await service.onModuleInit();

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('stale-key');
    expect(queue.add).toHaveBeenCalledWith(
      'reconcile-daily',
      {},
      expect.objectContaining({ repeat: { cron: '30 2 * * *' } }),
    );
  });
});

describe('AnalyticsReconciliationService.runDailyReconciliation', () => {
  it('reports no mismatch and raises no alert when analytics and transactional counts agree', async () => {
    const { service, alerts } = buildService({
      paymentSuccessEvents: 10,
      paymentFailureEvents: 0,
      bookingConfirmedEvents: 10,
      paymentCount: 10,
      paymentFailedCount: 0,
      appointmentCreatedCount: 10,
    });

    const results = await service.runDailyReconciliation(new Date('2026-01-02T00:00:00Z'));

    expect(results.every((r) => !r.mismatched)).toBe(true);
    expect(alerts.raise).not.toHaveBeenCalled();
  });

  it('flags a mismatch and raises an alert when payment_success events diverge from paid Payment rows beyond threshold', async () => {
    const { service, alerts } = buildService({
      paymentSuccessEvents: 5,
      paymentCount: 10,
    });

    const results = await service.runDailyReconciliation(new Date('2026-01-02T00:00:00Z'));

    const paymentResult = results.find((r) => r.pair === 'payment_success_vs_paid_payments')!;
    expect(paymentResult.mismatched).toBe(true);
    expect(alerts.raise).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reconciliation_mismatch:payment_success_vs_paid_payments' }),
    );
  });

  it('tolerates a single-row boundary-race difference without flagging a mismatch', async () => {
    const { service } = buildService({
      bookingConfirmedEvents: 199,
      appointmentCreatedCount: 200,
    });

    const results = await service.runDailyReconciliation(new Date('2026-01-02T00:00:00Z'));

    const bookingResult = results.find((r) => r.pair === 'booking_confirmed_vs_appointments_created')!;
    expect(bookingResult.mismatched).toBe(false);
  });

  it('restricts the service-usage aggregate check to appointment-sourced ServiceTypes only', async () => {
    const { service, prisma } = buildService({
      serviceUsageRows: [{ completedCount: 5 }],
      appointmentCompletedCount: 5,
    });

    await service.runDailyReconciliation(new Date('2026-01-02T00:00:00Z'));

    const call = prisma.serviceUsageDaily.findMany.mock.calls[0][0];
    expect(call.where.serviceType.in).toEqual(
      expect.arrayContaining([ServiceType.MinuteCare, ServiceType.TeleCare, ServiceType.CareTest]),
    );
    expect(call.where.serviceType.in).not.toContain(ServiceType.DispatchCare);
    expect(call.where.serviceType.in).not.toContain(ServiceType.TravelSafe);
  });

  it('compares net revenue (amount minus refunds), not gross, between the aggregate and the source payments', async () => {
    const { service } = buildService({
      revenueSummaryRows: [{ netRevenueKobo: 9000 }],
      paymentRows: [{ amountKobo: 10000, refundAmountKobo: 1000 }],
    });

    const results = await service.runDailyReconciliation(new Date('2026-01-02T00:00:00Z'));

    const revenueResult = results.find((r) => r.pair === 'revenue_summary_vs_payments')!;
    expect(revenueResult.mismatched).toBe(false);
  });
});
