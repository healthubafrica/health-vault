import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, PaymentStatus, UserRole } from '@prisma/client';
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

  // ── Initiate Payment ───────────────────────────────────────────────────────

  async initiate(dto: InitiatePaymentDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const idempotencyKey = randomUUID();

    const payment = await this.prisma.payment.create({
      data: {
        patientId: patient.id,
        gateway: dto.gateway,
        purpose: dto.purpose,
        amountKobo: dto.amountKobo,
        currency: dto.currency,
        idempotencyKey,
        subscriptionId: dto.subscriptionId,
        appointmentId: dto.appointmentId,
        metadata: dto.metadata,
      },
    });

    // In production, initiate charge with gateway SDK here and return redirect/authorization URL
    return {
      paymentId: payment.id,
      idempotencyKey,
      gateway: dto.gateway,
      amountKobo: dto.amountKobo,
      currency: dto.currency,
      status: payment.status,
      // authorizationUrl: <from Paystack/Flutterwave SDK>
    };
  }

  // ── Paystack Webhook ───────────────────────────────────────────────────────

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    this.verifyPaystackSignature(rawBody, signature, secret);

    const event = JSON.parse(rawBody.toString());
    await this.processWebhookEvent(event, PaymentGateway.paystack);

    return { received: true };
  }

  // ── Flutterwave Webhook ────────────────────────────────────────────────────

  async handleFlutterwaveWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.getOrThrow<string>('FLUTTERWAVE_SECRET_KEY');
    this.verifyFlutterwaveSignature(rawBody, signature, secret);

    const event = JSON.parse(rawBody.toString());
    await this.processWebhookEvent(event, PaymentGateway.flutterwave);

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

    const isAdmin = [UserRole.admin, UserRole.super_admin].includes(currentUser.role as UserRole);
    if (!isAdmin && payment.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return payment;
  }

  // ── Internal: process webhook ─────────────────────────────────────────────

  private async processWebhookEvent(event: any, gateway: PaymentGateway) {
    const eventType: string = event.event ?? event.type ?? '';
    const isSuccess =
      eventType === 'charge.success' || eventType === 'charge.completed';

    const gatewayRef: string =
      gateway === PaymentGateway.paystack
        ? event.data?.reference
        : event.data?.tx_ref;

    if (!gatewayRef) {
      this.logger.warn(`Webhook missing reference: ${JSON.stringify(event)}`);
      return;
    }

    // Idempotency: skip if this reference was already processed successfully
    const existing = await this.prisma.payment.findFirst({
      where: { gatewayReference: gatewayRef, status: PaymentStatus.succeeded },
    });
    if (existing) {
      this.logger.log(`Idempotent skip for ref: ${gatewayRef}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { gateway },
      // In real impl, match by reference stored at initiation time
    });

    if (!payment) {
      this.logger.warn(`No payment found for ref: ${gatewayRef}`);
      return;
    }

    const newStatus = isSuccess ? PaymentStatus.succeeded : PaymentStatus.failed;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        gatewayReference: gatewayRef,
        paidAt: isSuccess ? new Date() : undefined,
        gatewayResponse: JSON.stringify(event),
      },
    });

    this.logger.log(`Payment ${payment.id} → ${newStatus} via ${gateway}`);
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
