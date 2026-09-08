import { AlertsService } from './alerts.service';

function buildService(overrides: {
  eventCounts?: Record<string, number>;
  recentAlert?: unknown;
  recipients?: Array<{ email: string }>;
} = {}) {
  const counts = overrides.eventCounts ?? {};
  const prisma = {
    patientActivityEvent: {
      count: jest.fn().mockImplementation(({ where }: { where: { eventName: string } }) =>
        Promise.resolve(counts[where.eventName] ?? 0),
      ),
    },
    adminAlert: {
      findFirst: jest.fn().mockResolvedValue(overrides.recentAlert ?? null),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    notificationRecipient: {
      findMany: jest.fn().mockResolvedValue(overrides.recipients ?? [{ email: 'ops@example.com' }]),
    },
  };
  const notifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const queue = { getRepeatableJobs: jest.fn().mockResolvedValue([]), removeRepeatableByKey: jest.fn(), add: jest.fn() };
  const service = new AlertsService(prisma as any, notifications as any, queue as any);
  return { service, prisma, notifications };
}

describe('AlertsService.runChecks (OTP failure spike)', () => {
  it('raises an alert and emails all active recipients when failures exceed the threshold', async () => {
    const { service, prisma, notifications } = buildService({
      eventCounts: { otp_verify_failure: 6, booking_started: 0, booking_confirmed: 0 },
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'otp_failure_spike' }) }),
    );
    expect(notifications.sendEmail).toHaveBeenCalledWith(
      'ops@example.com',
      expect.stringContaining('OTP verification failures spiking'),
      expect.any(String),
    );
  });

  it('does not raise when failures are below the threshold', async () => {
    const { service, prisma, notifications } = buildService({
      eventCounts: { otp_verify_failure: 4, booking_started: 0, booking_confirmed: 0 },
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });

  it('does not re-raise within the dedupe window even when the condition is still true', async () => {
    const { service, prisma } = buildService({
      eventCounts: { otp_verify_failure: 10, booking_started: 0, booking_confirmed: 0 },
      recentAlert: { id: 'existing-alert' },
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
  });
});

describe('AlertsService.runChecks (booking abandonment)', () => {
  it('raises when abandonment rate exceeds the threshold with enough sample size', async () => {
    const { service, prisma } = buildService({
      eventCounts: { otp_verify_failure: 0, booking_started: 10, booking_confirmed: 1 },
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'booking_abandonment_spike' }) }),
    );
  });

  it('does not raise when the sample size is too small, even at 100% abandonment', async () => {
    const { service, prisma } = buildService({
      eventCounts: { otp_verify_failure: 0, booking_started: 2, booking_confirmed: 0 },
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
  });
});
