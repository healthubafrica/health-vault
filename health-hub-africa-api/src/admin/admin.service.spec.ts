import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.updateUserEmail', () => {
  const existingUser = { id: 'user-1', email: 'old@example.com', role: 'provider' };

  function buildService(
    findUniqueImpl?: (args: { where: { id?: string; email?: string } }) => unknown,
  ) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(
          findUniqueImpl ??
            (({ where }: { where: { id?: string; email?: string } }) =>
              where.id === existingUser.id ? existingUser : null),
        ),
        update: jest.fn().mockResolvedValue({
          id: existingUser.id,
          email: 'new@example.com',
          role: existingUser.role,
        }),
      },
      userSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    const authService = {
      requestPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    const service = new AdminService(
      prisma as never,
      {} as never, // openemrQueue
      {} as never, // notificationsQueue
      {} as never, // redis
      {} as never, // openemrService
      {} as never, // notifications
      {} as never, // s3
      authService as never,
      {} as never, // analyticsService
      {} as never, // alertsService
    );

    return { service, prisma, authService };
  }

  it('throws NotFoundException when the user does not exist', async () => {
    const { service } = buildService(() => null);
    await expect(service.updateUserEmail('missing', 'new@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the new email is already taken', async () => {
    const { service } = buildService(({ where }) =>
      where.id === existingUser.id
        ? existingUser
        : where.email === 'taken@example.com'
        ? { id: 'other-user' }
        : null,
    );
    await expect(
      service.updateUserEmail(existingUser.id, 'taken@example.com'),
    ).rejects.toThrow(BadRequestException);
  });

  it('no-ops without sending a reset code when the email is unchanged', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, existingUser.email);

    expect(result).toEqual({
      data: { id: existingUser.id, email: existingUser.email, message: 'Email unchanged.' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(authService.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('updates the email, revokes sessions, and sends a reset code on the happy path', async () => {
    const { service, prisma, authService } = buildService();
    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { email: 'new@example.com' },
      select: { id: true, email: true, role: true },
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: existingUser.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('new@example.com');
    expect(result).toEqual({
      data: {
        id: existingUser.id,
        email: 'new@example.com',
        message: 'Email updated and password reset code sent.',
      },
    });
  });

  it('still reports success when the reset-code email fails to send', async () => {
    const { service, authService } = buildService();
    authService.requestPasswordReset.mockRejectedValue(new Error('SMTP down'));

    const result = await service.updateUserEmail(existingUser.id, 'new@example.com');
    expect(result.data.message).toBe('Email updated and password reset code sent.');
  });
});

describe('AdminService.getMarketingAnalytics', () => {
  // Both writes into "users"/"login_events" happen via raw SQL (no schema.prisma
  // model for AcquisitionSource/LoginEvent), so reads here go through
  // $queryRaw too — mocked as two sequential calls matching the Promise.all
  // order in the implementation (registrations, then logins).
  function buildService(registrations: unknown[], logins: unknown[]) {
    const queryRaw = jest.fn().mockResolvedValueOnce(registrations).mockResolvedValueOnce(logins);
    const prisma = { $queryRaw: queryRaw };
    const service = new AdminService(
      prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    return { service };
  }

  it('aggregates registrations and logins by source, campaign, location, and device', async () => {
    const { service } = buildService(
      [
        {
          id: 'u1', createdAt: new Date('2026-08-15'), isVerified: true,
          acquisitionSource: 'social_media', utmSource: 'facebook', utmMedium: 'paid_social',
          utmCampaign: 'summer', registrationReferrer: null,
        },
        {
          id: 'u2', createdAt: new Date('2026-08-16'), isVerified: false,
          acquisitionSource: null, utmSource: null, utmMedium: null, utmCampaign: null, registrationReferrer: null,
        },
      ],
      [
        {
          userId: 'u1', occurredAt: new Date('2026-08-16'),
          countryCode: 'ng', region: 'Lagos', city: 'Lagos', timezone: 'Africa/Lagos',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile/15E148',
          referrer: 'https://facebook.com/x', utmSource: 'facebook', utmMedium: 'paid_social', utmCampaign: 'summer',
        },
      ],
    );

    const result = await service.getMarketingAnalytics('30d');

    expect(result.data.totals).toEqual({
      registrations: 2,
      verifiedRegistrations: 1,
      attributedRegistrations: 1,
      logins: 1,
      uniqueLoginUsers: 1,
    });
    expect(result.data.acquisitionSources).toEqual(
      expect.arrayContaining([
        { source: 'social_media', count: 1, percentage: 50 },
        { source: 'unknown', count: 1, percentage: 50 },
      ]),
    );
    expect(result.data.campaigns[0]).toEqual(
      expect.objectContaining({
        campaign: 'summer', source: 'facebook', medium: 'paid_social', registrations: 1, logins: 1,
      }),
    );
    // Country code is normalised to uppercase regardless of header casing.
    expect(result.data.loginLocations[0]).toEqual(
      expect.objectContaining({ countryCode: 'NG', city: 'Lagos', logins: 1, uniqueUsers: 1 }),
    );
    expect(result.data.devices).toEqual([{ device: 'Mobile', count: 1 }]);
    expect(result.data.referrers).toEqual([{ referrer: 'facebook.com', count: 1 }]);
  });

  it('returns zeroed totals without dividing by zero when there is no data', async () => {
    const { service } = buildService([], []);

    const result = await service.getMarketingAnalytics('7d');

    expect(result.data.totals).toEqual({
      registrations: 0, verifiedRegistrations: 0, attributedRegistrations: 0, logins: 0, uniqueLoginUsers: 0,
    });
    expect(result.data.acquisitionSources).toEqual([]);
    expect(result.data.campaigns).toEqual([]);
  });
});

describe('AdminService.getSecurityAnalytics (login_events success + failure)', () => {
  function buildService(attempts: unknown[]) {
    const queryRaw = jest.fn().mockResolvedValue(attempts);
    const prisma = { $queryRaw: queryRaw };
    const service = new AdminService(
      prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    return { service };
  }

  it('computes failure rate and ranks failed-login locations', async () => {
    const { service } = buildService([
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T10:00:00Z'), countryCode: 'ng', success: true },
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T11:00:00Z'), countryCode: 'ng', success: false },
      { userId: 'u2', email: 'b@x.com', occurredAt: new Date('2026-08-16T12:00:00Z'), countryCode: 'us', success: false },
    ]);

    const result = await service.getSecurityAnalytics('30d');

    expect(result.data.totalAttempts).toBe(3);
    expect(result.data.successCount).toBe(1);
    expect(result.data.failureCount).toBe(2);
    expect(result.data.failureRate).toBeCloseTo(66.7, 1);
    expect(result.data.failedLoginLocations).toEqual(
      expect.arrayContaining([{ countryCode: 'NG', count: 1 }, { countryCode: 'US', count: 1 }]),
    );
  });

  it('flags a location anomaly when the same user\'s consecutive successful logins cross countries', async () => {
    const { service } = buildService([
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T10:00:00Z'), countryCode: 'ng', success: true },
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T11:00:00Z'), countryCode: 'us', success: true },
    ]);

    const result = await service.getSecurityAnalytics('30d');

    expect(result.data.locationAnomalies).toEqual([
      { userId: 'u1', email: 'a@x.com', fromCountry: 'NG', toCountry: 'US', occurredAt: new Date('2026-08-16T11:00:00Z') },
    ]);
  });

  it('does not flag an anomaly when a failed attempt sits between two same-country successful logins', async () => {
    const { service } = buildService([
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T10:00:00Z'), countryCode: 'ng', success: true },
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T10:30:00Z'), countryCode: 'us', success: false },
      { userId: 'u1', email: 'a@x.com', occurredAt: new Date('2026-08-16T11:00:00Z'), countryCode: 'ng', success: true },
    ]);

    const result = await service.getSecurityAnalytics('30d');

    expect(result.data.locationAnomalies).toEqual([]);
  });

  it('reports a null failure rate instead of dividing by zero when there are no attempts', async () => {
    const { service } = buildService([]);
    const result = await service.getSecurityAnalytics('30d');

    expect(result.data.failureRate).toBeNull();
    expect(result.data.totalAttempts).toBe(0);
  });
});

describe('AdminService.listUsers (registration stage)', () => {
  function buildService(users: unknown[]) {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(users),
        count: jest.fn().mockResolvedValue(users.length),
      },
    };
    const s3 = { signStoredUrl: jest.fn().mockResolvedValue(null) };
    const service = new AdminService(
      prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, s3 as never, {} as never, {} as never, {} as never,
    );
    return { service, prisma };
  }

  const baseUser = {
    id: 'u1', email: 'a@b.com', phone: null, fullName: null, role: 'patient',
    isActive: true, isVerified: false, lastLoginAt: null, createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'), profilePhotoUrl: null,
    onboardingProgress: null, patient: null, provider: null,
  };

  it('buckets an unverified user as verification_pending', async () => {
    const { service } = buildService([{ ...baseUser }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].registrationStage).toBe('verification_pending');
  });

  it('buckets a verified user with no Patient row as profile_incomplete', async () => {
    const { service } = buildService([{ ...baseUser, isVerified: true }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].registrationStage).toBe('profile_incomplete');
  });

  it('buckets a Patient with no active/trial subscription as plan_incomplete', async () => {
    const { service } = buildService([{
      ...baseUser, isVerified: true,
      patient: { id: 'p1', firstName: 'A', lastName: 'B', hhaPatientId: 'HHA-1', openemrPatientUuid: null, profilePhotoUrl: null, subscriptions: [] },
    }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].registrationStage).toBe('plan_incomplete');
  });

  it('buckets a fully onboarded user as complete', async () => {
    const { service } = buildService([{
      ...baseUser, isVerified: true,
      patient: {
        id: 'p1', firstName: 'A', lastName: 'B', hhaPatientId: 'HHA-1', openemrPatientUuid: null, profilePhotoUrl: null,
        subscriptions: [{ status: 'active', expiresAt: null, plan: { name: 'Premium', tier: 'premium' } }],
      },
    }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].registrationStage).toBe('complete');
  });

  it('surfaces onboardingStep and prefers it as the most recent activity', async () => {
    const { service } = buildService([{
      ...baseUser, isVerified: true,
      onboardingProgress: { currentStep: 2, stepName: 'Vitals', updatedAt: new Date('2026-08-15') },
    }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].onboardingStep).toEqual({ step: 2, name: 'Vitals' });
    expect(result.data[0].lastActivityAt).toEqual(new Date('2026-08-15'));
  });

  it('falls back to the registered fullName when no Patient/Provider name exists yet', async () => {
    const { service } = buildService([{ ...baseUser, fullName: 'Pending Person' }]);
    const result = await service.listUsers(1, 20);
    expect(result.data[0].fullName).toBe('Pending Person');
  });

  it('applies the profile_incomplete filter as isVerified + no Patient', async () => {
    const { service, prisma } = buildService([]);
    await service.listUsers(1, 20, undefined, undefined, 'profile_incomplete');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ isVerified: true, patient: null }] },
      }),
    );
  });
});

describe('AdminService.getAnalyticsUsage / getAnalyticsRevenue (read the daily aggregate tables)', () => {
  function buildService(opts: { usage?: unknown[]; revenue?: unknown[] } = {}) {
    const prisma = {
      serviceUsageDaily: { findMany: jest.fn().mockResolvedValue(opts.usage ?? []) },
      revenueSummary: { findMany: jest.fn().mockResolvedValue(opts.revenue ?? []) },
    };
    const service = new AdminService(
      prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    );
    return { service, prisma };
  }

  const day = new Date('2026-09-10T00:00:00Z');

  it('gives every ServiceType its own column — nothing is folded into another service', async () => {
    const row = (serviceType: string, totalSessions: number) => ({ reportDate: day, serviceType, totalSessions });
    const { service } = buildService({
      usage: [
        row('MinuteCare', 1),
        row('TeleCare', 2),
        row('CareTest', 4),
        row('HealthConsult', 8),
        row('ExpertReview', 16),
        row('NeuroFlex', 32),
        row('DispatchCare', 64),
        row('TravelSafe', 128),
      ],
    });

    const { data } = await service.getAnalyticsUsage('30d');

    expect(data).toEqual([
      {
        date: '2026-09-10',
        minuteCare: 1,
        teleCare: 2,
        careTest: 4,
        healthConsult: 8,
        expertReview: 16,
        neuroFlex: 32,
        dispatchCare: 64,
        travelSafe: 128,
      },
    ]);
  });

  it('zero-fills services with no activity so every row has the same shape', async () => {
    const { service } = buildService({ usage: [{ reportDate: day, serviceType: 'CareTest', totalSessions: 3 }] });

    const { data } = await service.getAnalyticsUsage('30d');

    expect(data[0]).toMatchObject({ careTest: 3, teleCare: 0, expertReview: 0, travelSafe: 0 });
    expect(Object.keys(data[0])).toHaveLength(9); // date + 8 service types
  });

  it('pivots multiple days into one row per date', async () => {
    const next = new Date('2026-09-11T00:00:00Z');
    const { service } = buildService({
      usage: [
        { reportDate: day, serviceType: 'TeleCare', totalSessions: 3 },
        { reportDate: next, serviceType: 'TeleCare', totalSessions: 5 },
      ],
    });

    const { data } = await service.getAnalyticsUsage('30d');
    expect(data.map((d) => [d.date, d.teleCare])).toEqual([['2026-09-10', 3], ['2026-09-11', 5]]);
  });

  it('returns an empty series instead of throwing when the aggregate table read fails', async () => {
    const { service, prisma } = buildService();
    prisma.serviceUsageDaily.findMany.mockRejectedValue(new Error('relation does not exist'));

    await expect(service.getAnalyticsUsage('30d')).resolves.toEqual({ data: [] });
  });

  it('reports revenue per gateway from net kobo, matching the null-serviceType rows the cron writes', async () => {
    const { service } = buildService({
      revenue: [{ reportDate: day, serviceType: null, gateway: 'Paystack', netRevenueKobo: 800000n }],
    });

    const { data } = await service.getAnalyticsRevenue('30d');
    expect(data).toEqual([{ date: '2026-09-10', amount: 800000, gateway: 'Paystack' }]);
  });
});
