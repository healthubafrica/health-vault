import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LabsService } from './labs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService } from '../openemr/openemr.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

// Regression coverage for the integration remediation plan's negative
// authorization test: "Patient 16 must never retrieve Patient 17 data by
// modifying a request parameter" — applied here to lab orders, and to the
// specific gap the fix closes: a provider with no assignment to the patient
// used to bypass the ownership check entirely (role alone was treated as
// authorization). RecordsService already enforced the assignment check
// correctly; LabsService now matches it.

const mockPrisma = {
  labOrder: { findUnique: jest.fn() },
  patientProviderAssignment: { findFirst: jest.fn() },
};

function buildService() {
  return new LabsService(
    mockPrisma as unknown as PrismaService,
    {} as OpenemrService,
    {} as NotificationsService,
  );
}

const order = {
  id: 'order-1',
  patientId: 'patient-16',
  patient: { userId: 'user-16' },
  results: [],
};

describe('LabsService.findOrder — authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows the owning patient to read their own order', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(order);
    const service = buildService();
    const patient16: JwtPayload = { sub: 'user-16', email: 'p16@test.com', role: 'patient' };

    await expect(service.findOrder('order-1', patient16)).resolves.toEqual(order);
  });

  it('denies a different patient (Patient 17 cannot read Patient 16 data)', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(order);
    const service = buildService();
    const patient17: JwtPayload = { sub: 'user-17', email: 'p17@test.com', role: 'patient' };

    await expect(service.findOrder('order-1', patient17)).rejects.toThrow(ForbiddenException);
  });

  it('denies a provider who is not assigned to this patient', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(order);
    mockPrisma.patientProviderAssignment.findFirst.mockResolvedValue(null);
    const service = buildService();
    const unassignedProvider: JwtPayload = {
      sub: 'user-doc', email: 'doc@test.com', role: 'provider', providerId: 'provider-99',
    };

    await expect(service.findOrder('order-1', unassignedProvider)).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.patientProviderAssignment.findFirst).toHaveBeenCalledWith({
      where: { patientId: 'patient-16', providerId: 'provider-99', unassignedAt: null },
    });
  });

  it('allows a provider actively assigned to this patient', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(order);
    mockPrisma.patientProviderAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });
    const service = buildService();
    const assignedProvider: JwtPayload = {
      sub: 'user-doc', email: 'doc@test.com', role: 'provider', providerId: 'provider-1',
    };

    await expect(service.findOrder('order-1', assignedProvider)).resolves.toEqual(order);
  });

  it('allows admin regardless of assignment', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(order);
    const service = buildService();
    const admin: JwtPayload = { sub: 'user-admin', email: 'admin@test.com', role: 'admin' };

    await expect(service.findOrder('order-1', admin)).resolves.toEqual(order);
    expect(mockPrisma.patientProviderAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a missing order (not a 403 — avoids leaking existence)', async () => {
    mockPrisma.labOrder.findUnique.mockResolvedValue(null);
    const service = buildService();
    const patient16: JwtPayload = { sub: 'user-16', email: 'p16@test.com', role: 'patient' };

    await expect(service.findOrder('missing', patient16)).rejects.toThrow(NotFoundException);
  });
});
