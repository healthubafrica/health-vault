import { AlertsService } from './alerts.service';

function buildService(overrides: {
  eventCounts?: Record<string, number>;
  recentAlert?: unknown;
  recipients?: Array<{ email: string }>;
  // The three login_events-backed detectors all call $queryRaw with a
  // different shape; matching on a distinctive SQL fragment lets one mock
  // serve all three without caring what order runChecks() calls them in.
  repeatedFailedLoginRows?: Array<{ userId: string; email: string; count: number | bigint }>;
  credentialStuffingAccounts?: number;
  loginAttempts?: Array<{ userId: string; email: string; occurredAt: Date; countryCode: string | null; success: boolean }>;
} = {}) {
  const counts = overrides.eventCounts ?? {};
  const queryRaw = jest.fn().mockImplementation((strings: TemplateStringsArray) => {
    const sql = strings.join('');
    if (sql.includes('HAVING COUNT')) return Promise.resolve(overrides.repeatedFailedLoginRows ?? []);
    if (sql.includes('COUNT(DISTINCT')) return Promise.resolve([{ accounts: BigInt(overrides.credentialStuffingAccounts ?? 0) }]);
    return Promise.resolve(overrides.loginAttempts ?? []);
  });
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
    $queryRaw: queryRaw,
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

describe('AlertsService.runChecks (repeated failed login per account)', () => {
  it('raises one alert per account that crosses the threshold, deduped by account', async () => {
    const { service, prisma, notifications } = buildService({
      repeatedFailedLoginRows: [{ userId: 'u1', email: 'target@example.com', count: 7 }],
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'repeated_failed_login:u1' }) }),
    );
    expect(notifications.sendEmail).toHaveBeenCalledWith(
      'ops@example.com',
      expect.stringContaining('Repeated failed logins'),
      expect.any(String),
    );
  });

  it('does not raise when no account crosses the threshold', async () => {
    const { service, prisma } = buildService({ repeatedFailedLoginRows: [] });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
  });
});

describe('AlertsService.runChecks (credential stuffing pattern)', () => {
  it('raises when failed logins spread across enough distinct accounts', async () => {
    const { service, prisma } = buildService({ credentialStuffingAccounts: 20 });

    await service.runChecks();

    expect(prisma.adminAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'credential_stuffing_pattern', severity: 'critical' }) }),
    );
  });

  it('does not raise when the failures stay concentrated in a few accounts', async () => {
    const { service, prisma } = buildService({ credentialStuffingAccounts: 3 });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'credential_stuffing_pattern' }) }),
    );
  });
});

describe('AlertsService.runChecks (login location anomaly)', () => {
  it('raises a reviewable (not accusatory) alert when the same account logs in from a new country', async () => {
    const { service, prisma } = buildService({
      loginAttempts: [
        { userId: 'u1', email: 'traveler@example.com', occurredAt: new Date('2026-09-14T08:00:00Z'), countryCode: 'NG', success: true },
        { userId: 'u1', email: 'traveler@example.com', occurredAt: new Date('2026-09-14T09:00:00Z'), countryCode: 'US', success: true },
      ],
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'login_location_anomaly',
          body: expect.stringContaining('can be legitimate travel or VPN use'),
        }),
      }),
    );
  });

  it('does not raise when every account\'s successive logins stay in the same country', async () => {
    const { service, prisma } = buildService({
      loginAttempts: [
        { userId: 'u1', email: 'a@example.com', occurredAt: new Date('2026-09-14T08:00:00Z'), countryCode: 'NG', success: true },
        { userId: 'u1', email: 'a@example.com', occurredAt: new Date('2026-09-14T09:00:00Z'), countryCode: 'NG', success: true },
      ],
    });

    await service.runChecks();

    expect(prisma.adminAlert.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'login_location_anomaly' }) }),
    );
  });
});
