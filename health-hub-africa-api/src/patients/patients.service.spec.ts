import { PatientsService } from './patients.service';
import { UserRole } from '@prisma/client';

// First tests for this service — scoped to the new declared-country field
// (create/update), not full coverage of everything else it does.
function buildService(overrides: { existingPatient?: unknown; findUniqueForUpdate?: unknown } = {}) {
  const prisma = {
    patient: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(overrides.findUniqueForUpdate ?? null)),
      create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'patient-1', ...data }),
      ),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'patient-1', ...data }),
      ),
      findFirst: jest.fn().mockResolvedValue(null), // no prior HHA id this month
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const notifications = {};
  const config = { get: jest.fn().mockReturnValue(undefined), getOrThrow: jest.fn().mockReturnValue('hha-bucket') };
  const openemr = { enqueuePatientSync: jest.fn().mockResolvedValue(undefined) };
  const storage = {};
  const service = new PatientsService(prisma as any, notifications as any, config as any, openemr as any, storage as any);
  return { service, prisma };
}

const currentUser = { sub: 'user-1', role: UserRole.patient } as any;

describe('PatientsService.create — declared country', () => {
  it('derives country/regionCode from countryCode when the patient explicitly chose one', async () => {
    const { service, prisma } = buildService();

    const result = await service.create(
      { firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', gender: 'Male', bloodGroup: 'O_PLUS', countryCode: 'gb' } as any,
      currentUser,
    );

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ country: 'United Kingdom', countryCode: 'GB' }) }),
    );
    expect(result.country).toBe('United Kingdom');
    expect(result.countryCode).toBe('GB');
  });

  it('defaults to Nigeria with countryCode left null when nothing was declared', async () => {
    const { service, prisma } = buildService();

    await service.create(
      { firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', gender: 'Male', bloodGroup: 'O_PLUS' } as any,
      currentUser,
    );

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ country: 'Nigeria', countryCode: undefined }) }),
    );
  });

  it('ignores a legacy free-text country field — only countryCode marks a declaration', async () => {
    const { service, prisma } = buildService();

    await service.create(
      { firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', gender: 'Male', bloodGroup: 'O_PLUS', country: 'Atlantis' } as any,
      currentUser,
    );

    // The free-text value passes through for backward compatibility (still used for HHA id/region),
    // but countryCode — the actual declaration flag — stays unset.
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ country: 'Atlantis', countryCode: undefined }) }),
    );
  });
});

describe('PatientsService.update — declared country', () => {
  it('sets countryCode (and the derived country name) when the patient declares one later', async () => {
    const { service, prisma } = buildService({ findUniqueForUpdate: { id: 'patient-1', userId: 'user-1' } });

    await service.update('patient-1', { countryCode: 'ke' } as any, currentUser);

    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ country: 'Kenya', countryCode: 'KE' }) }),
    );
  });

  it('leaves countryCode undefined (unchanged) when the update omits it', async () => {
    const { service, prisma } = buildService({ findUniqueForUpdate: { id: 'patient-1', userId: 'user-1' } });

    await service.update('patient-1', { city: 'Nairobi' } as any, currentUser);

    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ countryCode: undefined, country: undefined }) }),
    );
  });
});
