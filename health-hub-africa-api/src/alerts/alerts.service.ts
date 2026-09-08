import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AlertSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const ALERTS_QUEUE = 'admin-alerts';

// Detection thresholds — spec §29 (Security Monitoring Rules) / §2 (Alert
// Layer). ponytail: fixed constants, not admin-configurable yet; there's no
// real traffic volume to calibrate against, so tune these once there is
// rather than building a settings UI for numbers nobody's tested.
const OTP_FAILURE_WINDOW_MIN = 15;
const OTP_FAILURE_THRESHOLD = 5;
const BOOKING_WINDOW_MIN = 60;
const BOOKING_MIN_SAMPLE = 5;
const BOOKING_ABANDONMENT_RATE_THRESHOLD = 0.7; // 70%+ started-but-not-confirmed
// Don't re-fire the same alert type more often than this even if the
// condition is still true on every 15-min tick — an ops inbox that pings
// every 15 minutes for one ongoing issue trains people to ignore it.
const DEDUPE_WINDOW_HOURS = 2;

interface RaiseAlertInput {
  type: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @InjectQueue(ALERTS_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    // Repeatables accumulate across deploys if left in place — clear ours
    // first so changes to the cron expression actually take effect.
    const repeatables = await this.queue.getRepeatableJobs();
    for (const r of repeatables.filter((j) => j.name === 'check-alerts')) {
      await this.queue.removeRepeatableByKey(r.key);
    }
    await this.queue.add('check-alerts', {}, { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 });
  }

  async runChecks(): Promise<void> {
    await this.checkOtpFailureSpike();
    await this.checkBookingAbandonment();
  }

  // ── Detectors ────────────────────────────────────────────────────────────

  private async checkOtpFailureSpike(): Promise<void> {
    const since = new Date(Date.now() - OTP_FAILURE_WINDOW_MIN * 60_000);
    const count = await this.prisma.patientActivityEvent.count({
      where: { eventName: 'otp_verify_failure', occurredAt: { gte: since } },
    });
    if (count < OTP_FAILURE_THRESHOLD) return;
    if (await this.recentlyAlerted('otp_failure_spike')) return;

    await this.raise({
      type: 'otp_failure_spike',
      severity: AlertSeverity.warning,
      title: `OTP verification failures spiking — ${count} in the last ${OTP_FAILURE_WINDOW_MIN} minutes`,
      body: `${count} failed OTP verification attempts in the last ${OTP_FAILURE_WINDOW_MIN} minutes (threshold: ${OTP_FAILURE_THRESHOLD}). Could indicate an SMS/email delivery problem, a brute-force attempt, or a UX issue with code entry.`,
      metadata: { count, windowMinutes: OTP_FAILURE_WINDOW_MIN, threshold: OTP_FAILURE_THRESHOLD },
    });
  }

  private async checkBookingAbandonment(): Promise<void> {
    const since = new Date(Date.now() - BOOKING_WINDOW_MIN * 60_000);
    const [started, confirmed] = await Promise.all([
      this.prisma.patientActivityEvent.count({ where: { eventName: 'booking_started', occurredAt: { gte: since } } }),
      this.prisma.patientActivityEvent.count({ where: { eventName: 'booking_confirmed', occurredAt: { gte: since } } }),
    ]);
    if (started < BOOKING_MIN_SAMPLE) return;
    const rate = 1 - confirmed / started;
    if (rate < BOOKING_ABANDONMENT_RATE_THRESHOLD) return;
    if (await this.recentlyAlerted('booking_abandonment_spike')) return;

    const ratePct = Math.round(rate * 100);
    await this.raise({
      type: 'booking_abandonment_spike',
      severity: AlertSeverity.warning,
      title: `Booking abandonment at ${ratePct}% in the last ${BOOKING_WINDOW_MIN} minutes`,
      body: `${started} bookings started, only ${confirmed} confirmed in the last ${BOOKING_WINDOW_MIN} minutes (${ratePct}% abandonment, threshold: ${Math.round(BOOKING_ABANDONMENT_RATE_THRESHOLD * 100)}%). Could indicate a broken booking step, a payment gateway issue, or no available slots.`,
      metadata: { started, confirmed, rate, windowMinutes: BOOKING_WINDOW_MIN },
    });
  }

  private async recentlyAlerted(type: string): Promise<boolean> {
    const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60_000);
    const existing = await this.prisma.adminAlert.findFirst({
      where: { type, createdAt: { gte: since } },
      select: { id: true },
    });
    return !!existing;
  }

  private async raise(alert: RaiseAlertInput): Promise<void> {
    await this.prisma.adminAlert.create({
      data: {
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        body: alert.body,
        metadata: alert.metadata as Prisma.InputJsonValue,
      },
    });

    // Same global distribution list appointments.service.ts's ops emails use.
    const recipients = await this.prisma.notificationRecipient.findMany({
      where: { isActive: true },
      select: { email: true },
    });
    for (const r of recipients) {
      await this.notifications.sendEmail(r.email, `[HHA Alert] ${alert.title}`, alert.body);
    }
    this.logger.warn(`Alert raised: ${alert.type} — ${alert.title}`);
  }

  // ── Admin API ────────────────────────────────────────────────────────────

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.adminAlert.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.adminAlert.count(),
      this.prisma.adminAlert.count({ where: { isRead: false } }),
    ]);
    return { data, meta: { total, page, limit, unreadCount } };
  }

  async markRead(id: string) {
    return this.prisma.adminAlert.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
