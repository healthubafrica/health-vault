import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRateLimiterService } from './notification-rate-limiter.service';

export const NOTIFICATIONS_QUEUE = 'notifications';

// Sentinel userId for deliveries to internal mailboxes (e.g. the ops
// appointments inbox) that aren't backed by a User row. notification_deliveries.userId
// has no FK constraint, so this is safe to use purely for admin-panel display.
export const OPS_NOTIFICATION_USER_ID = '00000000-0000-0000-0000-000000000099';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export interface NotificationJobData {
  userId: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  to: string; // email address, phone number, or FCM token
  metadata?: Record<string, unknown>;
  // NotificationDelivery row this job updates as it's processed (queued →
  // sent/failed). Created before enqueueing so the admin panel has a
  // durable record even if the job is still sitting in the queue.
  deliveryId: string;
}

// Structured data for the post-registration welcome email. Sent exactly once,
// when a patient's FIRST subscription (Free or Paid) becomes active.
export interface WelcomeEmailData {
  firstName: string;
  email: string;
  planName: string;
  planKind: 'Free' | 'Paid';
  registrationDate: string; // pre-formatted (WAT)
}

// Structured data for share notification emails.
export interface ShareNotificationData {
  recipientEmail: string;
  patientName: string;
  shareLabel: string | null;
  recordTypes: string[];
  expiresAt: Date | null;
  shareUrl: string;
  accessMode: string;
}

// Structured data for appointment lifecycle and reminder emails.
// Passed in job metadata so the processor can render a rich HTML card.
export interface AppointmentNotificationData {
  recipientName: string;
  hhaRef: string;
  serviceType: string;
  when: string;           // pre-formatted date/time string
  durationMinutes: number;
  isVirtual: boolean;
  providerName?: string | null;
  locationLine?: string | null;
  intro: string;
  outro?: string | null;
  cancelReason?: string | null;
  // Determines which portal the email's CTA button links to, and its label.
  // Defaults to the patient portal. Providers get 'provider' (labeled "Go to
  // provider dashboard"); ops mailbox / admin / coordinator recipients get
  // 'staff' (labeled "Go to admin dashboard") — both resolve to the same
  // admin.myvaultplus.com destination, only the label differs.
  portalType?: 'patient' | 'provider' | 'staff';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rateLimiter: NotificationRateLimiterService,
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJobData>,
  ) {}

  // Exposes the per-recipient rate limiter to callers outside this module
  // (e.g. AdminService.resendNotification) that enqueue jobs without going
  // through the send* helpers below — every enqueue path must gate on this,
  // or a resend/replay action can spam a recipient past the configured
  // per-channel budget regardless of who triggers it.
  async checkRateLimit(channel: NotificationChannel, to: string): Promise<boolean> {
    return this.rateLimiter.allow(channel, to);
  }

  // Creates the durable delivery record the admin panel reads from
  // (/admin/notifications), then hands its id to the queue job so the
  // processor can update the same row through queued → sent/failed as it
  // works. Called after the rate-limit check so throttled messages never
  // get a delivery row (matches the existing "silently drop" behavior).
  private async createDelivery(
    userId: string,
    channel: NotificationChannel,
    recipient: string,
    subject: string | undefined,
    body: string,
    shareId?: string,
  ): Promise<string> {
    const delivery = await this.prisma.notificationDelivery.create({
      data: { userId, channel, recipient, subject, body, status: 'queued', shareId },
      select: { id: true },
    });
    return delivery.id;
  }

  // All send-* helpers check the per-recipient limiter before enqueuing. When
  // a recipient is over budget we silently drop the message and log a warning
  // — UX-facing callers (e.g. "resend OTP") get the same response they always
  // do, so an attacker who triggers the throttle can't tell their target's
  // inbox is being protected.
  async sendEmail(to: string, subject: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('email', to))) return;
    const deliveryId = await this.createDelivery(userId, 'email', to, subject, body);
    await this.queue.add(
      'send-email',
      { userId, channel: 'email', to, subject, body, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async sendSms(to: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('sms', to))) return;
    const deliveryId = await this.createDelivery(userId, 'sms', to, undefined, body);
    await this.queue.add(
      'send-sms',
      { userId, channel: 'sms', to, body, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async sendPush(fcmToken: string, subject: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('push', fcmToken))) return;
    const deliveryId = await this.createDelivery(userId, 'push', fcmToken, subject, body);
    await this.queue.add(
      'send-push',
      { userId, channel: 'push', to: fcmToken, subject, body, deliveryId },
      { attempts: 3 },
    );
  }

  async sendOtpEmail(email: string, otp: string, userId: string) {
    const body = `Your Health Hub Africa verification code is: ${otp}\n\nThis code expires in 10 minutes.`;
    return this.sendEmail(email, 'Verify your Health Hub Africa account', body, userId);
  }

  // Telecare caregiver/family guest invite — link only, no code. The guest
  // verifies their email with a one-time code (sendGuestOtpEmail) at join
  // time, not here; this email just tells them where to go.
  async sendGuestCallInviteEmail(
    to: string,
    userId: string,
    data: { guestName: string; patientName: string; scheduledAt: Date; joinUrl: string },
  ) {
    const when = data.scheduledAt.toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
    });
    const subject = `${data.patientName} invited you to a Health Hub Africa video call`;
    const body =
      `Hi ${data.guestName},\n\n` +
      `${data.patientName} has invited you to join their telehealth video call on Health Hub Africa.\n\n` +
      `When: ${when} (WAT)\n\n` +
      `Join here: ${data.joinUrl}\n\n` +
      `You'll be asked to verify this email address with a one-time code before joining — this keeps the call private to people the patient has actually invited.\n\n` +
      `If you weren't expecting this invite, you can safely ignore this email.`;
    return this.sendEmail(to, subject, body, userId);
  }

  async sendGuestOtpEmail(to: string, userId: string, guestName: string, otp: string) {
    const body =
      `Hi ${guestName},\n\n` +
      `Your one-time code to join the video call is:\n\n${otp}\n\n` +
      `This code expires in 10 minutes. If you did not request this, please ignore this email.`;
    return this.sendEmail(to, 'Your Health Hub Africa call access code', body, userId);
  }

  private buildAppointmentEmailBody(data: AppointmentNotificationData): string {
    return (
      `Hi ${data.recipientName},\n\n${data.intro}\n\n` +
      `Reference: ${data.hhaRef}\nService: ${data.serviceType}\n` +
      `Date & time: ${data.when}\nDuration: ${data.durationMinutes} minutes\n` +
      (data.providerName ? `Provider: ${data.providerName}\n` : '') +
      (data.locationLine ? `${data.locationLine}\n` : '') +
      (data.outro ? `\n${data.outro}` : '') +
      '\n\n— Health Hub Africa'
    );
  }

  // Post-registration welcome email (approved copy) — fired once, on the
  // patient's first subscription activation. Plain-text body doubles as the
  // delivery-log record and the text/plain fallback; the processor renders
  // the branded HTML version.
  async sendWelcomeEmail(to: string, userId: string, data: WelcomeEmailData) {
    if (!(await this.rateLimiter.allow('email', to))) return;
    const subject = 'Welcome to MyHealth Vault+™ – Your Account Has Been Successfully Created';
    const body =
      `Dear ${data.firstName},\n\n` +
      `Welcome to MyHealth Vault+™, your secure digital health companion from Health-Hub Africa®.\n\n` +
      `We're delighted to let you know that your account has been successfully created.\n\n` +
      `Your Registration Details\n` +
      `- Account Status: Active\n` +
      `- Subscription Plan: ${data.planName} (${data.planKind})\n` +
      `- Registered Email: ${data.email}\n` +
      `- Registration Date: ${data.registrationDate}\n\n` +
      `Thank you for choosing MyHealth Vault+™ to securely manage your health information and access healthcare services anytime, anywhere.\n\n` +
      `What's Next?\n` +
      `- Verify your email address (if prompted) to activate all features.\n` +
      `- Complete your personal health profile: personal information, medical history, allergies, current medications, emergency contacts.\n` +
      `- Upload your important health records: laboratory results, imaging reports, medical summaries, vaccination records, prescriptions.\n` +
      `- Book your first appointment with one of our healthcare providers whenever you need care.\n\n` +
      `Need Assistance?\n` +
      `Health-Hub Africa® Support\n` +
      `Email: support@healthubafrica.com\n` +
      `Web: www.healthubafrica.com\n\n` +
      `Thank you for trusting Health-Hub Africa® with your healthcare journey. We look forward to serving you.\n\n` +
      `Warm regards,\nThe Health-Hub Africa® Team\n\nSpeed. Agility. Access.`;
    const deliveryId = await this.createDelivery(userId, 'email', to, subject, body);
    await this.queue.add(
      'send-welcome-email',
      { userId, channel: 'email', to, subject, body, metadata: { welcome: data }, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  // Convenience wrapper for the registration-welcome triggers: looks up the
  // patient and plan, assembles WelcomeEmailData, and swallows every failure
  // — a welcome email must never break subscription activation.
  async sendPatientWelcomeEmail(patientId: string, planId: string): Promise<void> {
    try {
      const [patient, plan] = await Promise.all([
        this.prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            firstName: true,
            createdAt: true,
            userId: true,
            user: { select: { email: true } },
          },
        }),
        this.prisma.subscriptionPlan.findUnique({
          where: { id: planId },
          select: { name: true, tier: true },
        }),
      ]);
      if (!patient?.user?.email || !plan) return;

      await this.sendWelcomeEmail(patient.user.email, patient.userId, {
        firstName: patient.firstName,
        email: patient.user.email,
        planName: plan.name,
        planKind: String(plan.tier) === 'Free' ? 'Free' : 'Paid',
        registrationDate: patient.createdAt.toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos',
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send welcome email for patient ${patientId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Rich HTML appointment email — routes to the dedicated appointment card template.
  async sendAppointmentEmail(
    to: string,
    subject: string,
    userId: string,
    data: AppointmentNotificationData,
  ) {
    if (!(await this.rateLimiter.allow('email', to))) return;
    const body = this.buildAppointmentEmailBody(data);
    const deliveryId = await this.createDelivery(userId, 'email', to, subject, body);
    await this.queue.add(
      'send-appointment-email',
      { userId, channel: 'email', to, subject, body, metadata: { appt: data }, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  // Appointment email to an internal ops mailbox (e.g. appointments@healthhubafrica.com)
  // rather than an individual user. Deliberately skips the per-recipient rate limiter:
  // that limiter protects a single person's inbox from abuse across many trigger paths,
  // but this is a shared operational address whose volume is bounded by real appointment
  // events — throttling it would silently hide legitimate activity from ops during busy periods.
  async sendOpsAppointmentEmail(
    to: string,
    subject: string,
    data: AppointmentNotificationData,
  ) {
    const body = this.buildAppointmentEmailBody(data);
    const deliveryId = await this.createDelivery(OPS_NOTIFICATION_USER_ID, 'email', to, subject, body);
    await this.queue.add(
      'send-appointment-email',
      { userId: OPS_NOTIFICATION_USER_ID, channel: 'email', to, subject, body, metadata: { appt: data }, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  // shareId links this delivery back to the RecordShare it was sent for, so
  // the Resend delivery webhook (see NotificationsService.handleResendWebhook)
  // can mirror delivered/bounced status onto that share's RecordShareAccess
  // audit trail, not just this delivery row.
  async sendShareNotificationEmail(
    to: string,
    subject: string,
    userId: string,
    data: ShareNotificationData,
    shareId?: string,
  ) {
    if (!(await this.rateLimiter.allow('email', to))) return;
    const recordList = data.recordTypes.length
      ? data.recordTypes.join(', ')
      : 'General health records';
    const expiryLine = data.expiresAt
      ? `Expires: ${data.expiresAt.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })} (WAT)`
      : 'This link does not expire unless revoked by the sender.';
    const body =
      `${data.patientName} has shared health records with you via Health Hub Africa.\n\n` +
      `Documents: ${recordList}\n${expiryLine}\n\n` +
      `Access the records here: ${data.shareUrl}\n\n` +
      `How to access: Open the link and enter your email address. You will receive a one-time verification code to confirm your identity.\n\n` +
      `Security: This link is intended only for you. Every access is logged and visible to the sender, who can revoke access at any time.`;
    const deliveryId = await this.createDelivery(userId, 'email', to, subject, body, shareId);
    await this.queue.add(
      'send-share-notification-email',
      { userId, channel: 'email', to, subject, body, metadata: { share: data }, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  // ── Resend delivery webhook ──────────────────────────────────────────────
  //
  // Resend signs webhook payloads using Svix. Verifies svix-id.svix-timestamp.body
  // against RESEND_WEBHOOK_SECRET (the "whsec_..." signing secret from the
  // Resend dashboard), then maps the event back to the NotificationDelivery
  // row created at send time via providerRef (Resend's email id), and — for
  // share-link emails — mirrors delivered status onto that share's
  // RecordShareAccess audit trail.
  verifyResendWebhookSignature(
    rawBody: Buffer,
    svixId: string | undefined,
    svixTimestamp: string | undefined,
    svixSignature: string | undefined,
  ): void {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Resend webhook not configured');
    }
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('Missing Svix signature headers');
    }

    // Reject stale payloads (5 minute tolerance) to limit replay of a captured request.
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(svixTimestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new UnauthorizedException('Webhook timestamp outside tolerance');
    }

    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', secretBytes).update(signedContent).digest();

    // svix-signature is a space-separated list of "v1,<base64sig>" values —
    // one entry per active signing secret, so a single valid match is enough.
    const provided = svixSignature.split(' ').map((entry) => entry.split(',')[1]).filter(Boolean);
    const isValid = provided.some((sig) => {
      const sigBytes = Buffer.from(sig, 'base64');
      return sigBytes.length === expected.length && timingSafeEqual(sigBytes, expected);
    });
    if (!isValid) {
      throw new UnauthorizedException('Invalid Resend webhook signature');
    }
  }

  async handleResendWebhook(
    rawBody: Buffer,
    svixId: string | undefined,
    svixTimestamp: string | undefined,
    svixSignature: string | undefined,
  ): Promise<{ ok: true }> {
    this.verifyResendWebhookSignature(rawBody, svixId, svixTimestamp, svixSignature);

    let event: { type?: string; data?: { email_id?: string } };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new UnauthorizedException('Malformed webhook payload');
    }

    const providerRef = event.data?.email_id;
    if (!providerRef || !event.type) return { ok: true };

    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: { providerRef },
    });
    if (!delivery) return { ok: true }; // Not one of ours, or already pruned — nothing to update.

    if (event.type === 'email.delivered') {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: 'delivered', deliveredAt: new Date() },
      });
      if (delivery.shareId) {
        await this.logShareDeliveredOnce(delivery.shareId, delivery.recipient);
      }
    } else if (event.type === 'email.bounced' || event.type === 'email.delivery_delayed') {
      const reason = event.type === 'email.bounced' ? 'bounced' : 'delivery delayed';
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: 'failed', failedAt: new Date(), failureReason: `Resend: ${reason}` },
      });
    }
    // Other event types (email.sent, email.complained, email.opened, email.clicked)
    // don't change delivery status here — "sent" is already recorded at send
    // time, and complaint/open/click tracking is out of scope for this webhook.

    return { ok: true };
  }

  // Idempotent: a webhook can retry, and a share can be sent to more than
  // one recipient, so scope the "already logged" check to this share + this
  // specific recipient rather than the share as a whole.
  private async logShareDeliveredOnce(shareId: string, recipient: string): Promise<void> {
    const already = await this.prisma.recordShareAccess.findFirst({
      where: { shareId, action: 'link_delivered', visitorEmail: recipient },
      select: { id: true },
    });
    if (already) return;
    await this.prisma.recordShareAccess.create({
      data: { shareId, action: 'link_delivered', visitorEmail: recipient, metadata: { channel: 'email' } },
    });
  }

  /** @deprecated Use sendAppointmentEmail for appointment-related notifications */
  async sendAppointmentReminder(
    email: string,
    phone: string | null,
    appointmentDetails: { providerName: string; dateTime: string },
    userId: string,
  ) {
    const body = `Reminder: You have an appointment with ${appointmentDetails.providerName} at ${appointmentDetails.dateTime}.`;
    await this.sendEmail(email, 'Appointment Reminder — Health Hub Africa', body, userId);
    if (phone) await this.sendSms(phone, body, userId);
  }
}
