import { BadRequestException, ConflictException } from '@nestjs/common';
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

describe('AppointmentsService.create (idempotency + double-booking)', () => {
  const currentUser = { sub: 'user-1', role: 'patient' } as any;
  const baseDto = {
    appointmentType: 'virtual' as const,
    scheduledAt: '2026-10-01T09:00:00.000Z',
    durationMinutes: 30,
  };
  const savedAppointment = {
    id: 'appt-1',
    patientId: 'patient-1',
    providerId: null,
    scheduledAt: new Date(baseDto.scheduledAt),
  };

  // findUnique is used for both the idempotency-key lookup (where.idempotencyKey)
  // and the fire-and-forget notifyAppointmentEvent's own read (where.id) — this
  // routes each call correctly regardless of order without over-mocking.
  function buildService(overrides: {
    existingByKey?: unknown;
    findManyResult?: unknown[];
    createImpl?: (data: unknown) => unknown;
  } = {}) {
    const prisma = {
      patient: { findUnique: jest.fn().mockResolvedValue({ id: 'patient-1' }) },
      appointment: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { idempotencyKey?: string; id?: string } }) =>
          where.idempotencyKey ? overrides.existingByKey ?? null : null,
        ),
        findUniqueOrThrow: jest.fn().mockResolvedValue(savedAppointment),
        findFirst: jest.fn().mockResolvedValue(null), // generateAppointmentRef: no prior ref this year
        findMany: jest.fn().mockResolvedValue(overrides.findManyResult ?? []),
        create: jest.fn().mockImplementation(
          overrides.createImpl ?? (({ data }: { data: unknown }) => ({ ...savedAppointment, ...(data as object) })),
        ),
      },
    };
    const openemrService = { enqueueEncounterSync: jest.fn().mockResolvedValue(undefined) };
    const notifications = {};
    const service = new AppointmentsService(prisma as any, openemrService as any, notifications as any, {} as any);
    return { service, prisma };
  }

  it('rejects a malformed Idempotency-Key before touching the database', async () => {
    const { service, prisma } = buildService();
    await expect(service.create(baseDto, currentUser, 'has spaces!')).rejects.toThrow(BadRequestException);
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('replays the existing appointment when the same key is reused for the same request', async () => {
    const existing = { ...savedAppointment };
    const { service, prisma } = buildService({ existingByKey: existing });

    const result = await service.create(baseDto, currentUser, 'retry-key-1');

    expect(result).toBe(existing);
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('rejects a key reused for a genuinely different request', async () => {
    const existing = { ...savedAppointment, scheduledAt: new Date('2026-10-02T09:00:00.000Z') };
    const { service } = buildService({ existingByKey: existing });

    await expect(service.create(baseDto, currentUser, 'retry-key-1')).rejects.toThrow(BadRequestException);
  });

  it('blocks a second unassigned-provider booking overlapping one the patient already has', async () => {
    const { service, prisma } = buildService({
      findManyResult: [{ scheduledAt: new Date(baseDto.scheduledAt), durationMinutes: 30 }],
    });

    await expect(service.create(baseDto, currentUser)).rejects.toThrow(ConflictException);
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('allows the booking when the patient has no overlapping appointment', async () => {
    const { service, prisma } = buildService({ findManyResult: [] });

    const result = await service.create(baseDto, currentUser, 'fresh-key');

    expect(result).toMatchObject({ patientId: 'patient-1' });
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: 'fresh-key' }) }),
    );
  });

  it('replays the winner when a concurrent request wins a create-time idempotency-key race', async () => {
    const { service, prisma } = buildService({
      findManyResult: [],
      createImpl: () => {
        const err: any = new Error('Unique constraint failed');
        err.code = 'P2002';
        err.meta = { target: ['appointments_idempotency_key_key'] };
        throw err;
      },
    });

    const result = await service.create(baseDto, currentUser, 'race-key');

    expect(result).toBe(savedAppointment);
    expect(prisma.appointment.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idempotencyKey: 'race-key' } }),
    );
  });
});
