import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // PAY-YYYY-000001 sequential payment reference
  private async generatePaymentRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    const last = await this.prisma.payment.findFirst({
      where: { hhaRef: { startsWith: prefix } },
      orderBy: { hhaRef: 'desc' },
      select: { hhaRef: true },
    });
    const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  // ── Initiate Payment ───────────────────────────────────────────────────────

  async initiate(
    dto: InitiatePaymentDto,
    currentUser: JwtPayload,
    options?: { metadata?: Prisma.InputJsonValue; description?: string },
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      include: { user: { select: { email: true } } },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const idempotencyKey = randomUUID();
    const amountKobo = dto.amountKobo;
    const description =
      options?.description ?? `${dto.purpose} — ${dto.currency} ${(amountKobo / 100).toFixed(2)}`;

    const payment = await this.prisma.payment.create({
      data: {
        hhaRef: await this.generatePaymentRef(),
        patientId: patient.id,
        gateway: dto.gateway,
        amountKobo,
        currency: dto.currency,
        idempotencyKey,
        description,
        status: PaymentStatus.pending,
        ...(options?.metadata !== undefined && { metadata: options.metadata }),
      },
    });

    // Initiate charge with the selected gateway
    if (dto.gateway === PaymentGateway.Paystack) {
      return this.initiatePaystack(payment.id, patient.user.email, amountKobo, dto.currency, idempotencyKey, description);
    }

    if (dto.gateway === PaymentGateway.Flutterwave) {
      return this.initiateFlutterwave(payment.id, patient.user.email, amountKobo, dto.currency, idempotencyKey, description);
    }

    return {
      paymentId: payment.id,
      idempotencyKey,
      gateway: dto.gateway,
      amountKobo,
      currency: dto.currency,
      status: payment.status,
    };
  }

  private async initiatePaystack(
    paymentId: string,
    email: string,
    amountKobo: number,
    currency: string,
    reference: string,
    description: string,
  ) {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, amount: amountKobo, currency, reference, metadata: { paymentId, description } }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Paystack init failed: ${err}`);
      throw new BadRequestException('Payment gateway error. Please try again.');
    }

    const data = (await res.json()) as { data: { authorization_url: string; access_code: string; reference: string } };

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { gatewayRef: reference },
    });

    return {
      paymentId,
      gateway: PaymentGateway.Paystack,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
      amountKobo,
      currency,
    };
  }

  private async initiateFlutterwave(
    paymentId: string,
    email: string,
    amountKobo: number,
    currency: string,
    txRef: string,
    description: string,
  ) {
    const secret = this.config.getOrThrow<string>('FLUTTERWAVE_SECRET_KEY');
    const redirectUrl = `${this.config.get('FRONTEND_URL')}/payments/verify`;

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountKobo / 100,
        currency,
        redirect_url: redirectUrl,
        customer: { email },
        customizations: { title: 'Health Hub Africa', description },
        meta: { paymentId },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Flutterwave init failed: ${err}`);
      throw new BadRequestException('Payment gateway error. Please try again.');
    }

    const data = (await res.json()) as { data: { link: string } };

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { gatewayRef: txRef },
    });

    return {
      paymentId,
      gateway: PaymentGateway.Flutterwave,
      authorizationUrl: data.data.link,
      txRef,
      amountKobo,
      currency,
    };
  }

  // ── Paystack Webhook ───────────────────────────────────────────────────────

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    this.verifyPaystackSignature(rawBody, signature, secret);

    const event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    await this.processWebhookEvent(event, PaymentGateway.Paystack);

    return { received: true };
  }

  // ── Flutterwave Webhook ────────────────────────────────────────────────────

  async handleFlutterwaveWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.getOrThrow<string>('FLUTTERWAVE_SECRET_KEY');
    this.verifyFlutterwaveSignature(rawBody, signature, secret);

    const event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    await this.processWebhookEvent(event, PaymentGateway.Flutterwave);

    return { received: true };
  }

  // ── Find Payments ──────────────────────────────────────────────────────────

  async findMyPayments(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.payment.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPayment(id: string, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    if (!isAdmin && payment.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return payment;
  }

  // ── Gateway Status ────────────────────────────────────────────────────────

  getGatewayStatus() {
    return [
      {
        gateway: 'paystack',
        name: 'Paystack',
        active: !!this.config.get<string>('PAYSTACK_SECRET_KEY'),
      },
      {
        gateway: 'flutterwave',
        name: 'Flutterwave',
        active: !!this.config.get<string>('FLUTTERWAVE_SECRET_KEY'),
      },
      {
        gateway: 'bank_transfer',
        name: 'Bank Transfer',
        active: true,
        bankName: 'United Bank for Africa',
        accountNumber: '1028358485',
        accountName: 'Health Hub Africa',
      },
    ];
  }

  // ── Internal: process webhook event ──────────────────────────────────────

  private async processWebhookEvent(event: Record<string, unknown>, gateway: PaymentGateway) {
    const eventType = (event.event ?? event.type ?? '') as string;
    const isSuccess = eventType === 'charge.success' || eventType === 'charge.completed';

    const eventData = event.data as Record<string, unknown> | undefined;
    const gatewayRef: string =
      gateway === PaymentGateway.Paystack
        ? (eventData?.reference as string)
        : (eventData?.tx_ref as string);

    if (!gatewayRef) {
      this.logger.warn(`Webhook missing reference: ${JSON.stringify(event)}`);
      return;
    }

    // Idempotency: skip if this reference was already processed successfully
    const existing = await this.prisma.payment.findFirst({
      where: { gatewayRef, status: PaymentStatus.paid },
    });
    if (existing) {
      this.logger.log(`Idempotent skip for ref: ${gatewayRef}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef },
    });

    if (!payment) {
      this.logger.warn(`No payment found for ref: ${gatewayRef}`);
      return;
    }

    const newStatus = isSuccess ? PaymentStatus.paid : PaymentStatus.failed;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt: isSuccess ? new Date() : undefined,
        gatewayResponse: event as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Payment ${payment.id} → ${newStatus} via ${gateway}`);

    // Activate subscription tied to a successful subscription_upgrade payment.
    // Kept inline (no SubscriptionsService dep) to avoid a circular import:
    // SubscriptionsService → PaymentsService → SubscriptionsService.
    if (isSuccess) {
      await this.activateSubscriptionFromPayment(payment.id);
    }
  }

  private async activateSubscriptionFromPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, patientId: true, metadata: true },
    });
    const meta = payment?.metadata as { kind?: string; planId?: string; billingCycle?: string } | null;
    if (!payment || !meta || meta.kind !== 'subscription_upgrade' || !meta.planId) return;

    const cycle = meta.billingCycle === 'annually'
      ? 'annually'
      : meta.billingCycle === 'quarterly'
      ? 'quarterly'
      : 'monthly';

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (cycle === 'annually') endDate.setFullYear(endDate.getFullYear() + 1);
    else if (cycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
    else endDate.setMonth(endDate.getMonth() + 1);

    await this.prisma.$transaction(async (tx) => {
      // Cancel any prior active/trial subscription before activating the new one
      // — patients should never carry two simultaneously.
      await tx.patientSubscription.updateMany({
        where: { patientId: payment.patientId, status: { in: ['active', 'trial'] } },
        data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Upgraded via payment' },
      });

      await tx.patientSubscription.create({
        data: {
          patientId: payment.patientId,
          planId: meta.planId!,
          startedAt: startDate,
          expiresAt: endDate,
          paymentId: payment.id,
        },
      });
    });

    this.logger.log(`Subscription activated for patient ${payment.patientId} from payment ${payment.id}`);
  }

  // ── Signature Verification ─────────────────────────────────────────────────

  private verifyPaystackSignature(body: Buffer, signature: string, secret: string) {
    const hash = createHmac('sha512', secret).update(body).digest('hex');
    const sig = Buffer.from(signature);
    const computed = Buffer.from(hash);

    if (sig.length !== computed.length || !timingSafeEqual(sig, computed)) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }
  }

  private verifyFlutterwaveSignature(body: Buffer, signature: string, secret: string) {
    const hash = createHmac('sha256', secret).update(body).digest('hex');
    const sig = Buffer.from(signature);
    const computed = Buffer.from(hash);

    if (sig.length !== computed.length || !timingSafeEqual(sig, computed)) {
      throw new UnauthorizedException('Invalid Flutterwave webhook signature');
    }
  }
}
