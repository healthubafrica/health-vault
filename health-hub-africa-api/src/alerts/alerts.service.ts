import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AlertSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { fetchLoginAttemptsSince, detectLoginLocationAnomalies } from '../analytics/login-anomaly.util';

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
// Spec §29: repeated failed login by one account (targeted credential
// guessing), and a spray/credential-stuffing pattern (many distinct
// accounts, not one) — deliberately different thresholds/severities since
// they're different attack shapes, not the same detector run twice.
const ACCOUNT_FAILED_LOGIN_WINDOW_MIN = 30;
const ACCOUNT_FAILED_LOGIN_THRESHOLD = 5;
const CREDENTIAL_STUFFING_WINDOW_MIN = 30;
const CREDENTIAL_STUFFING_ACCOUNT_THRESHOLD = 15;
// Spec §29 "rapid country/region changes" — reuses the same detection the
// Security dashboard already reports (analytics/login-anomaly.util.ts) on a
// tighter, alert-appropriate window.
const LOGIN_ANOMALY_WINDOW_MIN = 60;
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
    await this.checkRepeatedFailedLoginPerAccount();
    await this.checkCredentialStuffingPattern();
    await this.checkLoginLocationAnomaly();
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

  // Spec §29: "Repeated failed login by patient/account" — one account,
  // many failures. Deduped per account (the account id rides in `type`, so
  // recentlyAlerted() naturally scopes the dedupe window to that one
  // account instead of every account sharing a single cooldown).
  private async checkRepeatedFailedLoginPerAccount(): Promise<void> {
    const since = new Date(Date.now() - ACCOUNT_FAILED_LOGIN_WINDOW_MIN * 60_000);
    const rows = await this.prisma.$queryRaw<Array<{ userId: string; email: string; count: bigint }>>`
      SELECT le."user_id" AS "userId", u."email", COUNT(*) AS count
      FROM "login_events" le
      INNER JOIN "users" u ON u."id" = le."user_id"
      WHERE le."success" = false AND le."occurred_at" >= ${since}
      GROUP BY le."user_id", u."email"
      HAVING COUNT(*) >= ${ACCOUNT_FAILED_LOGIN_THRESHOLD}
    `;

    for (const row of rows) {
      const type = `repeated_failed_login:${row.userId}`;
      if (await this.recentlyAlerted(type)) continue;

      const count = Number(row.count);
      await this.raise({
        type,
        severity: AlertSeverity.warning,
        title: `Repeated failed logins on one account — ${count} in the last ${ACCOUNT_FAILED_LOGIN_WINDOW_MIN} minutes`,
        body: `${row.email} has had ${count} failed login attempts in the last ${ACCOUNT_FAILED_LOGIN_WINDOW_MIN} minutes (threshold: ${ACCOUNT_FAILED_LOGIN_THRESHOLD}). Could be the account owner locked out of their own password, or a targeted credential-guessing attempt.`,
        metadata: { userId: row.userId, email: row.email, count, windowMinutes: ACCOUNT_FAILED_LOGIN_WINDOW_MIN },
      });
    }
  }

  // Spec §29: "High-volume failures across many accounts from one or
  // rotating IPs" — the distinguishing signal from the detector above is
  // breadth (many accounts, not one), which is what a credential-stuffing
  // run against a leaked password list looks like; per-IP concentration
  // isn't required to make that call.
  private async checkCredentialStuffingPattern(): Promise<void> {
    const since = new Date(Date.now() - CREDENTIAL_STUFFING_WINDOW_MIN * 60_000);
    const [row] = await this.prisma.$queryRaw<Array<{ accounts: bigint }>>`
      SELECT COUNT(DISTINCT le."user_id") AS accounts
      FROM "login_events" le
      WHERE le."success" = false AND le."occurred_at" >= ${since}
    `;

    const accountCount = Number(row?.accounts ?? 0);
    if (accountCount < CREDENTIAL_STUFFING_ACCOUNT_THRESHOLD) return;
    if (await this.recentlyAlerted('credential_stuffing_pattern')) return;

    await this.raise({
      type: 'credential_stuffing_pattern',
      severity: AlertSeverity.critical,
      title: `Failed logins spread across ${accountCount} accounts — possible credential stuffing`,
      body: `${accountCount} distinct accounts had a failed login in the last ${CREDENTIAL_STUFFING_WINDOW_MIN} minutes (threshold: ${CREDENTIAL_STUFFING_ACCOUNT_THRESHOLD}). A bad actor working through a leaked credential list is the more likely explanation at this spread than organic user error.`,
      metadata: { accountCount, windowMinutes: CREDENTIAL_STUFFING_WINDOW_MIN },
    });
  }

  // Spec §29: "Rapid country/region changes where materially suspicious" —
  // and its own caution not to auto-classify legitimate diaspora/VPN/travel
  // behaviour as malicious. This raises a reviewable signal, not an
  // accusation — the body text says so explicitly, and severity stays at
  // warning, not critical.
  private async checkLoginLocationAnomaly(): Promise<void> {
    const since = new Date(Date.now() - LOGIN_ANOMALY_WINDOW_MIN * 60_000);
    const attempts = await fetchLoginAttemptsSince(this.prisma, since);
    const anomalies = detectLoginLocationAnomalies(attempts);
    if (anomalies.length === 0) return;
    if (await this.recentlyAlerted('login_location_anomaly')) return;

    const preview = anomalies.slice(0, 5).map((a) => `${a.email}: ${a.fromCountry} → ${a.toCountry}`).join('; ');
    const overflow = anomalies.length > 5 ? `, and ${anomalies.length - 5} more` : '';
    await this.raise({
      type: 'login_location_anomaly',
      severity: AlertSeverity.warning,
      title: `${anomalies.length} account${anomalies.length === 1 ? '' : 's'} logged in from a new country in the last ${LOGIN_ANOMALY_WINDOW_MIN} minutes`,
      body: `Consecutive successful logins from different countries for the same account — can be legitimate travel or VPN use, or a compromised credential; review before acting: ${preview}${overflow}.`,
      metadata: { count: anomalies.length, anomalies: anomalies.slice(0, 20) },
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
