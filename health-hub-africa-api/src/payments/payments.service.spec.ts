import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenemrService } from '../openemr/openemr.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

// ----- Mocks ----------------------------------------------------------------

const makeTx = (overrides: Record<string, unknown> = {}) => ({
  payment: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findUnique: jest.fn().mockResolvedValue({ metadata: null }),
  },
  patientSubscription: {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(1),
  },
  invoice: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  },
  ...overrides,
});

const mockPrisma = {
  patient: { findUnique: jest.fn() },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockConfig = { get: jest.fn(), getOrThrow: jest.fn() };
const mockNotifications = {
  createPatientAlert: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendPatientWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};
const mockOpenemrService = { syncSubscription: jest.fn().mockResolvedValue(undefined) };
const mockAnalyticsService = { emitServerEvent: jest.fn().mockResolvedValue(undefined) };

// ----- Fixtures --------------------------------------------------------------

const patientUser: JwtPayload = { sub: 'user-p1', email: 'p@test.com', role: 'patient' };
const patient = { id: 'patient-1', user: { email: 'p@test.com' } };

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: OpenemrService, useValue: mockOpenemrService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockPrisma.patient.findUnique.mockResolvedValue(patient);
  });

  // ── initiate: client-supplied idempotency key ──────────────────────────────

  describe('initiate — idempotency key', () => {
    const dto = {
      gateway: PaymentGateway.manual,
      purpose: 'other' as const,
      amountKobo: 50000,
      currency: 'NGN',
      description: 'Test payment',
    };

    it('replays the stored result instead of creating a new payment when the key matches an identical request', async () => {
      const existing = {
        id: 'pay-1',
        patientId: patient.id,
        amountKobo: dto.amountKobo,
        currency: dto.currency,
        gateway: dto.gateway,
        gatewayRef: null,
        idempotencyKey: 'key-abc',
        status: PaymentStatus.pending,
        metadata: null,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(existing);

      const result = await service.initiate(dto as any, patientUser, { idempotencyKey: 'key-abc' });

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ paymentId: 'pay-1', idempotencyKey: 'key-abc', status: PaymentStatus.pending }),
      );
    });

    it('rejects a key reused with a different amount instead of silently replaying the old response', async () => {
      const existing = {
        id: 'pay-1',
        patientId: patient.id,
        amountKobo: 999999, // different from dto.amountKobo
        currency: dto.currency,
        gateway: dto.gateway,
        gatewayRef: null,
        idempotencyKey: 'key-abc',
        status: PaymentStatus.pending,
        metadata: null,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(existing);

      await expect(service.initiate(dto as any, patientUser, { idempotencyKey: 'key-abc' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('creates a new payment using the supplied key when no existing payment matches it', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null); // generatePaymentRef lookup
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-2', status: PaymentStatus.pending });

      const result = await service.initiate(dto as any, patientUser, { idempotencyKey: 'key-fresh' });

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: 'key-fresh' }) }),
      );
      expect(result).toEqual(expect.objectContaining({ paymentId: 'pay-2', idempotencyKey: 'key-fresh' }));
    });

    it('rejects a malformed key before ever touching the database', async () => {
      await expect(
        service.initiate(dto as any, patientUser, { idempotencyKey: 'has a space & a slash/here' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('replays the winner instead of throwing when two concurrent requests race the create() call', async () => {
      // Both requests pass the pre-create existence check (miss) before
      // either has committed — the DB unique constraint stops the loser's
      // row from being created, surfaced here as a P2002 on create().
      mockPrisma.payment.findUnique.mockResolvedValue(null); // pre-create existence check: miss
      mockPrisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: 'pay-winner',
        patientId: patient.id,
        amountKobo: dto.amountKobo,
        currency: dto.currency,
        gateway: dto.gateway,
        gatewayRef: null,
        idempotencyKey: 'key-race',
        status: PaymentStatus.pending,
        metadata: null,
      }); // re-fetch after P2002
      mockPrisma.payment.findFirst.mockResolvedValue(null); // generatePaymentRef lookup
      const p2002 = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['idempotency_key'] },
      });
      mockPrisma.payment.create.mockRejectedValue(p2002);

      const result = await service.initiate(dto as any, patientUser, { idempotencyKey: 'key-race' });

      expect(result).toEqual(expect.objectContaining({ paymentId: 'pay-winner' }));
    });

    it('rethrows a P2002 on an unrelated constraint instead of misattributing it to the idempotency race', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      const p2002 = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['hha_ref'] },
      });
      mockPrisma.payment.create.mockRejectedValue(p2002);

      await expect(service.initiate(dto as any, patientUser, { idempotencyKey: 'key-x' })).rejects.toBe(p2002);
    });
  });

  // ── handleChargeSuccess: concurrent-delivery race guard ────────────────────

  describe('handleChargeSuccess (webhook race guard)', () => {
    const payment = {
      id: 'pay-1',
      patientId: 'patient-1',
      amountKobo: 50000,
      status: PaymentStatus.pending,
      metadata: null,
    };
    const event = { event: 'charge.success', data: { reference: 'ref-1', status: 'successful' } };

    it('runs invoice/subscription side effects when it wins the atomic update', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(payment);
      const tx = makeTx({
        payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue({ metadata: null }) },
      });
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(tx));

      await (service as any).handleChargeSuccess(event, event.data, PaymentGateway.Flutterwave);

      expect(tx.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-1', status: { not: PaymentStatus.paid } } }),
      );
      expect(tx.invoice.create).toHaveBeenCalled();
      expect(mockNotifications.createPatientAlert).toHaveBeenCalled();
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'payment_success',
        expect.objectContaining({
          patientId: 'patient-1',
          properties: expect.objectContaining({ paymentId: 'pay-1', gateway: PaymentGateway.Flutterwave }),
        }),
      );
    });

    it('skips every side effect when it loses the atomic update to a concurrent delivery', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(payment);
      // Simulates a second, concurrent webhook delivery (or the verifyPayment
      // client-side fallback) having already claimed this payment — the
      // WHERE guard matches zero rows.
      const tx = makeTx({
        payment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findUnique: jest.fn().mockResolvedValue({ metadata: null }) },
      });
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(tx));

      await (service as any).handleChargeSuccess(event, event.data, PaymentGateway.Flutterwave);

      expect(tx.invoice.create).not.toHaveBeenCalled();
      expect(tx.patientSubscription.create).not.toHaveBeenCalled();
      expect(mockNotifications.createPatientAlert).not.toHaveBeenCalled();
      expect(mockNotifications.sendEmail).not.toHaveBeenCalled();
      // Lost the race — the winning delivery already fired payment_success;
      // firing again here would double-count the conversion.
      expect(mockAnalyticsService.emitServerEvent).not.toHaveBeenCalled();
    });

    it('does not re-run side effects for a webhook retry on an already-paid payment (pre-check fast path)', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...payment, status: PaymentStatus.paid });

      await (service as any).handleChargeSuccess(event, event.data, PaymentGateway.Flutterwave);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockAnalyticsService.emitServerEvent).not.toHaveBeenCalled();
    });
  });

  describe('handleChargeFailed', () => {
    const payment = {
      id: 'pay-2',
      patientId: 'patient-1',
      status: PaymentStatus.pending,
      metadata: null,
    };
    const event = { event: 'charge.failed', data: { reference: 'ref-2', status: 'failed' } };

    it('marks the payment failed and emits payment_failure', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(payment);
      mockPrisma.payment.update.mockResolvedValue({ ...payment, status: PaymentStatus.failed });

      await (service as any).handleChargeFailed(event, event.data, PaymentGateway.Flutterwave);

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-2' }, data: expect.objectContaining({ status: PaymentStatus.failed }) }),
      );
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'payment_failure',
        expect.objectContaining({
          patientId: 'patient-1',
          properties: expect.objectContaining({ paymentId: 'pay-2', gateway: PaymentGateway.Flutterwave, reason: 'webhook' }),
        }),
      );
    });

    it('never downgrades an already-paid payment, and never emits payment_failure for it', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...payment, status: PaymentStatus.paid });

      await (service as any).handleChargeFailed(event, event.data, PaymentGateway.Flutterwave);

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockAnalyticsService.emitServerEvent).not.toHaveBeenCalled();
    });
  });
});
