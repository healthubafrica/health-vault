import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RecordsService } from './records.service';

const patientUser = { sub: 'user-1', role: UserRole.patient } as any;

function build(overrides: { prescription?: unknown; existingAlert?: unknown } = {}) {
  const prisma = {
    patient: { findUnique: jest.fn().mockResolvedValue({ id: 'patient-1' }) },
    prescription: {
      findFirst: jest.fn().mockResolvedValue(overrides.prescription ?? null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    adminAlert: {
      findFirst: jest.fn().mockResolvedValue(overrides.existingAlert ?? null),
      create: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    },
  };
  const service = new RecordsService(prisma as any, {} as any, {} as any, {} as any);
  return { service, prisma };
}

describe('RecordsService.requestRefill', () => {
  const rx = { id: 'rx-1', drugName: 'Metformin', dosage: '500mg', patientId: 'patient-1' };

  it('refuses a prescription that is not the callers', async () => {
    const { service, prisma } = build({ prescription: null });
    await expect(service.requestRefill('rx-1', patientUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
  });

  it('raises one care-team alert carrying the prescription reference', async () => {
    const { service, prisma } = build({ prescription: rx });
    const result = await service.requestRefill('rx-1', patientUser);

    expect(result).toEqual({ requested: true, alreadyRequested: false });
    expect(prisma.adminAlert.create).toHaveBeenCalledTimes(1);
    const data = prisma.adminAlert.create.mock.calls[0][0].data;
    expect(data.type).toBe('refill_request');
    expect(data.metadata).toMatchObject({ prescriptionId: 'rx-1', patientId: 'patient-1' });
  });

  it('does not create a duplicate while a request is still open', async () => {
    const { service, prisma } = build({ prescription: rx, existingAlert: { id: 'old' } });
    const result = await service.requestRefill('rx-1', patientUser);

    expect(result).toEqual({ requested: true, alreadyRequested: true });
    expect(prisma.adminAlert.create).not.toHaveBeenCalled();
  });
});

describe('RecordsService.findPrescriptions', () => {
  it('includes the prescribing provider so the app can show who issued it', async () => {
    const { service, prisma } = build();
    await service.findPrescriptions(undefined, patientUser);
    expect(prisma.prescription.findMany.mock.calls[0][0].include.provider).toBeDefined();
  });
});
