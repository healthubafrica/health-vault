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
      prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
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
