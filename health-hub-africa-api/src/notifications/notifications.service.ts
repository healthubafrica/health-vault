import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
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
  ): Promise<string> {
    const delivery = await this.prisma.notificationDelivery.create({
      data: { userId, channel, recipient, subject, body, status: 'queued' },
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

  async sendShareNotificationEmail(
    to: string,
    subject: string,
    userId: string,
    data: ShareNotificationData,
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
    const deliveryId = await this.createDelivery(userId, 'email', to, subject, body);
    await this.queue.add(
      'send-share-notification-email',
      { userId, channel: 'email', to, subject, body, metadata: { share: data }, deliveryId },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
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
