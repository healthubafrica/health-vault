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

    it('rejects the race loser when the winner was created for a different amount', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: 'pay-winner',
        patientId: patient.id,
        amountKobo: dto.amountKobo + 1000,
        currency: dto.currency,
        gateway: dto.gateway,
        gatewayRef: null,
        idempotencyKey: 'key-race2',
        status: PaymentStatus.pending,
        metadata: null,
      });
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockRejectedValue(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['idempotency_key'] } }),
      );

      await expect(service.initiate(dto as any, patientUser, { idempotencyKey: 'key-race2' })).rejects.toThrow(
        BadRequestException,
      );
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

  // ── Paystack ──────────────────────────────────────────────────────────────

  describe('initiate — Paystack', () => {
    const dto = {
      gateway: PaymentGateway.Paystack,
      purpose: 'subscription' as const,
      amountKobo: 250000,
      currency: 'NGN',
      description: 'Silver plan',
    };
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      mockConfig.get.mockImplementation((k: string) => (k === 'FRONTEND_URL' ? 'https://portal.test' : undefined));
      mockConfig.getOrThrow.mockReturnValue('sk_test_dummy');
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null); // generatePaymentRef lookup
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-ps',
        patientId: 'patient-1',
        gateway: PaymentGateway.Paystack,
        status: PaymentStatus.pending,
        createdAt: new Date(),
      });
      mockPrisma.payment.update.mockResolvedValue({});
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { authorization_url: 'https://checkout.paystack.com/abc', access_code: 'abc', reference: 'echoed' },
        }),
      } as Response);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      mockConfig.get.mockReset();
      mockConfig.getOrThrow.mockReset();
    });

    const sentBody = () => JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body);

    it('starts a Paystack transaction and returns the hosted checkout URL', async () => {
      const res = await service.initiate(dto as any, patientUser);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(sentBody()).toMatchObject({
        email: 'p@test.com',
        amount: 250000,
        currency: 'NGN',
        callback_url: 'https://portal.test/payments/verify',
      });
      expect(res).toMatchObject({
        paymentId: 'pay-ps',
        gateway: PaymentGateway.Paystack,
        authorizationUrl: 'https://checkout.paystack.com/abc',
        amountKobo: 250000,
      });
    });

    it('persists the checkout URL without dropping the metadata subscription activation depends on', async () => {
      await service.initiate(dto as any, patientUser, {
        metadata: { kind: 'subscription_upgrade', planId: 'plan-1' },
      });

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-ps' },
        data: expect.objectContaining({
          gatewayRef: sentBody().reference,
          metadata: expect.objectContaining({
            kind: 'subscription_upgrade',
            planId: 'plan-1',
            authorizationUrl: 'https://checkout.paystack.com/abc',
          }),
        }),
      });
    });

    it('sends Paystack a reference it accepts (letters, digits, "-", ".", "=" only) even when the client key has underscores', async () => {
      await service.initiate(dto as any, patientUser, { idempotencyKey: 'checkout_attempt_1' });

      const { reference } = sentBody();
      expect(reference).toMatch(/^[A-Za-z0-9.=-]+$/);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ gatewayRef: reference }) }),
      );
    });

    it('replays the stored checkout URL for a repeated key instead of opening a second Paystack transaction', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-ps',
        patientId: patient.id,
        amountKobo: dto.amountKobo,
        currency: dto.currency,
        gateway: PaymentGateway.Paystack,
        gatewayRef: 'checkout-attempt-1',
        idempotencyKey: 'checkout_attempt_1',
        status: PaymentStatus.pending,
        metadata: { authorizationUrl: 'https://checkout.paystack.com/abc' },
      });

      const res = await service.initiate(dto as any, patientUser, { idempotencyKey: 'checkout_attempt_1' });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res).toMatchObject({ authorizationUrl: 'https://checkout.paystack.com/abc' });
    });

    it('surfaces a generic gateway error when Paystack rejects the request', async () => {
      fetchSpy.mockResolvedValue({ ok: false, text: async () => 'bad request' } as Response);

      await expect(service.initiate(dto as any, patientUser)).rejects.toThrow('Payment gateway error');
    });

    it('still rejects saved-card charging, which only exists for Flutterwave', async () => {
      await expect(
        service.initiate({ ...dto, paymentMethodId: 'pm-1' } as any, patientUser),
      ).rejects.toThrow(/Saved-card charging is only supported for Flutterwave/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('mobile return flow', () => {
    let fetchSpy: jest.SpyInstance;
    const base = { purpose: 'subscription' as const, amountKobo: 250000, currency: 'NGN', description: 'Silver' };

    beforeEach(() => {
      mockConfig.get.mockImplementation((k: string) => (k === 'FRONTEND_URL' ? 'https://portal.test' : undefined));
      mockConfig.getOrThrow.mockReturnValue('sk_test_dummy');
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-m', patientId: 'patient-1', status: PaymentStatus.pending });
      mockPrisma.payment.update.mockResolvedValue({});
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { link: 'https://flw.test/pay', authorization_url: 'https://ps.test/pay', access_code: 'a', reference: 'r' },
        }),
      } as Response);
    });

    afterEach(() => {
      fetchSpy.mockRestore();
      mockConfig.get.mockReset();
      mockConfig.getOrThrow.mockReset();
    });

    const sentBody = () => JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body);

    it('Paystack: client=mobile adds ?client=mobile to the callback URL', async () => {
      await service.initiate({ ...base, gateway: PaymentGateway.Paystack, client: 'mobile' } as any, patientUser);
      expect(sentBody().callback_url).toBe('https://portal.test/payments/verify?client=mobile');
    });

    it('Flutterwave: client=mobile adds ?client=mobile to the redirect URL', async () => {
      await service.initiate({ ...base, gateway: PaymentGateway.Flutterwave, client: 'mobile' } as any, patientUser);
      expect(sentBody().redirect_url).toBe('https://portal.test/payments/verify?client=mobile');
    });

    it('defaults to the plain web URL and leaves Paystack metadata unchanged', async () => {
      await service.initiate({ ...base, gateway: PaymentGateway.Paystack } as any, patientUser);
      expect(sentBody().callback_url).toBe('https://portal.test/payments/verify');
      expect(sentBody().metadata).toEqual({ paymentId: 'pay-m', description: 'Silver' });
    });

    it('does not persist the client flag into payment metadata', async () => {
      await service.initiate({ ...base, gateway: PaymentGateway.Flutterwave, client: 'mobile' } as any, patientUser);
      const createData = mockPrisma.payment.create.mock.calls[0][0].data;
      expect(JSON.stringify(createData)).not.toContain('mobile');
    });
  });

  describe('manual payment reference', () => {
    it('returns the human hhaRef, not the UUID idempotency key', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockImplementation(async ({ data }: any) => ({ id: 'pay-man', ...data }));

      const res = await service.initiate(
        { gateway: PaymentGateway.manual, purpose: 'other', amountKobo: 50000, currency: 'NGN' } as any,
        patientUser,
      );

      expect(res).toMatchObject({ paymentId: 'pay-man', reference: expect.stringMatching(/^PAY-\d{4}-\d{6}$/) });
      expect(res).not.toHaveProperty('idempotencyKey');
    });

    it('replay also exposes hhaRef', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', patientId: patient.id, amountKobo: 50000, currency: 'NGN', gateway: PaymentGateway.manual,
        gatewayRef: null, idempotencyKey: 'k1', hhaRef: 'PAY-2026-000007', status: PaymentStatus.pending, metadata: null,
      });
      const res = await service.initiate(
        { gateway: PaymentGateway.manual, purpose: 'other', amountKobo: 50000, currency: 'NGN' } as any,
        patientUser,
        { idempotencyKey: 'k1' },
      );
      expect(res).toMatchObject({ reference: 'PAY-2026-000007' });
    });
  });

  describe('initiate — idempotent replay must match the whole request', () => {
    const upgradeDto = {
      gateway: PaymentGateway.Paystack,
      purpose: 'subscription' as const,
      amountKobo: 250000,
      currency: 'NGN',
      referenceId: 'plan-1',
    };
    const upgradeOpts = (billingCycle: string) => ({
      idempotencyKey: 'upg-key',
      metadata: { kind: 'subscription_upgrade', planId: 'plan-1', billingCycle },
    });
    const stored = {
      id: 'pay-up',
      patientId: patient.id,
      amountKobo: 250000,
      currency: 'NGN',
      gateway: PaymentGateway.Paystack,
      gatewayRef: 'HHA-abc',
      idempotencyKey: 'upg-key',
      status: PaymentStatus.pending,
      metadata: {
        kind: 'subscription_upgrade',
        planId: 'plan-1',
        billingCycle: 'monthly',
        authorizationUrl: 'https://checkout.paystack.com/abc',
        idemFingerprint: { purpose: 'subscription', referenceId: 'plan-1', billingCycle: 'monthly' },
      },
    };

    beforeEach(() => mockPrisma.payment.findUnique.mockResolvedValue(stored));

    it('replays an identical upgrade request', async () => {
      const res = await service.initiate(upgradeDto as any, patientUser, upgradeOpts('monthly'));
      expect(res).toMatchObject({ paymentId: 'pay-up', authorizationUrl: 'https://checkout.paystack.com/abc' });
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects the same key with a different plan', async () => {
      await expect(
        service.initiate({ ...upgradeDto, referenceId: 'plan-2' } as any, patientUser, upgradeOpts('monthly')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects the same key with a different billing cycle', async () => {
      await expect(
        service.initiate(upgradeDto as any, patientUser, upgradeOpts('annually')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects the same key with a different purpose', async () => {
      await expect(
        service.initiate({ ...upgradeDto, purpose: 'appointment' } as any, patientUser, upgradeOpts('monthly')),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists the request fingerprint in the payment metadata on create', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-new', patientId: patient.id, status: PaymentStatus.pending });
      await service.initiate({ ...upgradeDto, gateway: PaymentGateway.manual } as any, patientUser, upgradeOpts('monthly'));
      const data = mockPrisma.payment.create.mock.calls[0][0].data;
      expect(data.metadata.idemFingerprint).toEqual({
        purpose: 'subscription',
        referenceId: 'plan-1',
        billingCycle: 'monthly',
      });
    });
  });

  describe('gateway references are server-generated', () => {
    let fetchSpy: jest.SpyInstance;
    beforeEach(() => {
      mockConfig.get.mockImplementation((k: string) => (k === 'FRONTEND_URL' ? 'https://portal.test' : undefined));
      mockConfig.getOrThrow.mockReturnValue('sk_test_dummy');
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-g', patientId: patient.id, status: PaymentStatus.pending });
      mockPrisma.payment.update.mockResolvedValue({});
      fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { link: 'https://flw.test/pay', authorization_url: 'https://ps.test/pay', access_code: 'a', reference: 'r' },
        }),
      } as Response);
    });
    afterEach(() => {
      fetchSpy.mockRestore();
      mockConfig.get.mockReset();
      mockConfig.getOrThrow.mockReset();
    });
    const base = { purpose: 'other' as const, amountKobo: 50000, currency: 'NGN' };

    it('Paystack reference is not derived from the client idempotency key', async () => {
      await service.initiate({ ...base, gateway: PaymentGateway.Paystack } as any, patientUser, {
        idempotencyKey: 'guessable-key-1',
      });
      const sent = JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body).reference;
      expect(sent).toMatch(/^HHA-[0-9a-f-]{36}$/);
      expect(sent).not.toContain('guessable');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ gatewayRef: sent }) }),
      );
    });

    it('Flutterwave tx_ref is not derived from the client idempotency key', async () => {
      const res: any = await service.initiate({ ...base, gateway: PaymentGateway.Flutterwave } as any, patientUser, {
        idempotencyKey: 'guessable-key-2',
      });
      const sent = JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body).tx_ref;
      expect(sent).toMatch(/^HHA-[0-9a-f-]{36}$/);
      expect(res.reference).toBe(sent);
    });

    it('manual response exposes hhaRef alongside the legacy reference', async () => {
      mockPrisma.payment.create.mockImplementation(async ({ data }: any) => ({ id: 'pay-man', ...data }));
      const res: any = await service.initiate({ ...base, gateway: PaymentGateway.manual } as any, patientUser);
      expect(res.hhaRef).toMatch(/^PAY-\d{4}-\d{6}$/);
      expect(res.reference).toBe(res.hhaRef);
    });

    it('verifyPayment finds a payment by gateway ref or legacy idempotency key and verifies with the stored gateway ref', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-v', status: PaymentStatus.pending, gateway: PaymentGateway.Paystack, gatewayRef: 'HHA-stored',
      });
      fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'abandoned', reference: 'HHA-stored' } }) } as Response);
      await service.verifyPayment('legacy-key');
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ gatewayRef: 'legacy-key' }, { idempotencyKey: 'legacy-key', gatewayRef: null }] },
        }),
      );
      expect(String(fetchSpy.mock.calls[0][0])).toContain('/verify/HHA-stored');
    });
  });

  describe('verifyPayment — Flutterwave fallback', () => {
    afterEach(() => jest.restoreAllMocks());

    it('passes the card from verify_by_reference into the synthetic event so the token can be saved', async () => {
      mockConfig.getOrThrow.mockReturnValue('flw_dummy');
      mockPrisma.payment.findFirst.mockResolvedValue({ id: 'pay-f', status: PaymentStatus.pending, gateway: PaymentGateway.Flutterwave, gatewayRef: 'tx-1' });
      const card = { token: 'flw-t-1', last_4digits: '4081', type: 'VISA', expiry: '09/30' };
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'successful', tx_ref: 'tx-1', id: 77, card } }),
      } as Response);
      const proc = jest.spyOn(service as any, 'processWebhookEvent').mockResolvedValue(undefined);

      await service.verifyPayment('tx-1');

      expect(proc).toHaveBeenCalledWith(
        { event: 'charge.success', data: { reference: 'tx-1', status: 'successful', id: 77, card } },
        PaymentGateway.Flutterwave,
      );
    });
  });

  describe('getGatewayStatus', () => {
    const paystack = () => service.getGatewayStatus().find((g) => g.gateway === 'paystack')!;

    afterEach(() => mockConfig.get.mockReset());

    it('reports Paystack active once its secret key is configured', () => {
      mockConfig.get.mockImplementation((k: string) => (k === 'PAYSTACK_SECRET_KEY' ? 'sk_live_x' : undefined));

      expect(paystack()).toMatchObject({ active: true });
      expect(paystack()).not.toHaveProperty('comingSoon');
    });

    it('reports Paystack inactive when no key is configured', () => {
      mockConfig.get.mockReturnValue(undefined);

      expect(paystack().active).toBe(false);
    });
  });
});
