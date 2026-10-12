import { AdminService } from './admin.service';

const signed = (u: string | null | undefined) => (u ? `signed:${u}` : null);

function build(prisma: unknown) {
  const s3 = { signStoredUrl: jest.fn(async (u: string | null | undefined) => signed(u)) };
  const analytics = { getEngagementScore: jest.fn().mockResolvedValue({ data: {} }) };
  return new AdminService(
    prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never,
    s3 as never, {} as never, analytics as never, {} as never,
  );
}

describe('AdminService.getUser avatar', () => {
  const raw = {
    id: 'u1', email: 'a@b.com', phone: null, role: 'patient', isActive: true, isVerified: true,
    lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(),
    profilePhotoUrl: 'user-raw',
    patient: {
      id: 'p1', hhaPatientId: 'HHA-1', firstName: 'Ada', lastName: 'Obi', gender: 'Prefer_not_to_say',
      profilePhotoUrl: 'patient-raw', openemrSyncStatus: 'synced', openemrPatientUuid: null, subscriptions: [],
    },
    provider: null,
  };

  it('returns a signed photo (patient row wins) and the patient gender', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(raw) } };
    const { data } = await build(prisma).getUser('u1');
    expect(data.profilePhotoUrl).toBe('signed:patient-raw');
    expect(data.gender).toBe('Prefer_not_to_say');
    // raw role-row photo must not leak through the nested patient object
    expect(JSON.stringify(data.patient)).not.toContain('patient-raw');
  });

  it('falls back to the user-level photo and null gender for non-patients', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ ...raw, patient: null }) } };
    const { data } = await build(prisma).getUser('u1');
    expect(data.profilePhotoUrl).toBe('signed:user-raw');
    expect(data.gender).toBeNull();
  });
});

describe('AdminService.listUsers avatar', () => {
  it('exposes patient gender alongside the signed photo', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1', email: 'a@b.com', phone: null, fullName: null, role: 'patient', isActive: true,
            isVerified: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(),
            profilePhotoUrl: null, onboardingProgress: null, provider: null,
            patient: { id: 'p1', firstName: 'A', lastName: 'B', hhaPatientId: 'H', openemrPatientUuid: null, profilePhotoUrl: 'raw', gender: 'Female', subscriptions: [] },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const res = await build(prisma).listUsers(1, 20);
    expect(res.data[0]).toMatchObject({ gender: 'Female', profilePhotoUrl: 'signed:raw' });
  });
});

describe('AdminService.listPatients avatar', () => {
  it('signs photo and exposes gender', async () => {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1', hhaPatientId: 'H', firstName: 'A', lastName: 'B', gender: 'Male', profilePhotoUrl: 'raw',
            profilePhotoSizeBytes: null, storageQuotaOverrideBytes: null, user: { email: 'e', phone: null },
            subscriptions: [], createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      clinicalRecord: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const res = await build(prisma).listPatients(1, 20);
    expect(res.data[0]).toMatchObject({ gender: 'Male', profilePhotoUrl: 'signed:raw' });
  });
});
