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
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
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

    // Flutterwave is currently disabled (no working integration) — the enum
    // value stays in the schema for historical rows, but a new charge request
    // against it must fail loudly here rather than silently create a payment
    // that can never be completed.
    if (dto.gateway === PaymentGateway.Flutterwave) {
      throw new BadRequestException('Flutterwave is not currently available. Please use Paystack or bank transfer.');
    }

    const idempotencyKey = randomUUID();
    const amountKobo = dto.amountKobo;
    const description =
      dto.description?.trim() ||
      options?.description ||
      `${dto.purpose} — ${dto.currency} ${(amountKobo / 100).toFixed(2)}`;

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
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency,
        reference,
        callback_url: `${this.config.get('FRONTEND_URL')}/payments/verify`,
        metadata: { paymentId, description },
      }),
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

  // ── Paystack Webhook ───────────────────────────────────────────────────────

  async handlePaystackWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    this.verifyPaystackSignature(rawBody, signature, secret);

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch (err) {
      // A signature-valid-but-unparseable body indicates an internal bug, not
      // a transient failure — retrying will never succeed, so ack it (avoid a
      // Paystack retry storm) but log loudly so it surfaces for investigation.
      this.logger.error(`Failed to parse Paystack webhook body: ${err instanceof Error ? err.message : err}`);
      return { received: true };
    }

    await this.processWebhookEvent(event, PaymentGateway.Paystack);

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

  // ── Verify Payment (callback fallback) ───────────────────────────────────

  // Public — the Paystack reference is an unguessable secret generated by the
  // PSP, so no ownership check is needed. Returns minimal status info only.
  async verifyPayment(reference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayRef: reference },
      select: { id: true, status: true, gateway: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Already confirmed — return current state without re-querying PSP
    if (payment.status === PaymentStatus.paid) {
      return { status: 'paid', paymentId: payment.id, gateway: payment.gateway };
    }

    // For Paystack payments: re-verify with the PSP so we don't depend solely
    // on the webhook arriving before the user navigates back.
    if (payment.gateway === PaymentGateway.Paystack) {
      const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
      let res: Response;
      try {
        res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
      } catch (err) {
        this.logger.error(`Paystack verify call failed for ref ${reference}: ${err instanceof Error ? err.message : err}`);
        return { status: payment.status, paymentId: payment.id, gateway: payment.gateway };
      }

      if (res.ok) {
        const body = (await res.json()) as { data: { status: string; reference: string } };
        if (body.data?.status === 'success') {
          const syntheticEvent = {
            event: 'charge.success',
            data: { reference: body.data.reference, status: body.data.status },
          };
          await this.processWebhookEvent(syntheticEvent as Record<string, unknown>, PaymentGateway.Paystack);
          return { status: 'paid', paymentId: payment.id, gateway: payment.gateway };
        }
      } else {
        const errBody = await res.text().catch(() => '');
        this.logger.error(`Paystack verify returned ${res.status} for ref ${reference}: ${errBody}`);
      }
    }

    return { status: payment.status, paymentId: payment.id, gateway: payment.gateway };
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

  // Explicit event-type routing — anything not recognized below is logged and
  // left untouched. A prior version defaulted every non-success event to
  // "failed", which meant any unrelated event referencing the same gateway
  // ref (a dispute notice, a future event type we don't handle yet, etc.)
  // could silently flip a good payment to failed.
  private async processWebhookEvent(event: Record<string, unknown>, gateway: PaymentGateway) {
    const eventType = (event.event ?? event.type ?? '') as string;
    const eventData = event.data as Record<string, unknown> | undefined;

    if (eventType === 'charge.success' || eventType === 'charge.completed') {
      await this.handleChargeSuccess(event, eventData, gateway);
      return;
    }
    if (eventType === 'charge.failed') {
      await this.handleChargeFailed(event, eventData, gateway);
      return;
    }
    if (eventType === 'refund.processed') {
      await this.handleRefundProcessed(event, eventData, gateway);
      return;
    }
    if (eventType === 'refund.failed') {
      this.logger.warn(`Refund failed (Paystack-side): ${JSON.stringify(event)}`);
      return;
    }

    this.logger.warn(`Unhandled webhook event type "${eventType}" — no-op.`);
  }

  private async handleChargeSuccess(
    event: Record<string, unknown>,
    eventData: Record<string, unknown> | undefined,
    gateway: PaymentGateway,
  ) {
    const gatewayRef = eventData?.reference as string | undefined;
    if (!gatewayRef) {
      this.logger.warn(`charge.success webhook missing reference: ${JSON.stringify(event)}`);
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

    const payment = await this.prisma.payment.findFirst({ where: { gatewayRef } });
    if (!payment) {
      this.logger.warn(`No payment found for ref: ${gatewayRef}`);
      return;
    }

    // Payment status, subscription activation, and invoice creation happen in
    // one transaction: if activation throws, everything rolls back, the
    // payment stays non-paid, and a webhook retry (or the verifyPayment
    // client-side fallback) can safely re-attempt from scratch — the
    // idempotency check above only blocks retries for payments already paid.
    const paidAt = new Date();
    let activation: { firstSubscription: boolean; planId: string } | null = null;
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.paid,
          paidAt,
          gatewayResponse: event as Prisma.InputJsonValue,
          metadata: this.mergeMetadata(payment.metadata, 'charge.success'),
        },
      });

      activation = await this.activateSubscriptionFromPayment(tx, payment.id, payment.patientId, payment.metadata);
      await this.createInvoice(tx, payment.id, payment.patientId, payment.amountKobo, paidAt);
    });

    this.logger.log(`Payment ${payment.id} → paid via ${gateway}`);

    // Receipt email is best-effort — a failure here must not undo the
    // payment/activation transaction that already committed above.
    await this.sendReceiptEmail(payment.id).catch((err) =>
      this.logger.error(`Failed to send receipt email for payment ${payment.id}: ${err instanceof Error ? err.message : err}`),
    );

    // First-ever subscription = registration just completed with a paid plan
    // → one-time welcome email (best-effort; the helper swallows failures).
    if ((activation as { firstSubscription: boolean; planId: string } | null)?.firstSubscription) {
      void this.notifications.sendPatientWelcomeEmail(payment.patientId, activation!.planId);
    }
  }

  private async handleChargeFailed(
    event: Record<string, unknown>,
    eventData: Record<string, unknown> | undefined,
    gateway: PaymentGateway,
  ) {
    const gatewayRef = eventData?.reference as string | undefined;
    if (!gatewayRef) {
      this.logger.warn(`charge.failed webhook missing reference: ${JSON.stringify(event)}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({ where: { gatewayRef } });
    if (!payment) {
      this.logger.warn(`No payment found for ref: ${gatewayRef}`);
      return;
    }
    if (payment.status === PaymentStatus.paid) {
      // A failed-charge event can never legitimately arrive after a paid one
      // for the same reference — ignore rather than downgrade a good payment.
      this.logger.warn(`Ignoring charge.failed for already-paid payment ${payment.id}`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.failed,
        gatewayResponse: event as Prisma.InputJsonValue,
        metadata: this.mergeMetadata(payment.metadata, 'charge.failed'),
      },
    });

    this.logger.log(`Payment ${payment.id} → failed via ${gateway}`);
  }

  private async handleRefundProcessed(
    event: Record<string, unknown>,
    eventData: Record<string, unknown> | undefined,
    gateway: PaymentGateway,
  ) {
    const transaction = eventData?.transaction as Record<string, unknown> | undefined;
    const gatewayRef =
      (eventData?.transaction_reference as string | undefined) ?? (transaction?.reference as string | undefined);
    const refundedAmountKobo = typeof eventData?.amount === 'number' ? (eventData.amount as number) : undefined;

    if (!gatewayRef) {
      this.logger.warn(`refund.processed webhook missing transaction reference: ${JSON.stringify(event)}`);
      return;
    }

    const payment = await this.prisma.payment.findFirst({ where: { gatewayRef } });
    if (!payment) {
      this.logger.warn(`No payment found for refunded ref: ${gatewayRef}`);
      return;
    }

    const amountKobo = refundedAmountKobo ?? payment.amountKobo;

    // Idempotency: skip if we've already recorded a refund of at least this amount.
    if ((payment.refundAmountKobo ?? 0) >= amountKobo) {
      this.logger.log(`Idempotent skip for refund on payment ${payment.id}`);
      return;
    }

    const isFullRefund = amountKobo >= payment.amountKobo;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund ? PaymentStatus.refunded : payment.status,
          refundedAt: new Date(),
          refundAmountKobo: amountKobo,
          gatewayResponse: event as Prisma.InputJsonValue,
          metadata: this.mergeMetadata(payment.metadata, 'refund.processed'),
        },
      });

      if (isFullRefund) await this.cancelSubscriptionForRefund(tx, payment.id, payment.metadata);
    });

    this.logger.log(`Payment ${payment.id} refund processed (${amountKobo} kobo, ${isFullRefund ? 'full' : 'partial'}) via ${gateway}`);

    await this.sendRefundEmail(payment.id, amountKobo).catch((err) =>
      this.logger.error(`Failed to send refund email for payment ${payment.id}: ${err instanceof Error ? err.message : err}`),
    );
  }

  private async cancelSubscriptionForRefund(
    tx: Prisma.TransactionClient,
    paymentId: string,
    metadataRaw: Prisma.JsonValue | null,
  ): Promise<void> {
    const meta = metadataRaw as { kind?: string } | null;
    if (meta?.kind !== 'subscription_upgrade') return;

    await tx.patientSubscription.updateMany({
      where: { paymentId, status: { in: ['active', 'trial'] } },
      data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Refunded' },
    });
  }

  private async activateSubscriptionFromPayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
    patientId: string,
    metadataRaw: Prisma.JsonValue | null,
  ): Promise<{ firstSubscription: boolean; planId: string } | null> {
    const meta = metadataRaw as { kind?: string; planId?: string; billingCycle?: string } | null;
    if (!meta || meta.kind !== 'subscription_upgrade' || !meta.planId) return null;

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

    // No prior subscription row of any status = this activation completes the
    // patient's registration → the caller sends the one-time welcome email
    // after the transaction commits.
    const priorSubscriptions = await tx.patientSubscription.count({ where: { patientId } });

    // Cancel any prior active/trial subscription before activating the new one
    // — patients should never carry two simultaneously.
    await tx.patientSubscription.updateMany({
      where: { patientId, status: { in: ['active', 'trial'] } },
      data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Upgraded via payment' },
    });

    await tx.patientSubscription.create({
      data: {
        patientId,
        planId: meta.planId!,
        startedAt: startDate,
        expiresAt: endDate,
        paymentId,
      },
    });

    this.logger.log(`Subscription activated for patient ${patientId} from payment ${paymentId}`);
    return { firstSubscription: priorSubscriptions === 0, planId: meta.planId };
  }

  // ── Invoices & Receipts ────────────────────────────────────────────────────

  private async generateInvoiceRef(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await tx.invoice.findFirst({
      where: { hhaRef: { startsWith: prefix } },
      orderBy: { hhaRef: 'desc' },
      select: { hhaRef: true },
    });
    const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async createInvoice(
    tx: Prisma.TransactionClient,
    paymentId: string,
    patientId: string,
    amountKobo: number,
    issuedAt: Date,
  ): Promise<void> {
    await tx.invoice.create({
      data: {
        hhaRef: await this.generateInvoiceRef(tx),
        patientId,
        paymentId,
        subtotalKobo: amountKobo,
        taxKobo: 0,
        totalKobo: amountKobo,
        issuedAt,
      },
    });
  }

  private async sendReceiptEmail(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { patient: { include: { user: { select: { email: true } } } } },
    });
    if (!payment?.patient.user?.email) return;

    const amount = `${payment.currency} ${(payment.amountKobo / 100).toFixed(2)}`;
    const paidDate = payment.paidAt ? this.formatDateWat(payment.paidAt) : '';

    const body =
      `Thank you for your payment.\n\n` +
      `Reference: ${payment.hhaRef}\nAmount: ${amount}\nDescription: ${payment.description}\nDate: ${paidDate} (WAT)\n\n` +
      `This email is your receipt for this transaction — keep it for your records.\n\n— Health Hub Africa`;

    await this.notifications.sendEmail(
      payment.patient.user.email,
      `Payment receipt — ${payment.hhaRef}`,
      body,
      payment.patient.userId,
    );
  }

  private async sendRefundEmail(paymentId: string, amountKobo: number): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { patient: { include: { user: { select: { email: true } } } } },
    });
    if (!payment?.patient.user?.email) return;

    const amount = `${payment.currency} ${(amountKobo / 100).toFixed(2)}`;
    const body =
      `A refund has been processed for your payment ${payment.hhaRef}.\n\n` +
      `Refunded amount: ${amount}\nOriginal description: ${payment.description}\n\n` +
      `The refund should reflect in your account within your bank's usual processing time.\n\n— Health Hub Africa`;

    await this.notifications.sendEmail(
      payment.patient.user.email,
      `Refund processed — ${payment.hhaRef}`,
      body,
      payment.patient.userId,
    );
  }

  private formatDateWat(date: Date): string {
    return date.toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
    });
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  }

  // Printable HTML receipt — deliberately not a generated PDF binary (would
  // require a heavy new dependency like Puppeteer just to render this page);
  // the browser's own print-to-PDF covers "downloadable receipt" instead.
  async getReceiptHtml(paymentId: string, currentUser: JwtPayload): Promise<string> {
    const payment = await this.findPayment(paymentId, currentUser); // reuses ownership check
    if (payment.status !== PaymentStatus.paid && payment.status !== PaymentStatus.refunded) {
      throw new BadRequestException('Receipt is only available for paid payments');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: payment.patientId },
      select: { firstName: true, lastName: true },
    });

    const amount = `${payment.currency} ${(payment.amountKobo / 100).toFixed(2)}`;
    const paidDate = payment.paidAt ? this.formatDateWat(payment.paidAt) : '—';
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '—';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt — ${this.escapeHtml(payment.hhaRef)}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #F4F6F5; padding: 40px; }
  .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  h1 { font-size: 18px; color: #0E4A30; margin: 0 0 4px; }
  .sub { color: #6B6B6B; font-size: 12px; margin: 0 0 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #EBEFEF; font-size: 14px; }
  .row span:first-child { color: #6B6B6B; }
  .row span:last-child { color: #1A1A1A; font-weight: 600; }
  .total { font-size: 18px; font-weight: 800; color: #0E4A30; }
  @media print { body { background: #fff; } .card { box-shadow: none; } }
</style></head>
<body>
  <div class="card">
    <h1>MyHealth Vault+™ — Payment Receipt</h1>
    <p class="sub">Health Hub Africa</p>
    <div class="row"><span>Reference</span><span>${this.escapeHtml(payment.hhaRef)}</span></div>
    <div class="row"><span>Patient</span><span>${this.escapeHtml(patientName)}</span></div>
    <div class="row"><span>Description</span><span>${this.escapeHtml(payment.description)}</span></div>
    <div class="row"><span>Date</span><span>${paidDate} (WAT)</span></div>
    <div class="row"><span>Status</span><span>${payment.status === 'refunded' ? 'Refunded' : 'Paid'}</span></div>
    <div class="row total"><span>Total</span><span>${this.escapeHtml(amount)}</span></div>
  </div>
</body></html>`;
  }

  // ── Admin: Refund Payment ─────────────────────────────────────────────────

  async refundPayment(paymentId: string, dto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.paid) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    const alreadyRefunded = payment.refundAmountKobo ?? 0;
    const remaining = payment.amountKobo - alreadyRefunded;
    const amountKobo = dto.amountKobo ?? remaining;

    if (amountKobo <= 0 || amountKobo > remaining) {
      throw new BadRequestException(`Refund amount must be between 1 and ${remaining} kobo`);
    }

    if (payment.gateway === PaymentGateway.manual) {
      // No PSP involved — the admin is attesting they already sent the money
      // back out-of-band, so confirm immediately rather than waiting on a
      // webhook that will never arrive.
      const newRefundTotal = alreadyRefunded + amountKobo;
      const isFullRefund = newRefundTotal >= payment.amountKobo;

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: isFullRefund ? PaymentStatus.refunded : payment.status,
            refundedAt: new Date(),
            refundAmountKobo: newRefundTotal,
            metadata: this.mergeMetadata(payment.metadata, 'manual_refund', { refundReason: dto.reason }),
          },
        });

        if (isFullRefund) await this.cancelSubscriptionForRefund(tx, payment.id, payment.metadata);
      });

      await this.sendRefundEmail(payment.id, amountKobo).catch((err) =>
        this.logger.error(`Failed to send refund email for payment ${payment.id}: ${err instanceof Error ? err.message : err}`),
      );

      return { refunded: true, amountKobo, status: isFullRefund ? 'refunded' : 'paid' };
    }

    // Paystack: initiate the refund via their API. Confirmation is
    // asynchronous — the refund.processed webhook is what actually marks the
    // payment refunded, so this only records that a request was made.
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: payment.gatewayRef,
        amount: amountKobo,
        ...(dto.reason && { merchant_note: dto.reason }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Paystack refund request failed for payment ${payment.id}: ${err}`);
      throw new BadRequestException('Refund request failed. Please try again.');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: this.mergeMetadata(payment.metadata, 'refund_requested', {
          refundRequestedAt: new Date().toISOString(),
          refundReason: dto.reason,
        }),
      },
    });

    this.logger.log(`Refund requested for payment ${payment.id}: ${amountKobo} kobo`);

    return {
      refunded: false,
      requested: true,
      amountKobo,
      message: 'Refund requested — will be confirmed once Paystack processes it.',
    };
  }

  // Keeps a capped rolling history of webhook events under metadata.webhookEvents
  // so there's some audit trail without a new table; overwriting gatewayResponse
  // on every event otherwise loses history of prior attempts for the same ref.
  private mergeMetadata(
    metadata: Prisma.JsonValue | null,
    eventType: string,
    extra?: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const existing =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
    const history = Array.isArray(existing.webhookEvents) ? (existing.webhookEvents as unknown[]) : [];
    return {
      ...existing,
      ...extra,
      webhookEvents: [...history, { eventType, receivedAt: new Date().toISOString() }].slice(-20),
    } as Prisma.InputJsonValue;
  }

  // ── Signature Verification ─────────────────────────────────────────────────

  private verifyPaystackSignature(body: Buffer, signature: string, secret: string) {
    if (!signature) {
      throw new UnauthorizedException('Missing Paystack webhook signature');
    }
    const hash = createHmac('sha512', secret).update(body).digest('hex');
    const sig = Buffer.from(signature);
    const computed = Buffer.from(hash);

    if (sig.length !== computed.length || !timingSafeEqual(sig, computed)) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }
  }
}
