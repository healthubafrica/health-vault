import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProvidersService } from './providers.service';

const BASE = 'https://hha-bucket.s3.us-east-1.amazonaws.com/';
const OWN = `${BASE}profile-photos/prov-user/p.webp`;
const signed = (u: string | null | undefined) => (u ? `signed:${u}` : null);

function build() {
  const prisma: any = {
    provider: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const openemr = { enqueueProviderSync: jest.fn().mockResolvedValue(undefined) };
  const s3 = {
    publicUrlFor: (k: string) => `${BASE}${k}`,
    withSignedPhoto: jest.fn(async (r: any) => (r ? { ...r, profilePhotoUrl: signed(r.profilePhotoUrl) } : r)),
  };
  const service = new ProvidersService(prisma, openemr as any, s3 as any);
  return { service, prisma };
}

const owner = { sub: 'prov-user', role: UserRole.provider } as any;

describe('ProvidersService avatar signing', () => {
  it('findAll signs each photo', async () => {
    const { service, prisma } = build();
    prisma.provider.findMany.mockResolvedValue([{ id: '1', profilePhotoUrl: OWN }]);
    const res = await service.findAll({} as any);
    expect(res.data[0].profilePhotoUrl).toBe(`signed:${OWN}`);
  });

  it('findOne and findMyProfile sign the photo', async () => {
    const { service, prisma } = build();
    prisma.provider.findUnique.mockResolvedValue({ id: '1', userId: 'prov-user', profilePhotoUrl: OWN });
    expect((await service.findOne('1')).profilePhotoUrl).toBe(`signed:${OWN}`);
    expect((await service.findMyProfile(owner)).profilePhotoUrl).toBe(`signed:${OWN}`);
  });

  it('update signs the response, validates ownership and mirrors the photo to the user row', async () => {
    const { service, prisma } = build();
    prisma.provider.findUnique.mockResolvedValue({ id: '1', userId: 'prov-user', firstName: 'A', lastName: 'B', title: 'Dr.' });
    prisma.provider.update.mockResolvedValue({ id: '1', profilePhotoUrl: OWN });
    const res = await service.update('1', { profilePhotoUrl: OWN } as any, owner);
    expect(res.profilePhotoUrl).toBe(`signed:${OWN}`);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'prov-user' }, data: { profilePhotoUrl: OWN } });
  });

  it('update rejects a photo URL outside the profile owner folder', async () => {
    const { service, prisma } = build();
    prisma.provider.findUnique.mockResolvedValue({ id: '1', userId: 'prov-user', firstName: 'A', lastName: 'B', title: 'Dr.' });
    await expect(
      service.update('1', { profilePhotoUrl: 'https://tracker.example/pixel.png' } as any, owner),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update('1', { profilePhotoUrl: `${BASE}profile-photos/other-user/p.webp` } as any, owner),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });

  it('create rejects a photo URL not under the target user folder', async () => {
    const { service } = build();
    await expect(
      service.create(
        { userId: 'target', profilePhotoUrl: 'https://tracker.example/pixel.png' } as any,
        { sub: 'admin-1', role: UserRole.admin } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
