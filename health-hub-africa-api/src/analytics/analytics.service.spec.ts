import { AnalyticsService } from './analytics.service';

describe('AnalyticsService.trackEvent (anonymous + authenticated identity)', () => {
  function buildService(patient: { id: string } | null = { id: 'patient-1' }) {
    const prisma = {
      patient: { findUnique: jest.fn().mockResolvedValue(patient) },
      patientActivityEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('records against patientId when authenticated', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1', anonymousVisitorId: undefined }) }),
    );
  });

  it('records against anonymousVisitorId when unauthenticated', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view', anonymousVisitorId: 'anon-1' }, undefined);

    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: undefined, anonymousVisitorId: 'anon-1' }) }),
    );
  });

  it('drops the event when neither a patient nor an anonymous id can be resolved', async () => {
    const { service, prisma } = buildService(null);
    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService.getFunnelAnalytics (unique-user KPIs)', () => {
  function buildService(rows: Array<{ eventName: string; patientId: string | null; anonymousVisitorId: string | null }>) {
    const prisma = { patientActivityEvent: { findMany: jest.fn().mockResolvedValue(rows) } };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('counts unique users per step, not raw events, and derives KPI percentages', async () => {
    const { service } = buildService([
      // 2 unique otp_requested (p1 twice, p2 once) -> 2 unique users
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p2' },
      // only p1 verifies
      { eventName: 'otp_verify_success', patientId: null, anonymousVisitorId: 'p1' },
    ]);

    const result = await service.getFunnelAnalytics('30d');

    const otpRequested = result.data.steps.find((s) => s.eventName === 'otp_requested');
    expect(otpRequested).toEqual({ eventName: 'otp_requested', count: 3, uniqueUsers: 2 });

    const kpi = result.data.kpis.find((k) => k.key === 'otpVerificationRate');
    expect(kpi).toEqual({ key: 'otpVerificationRate', label: 'OTP Verification Rate', numerator: 1, denominator: 2, value: 50 });
  });

  it('reports a null KPI value instead of dividing by zero when the denominator step never fired', async () => {
    const { service } = buildService([]);
    const result = await service.getFunnelAnalytics('30d');

    expect(result.data.steps).toEqual([]);
    expect(result.data.kpis.every((k) => k.value === null)).toBe(true);
  });

  it('passes country/device filters through to the query', async () => {
    const { service, prisma } = buildService([]);
    await service.getFunnelAnalytics('7d', { country: 'NG', device: 'Mobile' });

    expect(prisma.patientActivityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ countryCode: 'NG', deviceCategory: 'Mobile' }),
      }),
    );
  });
});
