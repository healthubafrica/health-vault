import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';

const user = { sub: 'user-1', role: 'patient' } as any;

function build(patient: any) {
  const prisma: any = {
    patient: {
      findUnique: jest.fn().mockResolvedValue(patient),
      updateMany: jest.fn().mockResolvedValue({ count: patient ? 1 : 0 }),
    },
    emergencyContact: { count: jest.fn().mockResolvedValue(0) },
    clinicalRecord: { count: jest.fn().mockResolvedValue(0) },
    appointment: { count: jest.fn().mockResolvedValue(0) },
  };
  const service = new PatientsService(prisma, {} as any, { get: jest.fn(), getOrThrow: jest.fn(() => 'x') } as any, {} as any, {} as any, {} as any);
  return { service, prisma };
}

const newPatient = {
  id: 'p1', bloodGroup: null, genotype: null, nextOfKinPhone: null,
  portalTourCompletedAt: null, gettingStartedDismissedAt: null,
  user: { twoFactorEnabled: false },
};

describe('PatientsService getting started', () => {
  it('reports a brand-new patient as having nothing done and the tour pending', async () => {
    const { service } = build(newPatient);
    const { data } = await service.getGettingStarted(user);
    expect(data.tourCompleted).toBe(false);
    expect(data.dismissed).toBe(false);
    expect(data.items.every((i) => !i.done)).toBe(true);
    expect(data.items.map((i) => i.key)).toEqual([
      'health-profile', 'emergency-contact', 'upload-record', 'book-appointment', 'two-factor',
    ]);
  });

  it('marks items done from the patient record and counts', async () => {
    const { service, prisma } = build({
      ...newPatient, bloodGroup: 'O_pos', genotype: 'AA', portalTourCompletedAt: new Date(),
      user: { twoFactorEnabled: true },
    });
    prisma.emergencyContact.count.mockResolvedValue(1);
    prisma.clinicalRecord.count.mockResolvedValue(2);
    const { data } = await service.getGettingStarted(user);
    expect(data.tourCompleted).toBe(true);
    expect(Object.fromEntries(data.items.map((i) => [i.key, i.done]))).toEqual({
      'health-profile': true, 'emergency-contact': true, 'upload-record': true,
      'book-appointment': false, 'two-factor': true,
    });
    // Only the patient's own uploads count, not provider-added records.
    expect(prisma.clinicalRecord.count).toHaveBeenCalledWith({ where: { patientId: 'p1', source: 'patient_upload' } });
  });

  it('needs both blood group and genotype for the health profile item', async () => {
    const { service } = build({ ...newPatient, bloodGroup: 'A_pos' });
    const { data } = await service.getGettingStarted(user);
    expect(data.items.find((i) => i.key === 'health-profile')!.done).toBe(false);
  });

  it('only stamps the flags that were sent, scoped to the caller', async () => {
    const { service, prisma } = build(newPatient);
    await service.updateGettingStarted({ tourCompleted: true }, user);
    const { where, data } = prisma.patient.updateMany.mock.calls[0][0];
    expect(where).toEqual({ userId: 'user-1' });
    expect(data.portalTourCompletedAt).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty('gettingStartedDismissedAt');
  });

  it('404s for accounts without a patient profile', async () => {
    const { service } = build(null);
    await expect(service.getGettingStarted(user)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateGettingStarted({ dismissed: true }, user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
