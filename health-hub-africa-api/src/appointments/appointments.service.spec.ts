import { AppointmentsService } from './appointments.service';

// resolveOpsRecipients only touches Prisma, so this constructs the service
// directly with a minimal mocked Prisma (matching notifications.service.spec.ts's
// pattern) rather than a full Nest TestingModule — openemrService, notifications,
// and reminderQueue are never exercised by this method.
function buildService(mockPrisma: any) {
  return new AppointmentsService(
    mockPrisma,
    {} as any,
    {} as any,
    {} as any,
  );
}

describe('AppointmentsService.resolveOpsRecipients', () => {
  it('returns global recipients when providerId is null (no provider query)', async () => {
    const providerFindMany = jest.fn();
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
      providerNotificationEmail: { findMany: providerFindMany },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients(null);

    expect(result).toEqual([{ email: 'ops@example.com' }]);
    expect(providerFindMany).not.toHaveBeenCalled();
  });

  it('merges global and provider-specific recipients', async () => {
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
      providerNotificationEmail: { findMany: jest.fn().mockResolvedValue([{ email: 'nurse@example.com' }]) },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients('provider-1');

    expect(result).toEqual([{ email: 'ops@example.com' }, { email: 'nurse@example.com' }]);
  });

  it('dedupes case-insensitively when the same address appears in both lists', async () => {
    const prisma = {
      notificationRecipient: { findMany: jest.fn().mockResolvedValue([{ email: 'Ops@Example.com' }]) },
      providerNotificationEmail: { findMany: jest.fn().mockResolvedValue([{ email: 'ops@example.com' }]) },
    };
    const service = buildService(prisma);

    const result = await (service as any).resolveOpsRecipients('provider-1');

    expect(result).toEqual([{ email: 'Ops@Example.com' }]);
  });

  it('queries only active recipients', async () => {
    const globalFindMany = jest.fn().mockResolvedValue([]);
    const providerFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      notificationRecipient: { findMany: globalFindMany },
      providerNotificationEmail: { findMany: providerFindMany },
    };
    const service = buildService(prisma);

    await (service as any).resolveOpsRecipients('provider-1');

    expect(globalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(providerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { providerId: 'provider-1', isActive: true } }),
    );
  });
});
