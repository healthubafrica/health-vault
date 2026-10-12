import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PatientsService } from './patients.service';
import { realPhotoResolvers } from '../storage/s3.test-helper';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

const mockPipeline: { order: string[] } = { order: [] };
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const order: string[] = [];
    mockPipeline.order = order;
    const p: any = {
      rotate: jest.fn(() => { order.push('rotate'); return p; }),
      extract: jest.fn(() => { order.push('extract'); return p; }),
      resize: jest.fn(() => { order.push('resize'); return p; }),
      webp: jest.fn(() => p),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('img')),
    };
    return p;
  }),
}));

const USER = 'user-1';
const BASE = 'https://hha-bucket.s3.us-east-1.amazonaws.com/';
const OWN_URL = `${BASE}profile-photos/${USER}/old.webp`;
const signed = (u: string | null | undefined) => (u ? `signed:${u}` : null);

function build() {
  const prisma: any = {
    patient: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    provider: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    appointment: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const config = { get: jest.fn((_k: string, d?: string) => d), getOrThrow: jest.fn().mockReturnValue('hha-bucket') };
  const openemr = { enqueuePatientSync: jest.fn().mockResolvedValue(undefined) };
  const s3Service = {
    ...realPhotoResolvers(),
    signStoredUrl: jest.fn(async (u: string | null | undefined) => signed(u)),
    withSignedPhoto: jest.fn(async (r: any) => (r ? { ...r, profilePhotoUrl: signed(r.profilePhotoUrl) } : r)),
  };
  const service = new PatientsService(prisma, {} as any, config as any, openemr as any, {} as any, s3Service as any);
  const send = jest.fn().mockImplementation(async () => ({
    Body: (async function* () { yield new Uint8Array([1]); })(),
  }));
  (service as any).s3 = { send };
  return { service, prisma, s3Service, send };
}

const admin = { sub: 'admin-1', role: UserRole.admin } as any;
const me = { sub: USER, role: UserRole.patient } as any;

describe('PatientsService avatar signing', () => {
  it('findAll signs every row photo', async () => {
    const { service, prisma } = build();
    prisma.patient.findMany.mockResolvedValue([{ id: 'a', profilePhotoUrl: OWN_URL }, { id: 'b', profilePhotoUrl: null }]);
    prisma.patient.count.mockResolvedValue(2);
    const res = await service.findAll({} as any, admin);
    expect(res.data.map((r: any) => r.profilePhotoUrl)).toEqual([`signed:${OWN_URL}`, null]);
  });

  it('findOne signs the photo', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'a', userId: USER, profilePhotoUrl: OWN_URL });
    const res = await service.findOne('a', me);
    expect(res.profilePhotoUrl).toBe(`signed:${OWN_URL}`);
  });

  it('findMyCareTeam signs provider photos', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1' });
    prisma.appointment.findMany.mockResolvedValue([
      { providerId: 'pr1', scheduledAt: new Date(), status: 'completed', provider: { id: 'pr1', profilePhotoUrl: OWN_URL } },
    ]);
    const [member] = await service.findMyCareTeam(me);
    expect(member.profilePhotoUrl).toBe(`signed:${OWN_URL}`);
    expect(member.visitCount).toBe(1);
  });
});

describe('PatientsService.processProfilePhoto', () => {
  it('auto-orients (EXIF) before crop and resize, and mirrors to user and provider rows', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', profilePhotoUrl: OWN_URL });
    await service.processProfilePhoto(
      { objectKey: `profile-photos/${USER}/raw.jpg`, cropLeft: 1, cropTop: 2, cropWidth: 3, cropHeight: 4 } as any,
      me,
    );
    expect(mockPipeline.order).toEqual(['rotate', 'extract', 'resize']);
    expect(prisma.provider.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER } }));
    expect(prisma.user.update).toHaveBeenCalled();
  });
});

describe('PatientsService.removeProfilePhoto', () => {
  it('clears user and provider rows even when the patient row has no photo (user-level photo only)', async () => {
    const { service, prisma, send } = build();
    prisma.patient.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ profilePhotoUrl: OWN_URL });
    await expect(service.removeProfilePhoto(me)).resolves.toEqual({ message: 'Profile photo removed' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: USER }, data: { profilePhotoUrl: null } });
    expect(prisma.provider.updateMany).toHaveBeenCalledWith({ where: { userId: USER }, data: { profilePhotoUrl: null } });
    expect(send).not.toHaveBeenCalled(); // stored file is kept
  });

  it('never deletes the stored object, including the caller own one', async () => {
    const { service, prisma, send } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', profilePhotoUrl: OWN_URL });
    prisma.user.findUnique.mockResolvedValue({ profilePhotoUrl: null });
    await service.removeProfilePhoto(me);
    expect(send).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('rejects when no photo exists anywhere', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', profilePhotoUrl: null });
    prisma.user.findUnique.mockResolvedValue({ profilePhotoUrl: null });
    await expect(service.removeProfilePhoto(me)).rejects.toThrow(BadRequestException);
  });
});

describe('PatientsService photo preservation', () => {
  it('replacing a photo never deletes the previous object (only the staging upload)', async () => {
    const { service, prisma, send } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', profilePhotoUrl: OWN_URL });
    await service.processProfilePhoto(
      { objectKey: `profile-photos/${USER}/raw.jpg`, cropLeft: 1, cropTop: 2, cropWidth: 3, cropHeight: 4 } as any,
      me,
    );
    const deleted = send.mock.calls
      .map(([cmd]: any) => cmd)
      .filter((cmd: any) => cmd?.constructor?.name === 'DeleteObjectCommand')
      .map((cmd: any) => cmd.input.Key);
    expect(deleted).toEqual([`profile-photos/${USER}/raw.jpg`]);
  });

  it('update accepts the existing stored value (raw or signed) and does not rewrite the photo', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({
      id: 'pat-1', userId: USER, profilePhotoUrl: OWN_URL, user: { profilePhotoUrl: OWN_URL },
    });
    prisma.patient.update.mockResolvedValue({ id: 'pat-1', profilePhotoUrl: OWN_URL });
    await service.update('pat-1', { profilePhotoUrl: `${OWN_URL}?X-Amz-Signature=abc` } as any, me);
    expect(prisma.patient.update.mock.calls[0][0].data.profilePhotoUrl).toBeUndefined();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('update without a photo field never resets the photo', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({
      id: 'pat-1', userId: USER, profilePhotoUrl: OWN_URL, user: { profilePhotoUrl: OWN_URL },
    });
    prisma.patient.update.mockResolvedValue({ id: 'pat-1' });
    await service.update('pat-1', { firstName: 'Z' } as any, me);
    expect(prisma.patient.update.mock.calls[0][0].data.profilePhotoUrl).toBeUndefined();
  });

  it('update still rejects a NEW photo outside the owner folder', async () => {
    const { service, prisma } = build();
    prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', userId: USER, profilePhotoUrl: OWN_URL, user: null });
    await expect(
      service.update('pat-1', { profilePhotoUrl: `${BASE}profile-photos/someone-else/x.webp` } as any, me),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Patient DTO gender', () => {
  const base = { firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', bloodGroup: 'O_PLUS' };
  const values = ['Male', 'Female', 'Other', 'Prefer_not_to_say'];

  it.each(values)('CreatePatientDto accepts %s', async (gender) => {
    const errors = await validate(plainToInstance(CreatePatientDto, { ...base, gender }));
    expect(errors.filter((e) => e.property === 'gender')).toHaveLength(0);
  });

  it.each(values)('UpdatePatientDto accepts %s', async (gender) => {
    const errors = await validate(plainToInstance(UpdatePatientDto, { gender }));
    expect(errors.filter((e) => e.property === 'gender')).toHaveLength(0);
  });

  it('rejects unknown values', async () => {
    const errors = await validate(plainToInstance(UpdatePatientDto, { gender: 'Prefer not to say' }));
    expect(errors.some((e) => e.property === 'gender')).toBe(true);
  });
});
