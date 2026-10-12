import { UserRole } from '@prisma/client';
import { AppointmentsService } from './appointments.service';

const signed = (u: string | null | undefined) => (u ? `signed:${u}` : null);

function build() {
  const prisma: any = {
    appointment: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    providerServiceGroup: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const s3 = {
    signStoredUrl: jest.fn(async (u: string | null | undefined) => signed(u)),
    withSignedPhoto: jest.fn(async (r: any) => (r ? { ...r, profilePhotoUrl: signed(r.profilePhotoUrl) } : r)),
  };
  const service = new AppointmentsService(prisma, {} as any, {} as any, {} as any, {} as any, s3 as any);
  return { service, prisma };
}

const admin = { sub: 'admin-1', role: UserRole.admin } as any;

describe('AppointmentsService avatars', () => {
  it('booking picker signs provider photos', async () => {
    const { service, prisma } = build();
    prisma.providerServiceGroup.findMany.mockResolvedValue([
      {
        priority: 1,
        shiftAssignments: [],
        provider: { id: 'p1', firstName: 'A', lastName: 'B', deletedAt: null, verifiedAt: new Date(), profilePhotoUrl: 'raw-url' },
      },
    ]);
    const res = await service.listAvailableProviders('telecare' as any);
    expect(res[0].profilePhotoUrl).toBe('signed:raw-url');
  });

  it('findAll signs patient and provider photos and keeps patient gender', async () => {
    const { service, prisma } = build();
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'a1',
        patient: { id: 'pt', gender: 'Female', profilePhotoUrl: 'pt-raw' },
        provider: { id: 'pr', profilePhotoUrl: 'pr-raw' },
      },
      { id: 'a2', patient: { id: 'pt', gender: 'Male', profilePhotoUrl: null }, provider: null },
    ]);
    const res = await service.findAll({} as any, admin);
    expect(res.data[0].patient?.profilePhotoUrl).toBe('signed:pt-raw');
    expect(res.data[0].patient?.gender).toBe('Female');
    expect(res.data[0].provider?.profilePhotoUrl).toBe('signed:pr-raw');
    expect(res.data[1].provider).toBeNull();
  });

  it('findOne signs the embedded people', async () => {
    const { service, prisma } = build();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'a1',
      providerId: 'pr',
      patient: { id: 'pt', userId: 'u', profilePhotoUrl: 'pt-raw' },
      provider: { id: 'pr', profilePhotoUrl: 'pr-raw' },
    });
    const res = await service.findOne('a1', admin);
    expect(res.provider?.profilePhotoUrl).toBe('signed:pr-raw');
    expect(res.patient?.profilePhotoUrl).toBe('signed:pt-raw');
  });
});
