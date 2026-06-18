import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationRateLimiterService } from './notification-rate-limiter.service';

export const NOTIFICATIONS_QUEUE = 'notifications';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'whatsapp';

export interface NotificationJobData {
  userId: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  to: string; // email address, phone number, or FCM token
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rateLimiter: NotificationRateLimiterService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJobData>,
  ) {}

  // All send-* helpers check the per-recipient limiter before enqueuing. When
  // a recipient is over budget we silently drop the message and log a warning
  // — UX-facing callers (e.g. "resend OTP") get the same response they always
  // do, so an attacker who triggers the throttle can't tell their target's
  // inbox is being protected.
  async sendEmail(to: string, subject: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('email', to))) return;
    await this.queue.add(
      'send-email',
      { userId, channel: 'email', to, subject, body },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async sendSms(to: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('sms', to))) return;
    await this.queue.add(
      'send-sms',
      { userId, channel: 'sms', to, body },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  async sendPush(fcmToken: string, subject: string, body: string, userId: string) {
    if (!(await this.rateLimiter.allow('push', fcmToken))) return;
    await this.queue.add(
      'send-push',
      { userId, channel: 'push', to: fcmToken, subject, body },
      { attempts: 3 },
    );
  }

  async sendOtpEmail(email: string, otp: string, userId: string) {
    const body = `Your Health Hub Africa verification code is: ${otp}\n\nThis code expires in 10 minutes.`;
    return this.sendEmail(email, 'Verify your Health Hub Africa account', body, userId);
  }

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
