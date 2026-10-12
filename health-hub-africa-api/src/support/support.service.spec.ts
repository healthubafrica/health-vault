import { SupportService } from './support.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('SupportService internal notes', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma: any = { supportTicket: { findUnique, findMany } };
  const service = new SupportService(prisma, { signStoredUrl: async (u: any) => u } as any);
  const patient = { sub: 'u1', role: UserRole.patient } as any;
  const staff = { sub: 's1', role: UserRole.admin } as any;

  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockClear();
    findUnique.mockResolvedValue({ id: 't1', submittedBy: 'u1', messages: [] });
  });

  it('excludes isInternal messages for a patient (server-side where)', async () => {
    await service.findOne('t1', patient);
    expect(findUnique.mock.calls[0][0].include.messages.where).toEqual({ isInternal: false });
  });

  it('keeps internal messages for staff', async () => {
    await service.findOne('t1', staff);
    expect(findUnique.mock.calls[0][0].include.messages.where).toBeUndefined();
  });

  it('still forbids other patients', async () => {
    await expect(service.findOne('t1', { sub: 'u2', role: UserRole.patient } as any)).rejects.toThrow(ForbiddenException);
  });

  it('list counts only public messages for a patient', async () => {
    await service.findAll(patient);
    expect(findMany.mock.calls[0][0].include._count.select.messages).toEqual({ where: { isInternal: false } });
    await service.findAll(staff);
    expect(findMany.mock.calls[1][0].include._count.select.messages).toBe(true);
  });

  it('list exposes signed submitter/assignee photos and patient gender without raw stored URLs', async () => {
    findMany.mockResolvedValueOnce([
      {
        id: 't1',
        submitter: {
          email: 'a@b.com', profilePhotoUrl: 'user-raw',
          patient: { firstName: 'A', lastName: 'B', gender: 'Female', profilePhotoUrl: 'patient-raw' },
          provider: null,
        },
        assignee: {
          email: 's@b.com', profilePhotoUrl: 'staff-raw', patient: null, provider: null,
        },
      },
    ]);
    const [t] = await service.findAll(staff);
    expect(t.submitter?.profilePhotoUrl).toBe('patient-raw');
    expect(t.submitter?.patient?.gender).toBe('Female');
    expect(t.assignee?.profilePhotoUrl).toBe('staff-raw');
    expect(t.userProfilePhotoUrl).toBe('patient-raw');
    expect(t.userGender).toBe('Female');
    expect(JSON.stringify(t.submitter?.patient)).not.toContain('patient-raw');
  });
});
