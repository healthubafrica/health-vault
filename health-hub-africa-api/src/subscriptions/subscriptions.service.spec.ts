import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { BillingCycle } from '../common/enums';

// ----- Mocks ----------------------------------------------------------------

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  patientSubscription: {
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 'sub-new', plan: {} }),
  },
  ...overrides,
});

const mockPrisma = {
  subscriptionPlan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
  patientSubscription: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

// None of the tests below exercise upgrade() (the only method that calls
// paymentsService), so a no-op mock is enough to satisfy the constructor.
const mockPaymentsService = {
  initiate: jest.fn(),
};

// ----- Fixtures -------------------------------------------------------------

const patientUser: JwtPayload = { sub: 'user-p1', email: 'p@test.com', role: 'patient' };
const adminUser: JwtPayload = { sub: 'user-a1', email: 'a@test.com', role: 'admin' };

const plan = { id: 'plan-silver', slug: 'silvercare', isActive: true, displayOrder: 2 };
const patient = { id: 'patient-1' };
const existingSub = { id: 'sub-old', status: 'active' };
const newSub = { id: 'sub-new', plan };

// ----- Tests ----------------------------------------------------------------

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  // ── findPlans ─────────────────────────────────────────────────────────────

  describe('findPlans', () => {
    it('returns active plans ordered by displayOrder', async () => {
      const plans = [plan, { id: 'plan-free', slug: 'free', isActive: true, displayOrder: 0 }];
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue(plans);

      const result = await service.findPlans();

      expect(result).toEqual(plans);
      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
    });
  });

  // ── findPlan ──────────────────────────────────────────────────────────────

  describe('findPlan', () => {
    it('returns a plan when it exists', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const result = await service.findPlan('plan-silver');

      expect(result).toEqual(plan);
    });

    it('throws NotFoundException for an unknown plan id', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.findPlan('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── subscribe ─────────────────────────────────────────────────────────────

  describe('subscribe', () => {
    const dto = { planId: 'plan-silver', billingCycle: BillingCycle.monthly };

    beforeEach(() => {
      mockPrisma.patient.findUnique.mockResolvedValue(patient);
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
      mockPrisma.patientSubscription.findFirst.mockResolvedValue(null);
    });

    it('resolves patient by userId when no patientId is provided', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe(dto, patientUser);

      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { userId: patientUser.sub },
        select: { id: true },
      });
    });

    it('creates a new subscription inside a transaction', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      const result = await service.subscribe(dto, patientUser);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(tx.patientSubscription.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'sub-new' });
    });

    it('cancels an existing active subscription before creating a new one', async () => {
      mockPrisma.patientSubscription.findFirst.mockResolvedValue(existingSub);
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe(dto, patientUser);

      expect(tx.patientSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingSub.id },
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
      expect(tx.patientSubscription.create).toHaveBeenCalled();
    });

    it('does not cancel when no existing subscription exists', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe(dto, patientUser);

      expect(tx.patientSubscription.update).not.toHaveBeenCalled();
    });

    it('sets expiry ~1 month ahead for monthly billing', async () => {
      const tx = makeTx();
      tx.patientSubscription.create.mockImplementation(async ({ data }: any) => ({
        id: 'sub-1',
        ...data,
      }));
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe({ planId: 'plan-silver', billingCycle: BillingCycle.monthly }, patientUser);

      const { startedAt, expiresAt } = tx.patientSubscription.create.mock.calls[0][0].data;
      const diffDays = (new Date(expiresAt).getTime() - new Date(startedAt).getTime()) / 86_400_000;
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThan(40);
    });

    it('sets expiry ~1 year ahead for annual billing', async () => {
      const tx = makeTx();
      tx.patientSubscription.create.mockImplementation(async ({ data }: any) => ({
        id: 'sub-1',
        ...data,
      }));
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe({ planId: 'plan-silver', billingCycle: BillingCycle.annually }, patientUser);

      const { startedAt, expiresAt } = tx.patientSubscription.create.mock.calls[0][0].data;
      const diffDays = (new Date(expiresAt).getTime() - new Date(startedAt).getTime()) / 86_400_000;
      expect(diffDays).toBeGreaterThanOrEqual(365);
      expect(diffDays).toBeLessThan(370);
    });

    it('sets expiry ~3 months ahead for quarterly billing', async () => {
      const tx = makeTx();
      tx.patientSubscription.create.mockImplementation(async ({ data }: any) => ({
        id: 'sub-1',
        ...data,
      }));
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await service.subscribe({ planId: 'plan-silver', billingCycle: BillingCycle.quarterly }, patientUser);

      const { startedAt, expiresAt } = tx.patientSubscription.create.mock.calls[0][0].data;
      const diffDays = (new Date(expiresAt).getTime() - new Date(startedAt).getTime()) / 86_400_000;
      expect(diffDays).toBeGreaterThanOrEqual(85);
      expect(diffDays).toBeLessThan(100);
    });

    it('throws NotFoundException when patient profile is not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.subscribe(dto, patientUser)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when plan is not found', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.subscribe(dto, patientUser)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when a non-admin provides a patientId', async () => {
      await expect(
        service.subscribe({ ...dto, patientId: 'other-patient' }, patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an admin to subscribe on behalf of a patient', async () => {
      const tx = makeTx();
      mockPrisma.$transaction.mockImplementation((fn: Function) => fn(tx));

      await expect(
        service.subscribe({ ...dto, patientId: patient.id }, adminUser),
      ).resolves.toBeDefined();

      expect(mockPrisma.patient.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── findMySubscription ────────────────────────────────────────────────────

  describe('findMySubscription', () => {
    it('returns the active subscription for the current patient', async () => {
      const sub = { id: 'sub-1', plan };
      mockPrisma.patient.findUnique.mockResolvedValue(patient);
      mockPrisma.patientSubscription.findFirst.mockResolvedValue(sub);

      const result = await service.findMySubscription(patientUser);

      expect(result).toEqual(sub);
      expect(mockPrisma.patientSubscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ patientId: patient.id }) }),
      );
    });

    it('returns null when no active subscription exists', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(patient);
      mockPrisma.patientSubscription.findFirst.mockResolvedValue(null);

      const result = await service.findMySubscription(patientUser);

      expect(result).toBeNull();
    });

    it('throws NotFoundException when patient profile is not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findMySubscription(patientUser)).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancelSubscription ────────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    const sub = { id: 'sub-1', patient: { userId: patientUser.sub } };

    beforeEach(() => {
      mockPrisma.patientSubscription.findUnique.mockResolvedValue(sub);
      mockPrisma.patientSubscription.update.mockResolvedValue({ ...sub, status: 'cancelled' });
    });

    it('allows the subscription owner to cancel', async () => {
      await expect(service.cancelSubscription('sub-1', patientUser)).resolves.toMatchObject({
        status: 'cancelled',
      });
    });

    it('allows an admin to cancel any subscription', async () => {
      await expect(service.cancelSubscription('sub-1', adminUser)).resolves.toBeDefined();
    });

    it('throws ForbiddenException when a non-owner patient tries to cancel', async () => {
      const otherUser: JwtPayload = { sub: 'user-other', email: 'x@test.com', role: 'patient' };

      await expect(service.cancelSubscription('sub-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when subscription does not exist', async () => {
      mockPrisma.patientSubscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription('unknown', patientUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets cancelledAt and status to cancelled', async () => {
      await service.cancelSubscription('sub-1', patientUser);

      expect(mockPrisma.patientSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'cancelled', cancelledAt: expect.any(Date) }),
        }),
      );
    });
  });
});
