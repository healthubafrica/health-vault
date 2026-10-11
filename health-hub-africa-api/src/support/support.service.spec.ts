import { SupportService } from './support.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('SupportService internal notes', () => {
  const findUnique = jest.fn();
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma: any = { supportTicket: { findUnique, findMany } };
  const service = new SupportService(prisma);
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
});
