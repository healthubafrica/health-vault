import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmergencyContactsService } from './emergency-contacts.service';

function build(overrides: Record<string, any> = {}) {
  const emergencyContact = {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
    update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
    delete: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  const prisma: any = { emergencyContact, $transaction: jest.fn((fn: any) => fn(prisma)) };
  return { service: new EmergencyContactsService(prisma), emergencyContact };
}

describe('EmergencyContactsService', () => {
  const dto = { fullName: 'Ada Obi', relationship: 'Sister', phone: '+2348012345678' };

  it('lists only the callers contacts', async () => {
    const { service, emergencyContact } = build();
    await service.list('p1');
    expect(emergencyContact.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patientId: 'p1' } }));
  });

  it('makes the first contact primary automatically', async () => {
    const { service, emergencyContact } = build();
    await service.create('p1', dto);
    expect(emergencyContact.create.mock.calls[0][0].data).toMatchObject({ patientId: 'p1', isPrimary: true });
  });

  it('demotes the previous primary when a new primary is chosen', async () => {
    const { service, emergencyContact } = build({ count: jest.fn().mockResolvedValue(2) });
    await service.create('p1', { ...dto, isPrimary: true });
    expect(emergencyContact.updateMany).toHaveBeenCalledWith({
      where: { patientId: 'p1', isPrimary: true },
      data: { isPrimary: false },
    });
  });

  it('caps contacts per patient', async () => {
    const { service } = build({ count: jest.fn().mockResolvedValue(5) });
    await expect(service.create('p1', dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to update a contact owned by someone else', async () => {
    const { service } = build({ findFirst: jest.fn().mockResolvedValue(null) });
    await expect(service.update('p1', 'other', { phone: '1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to delete a contact owned by someone else', async () => {
    const { service, emergencyContact } = build({ findFirst: jest.fn().mockResolvedValue(null) });
    await expect(service.remove('p1', 'other')).rejects.toBeInstanceOf(NotFoundException);
    expect(emergencyContact.delete).not.toHaveBeenCalled();
  });
});
