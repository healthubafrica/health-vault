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
