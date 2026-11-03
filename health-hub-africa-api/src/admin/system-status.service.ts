import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { UserRole } from '@prisma/client';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService, OPENEMR_SYNC_QUEUE } from '../openemr/openemr.service';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.service';
import { ALERTS_QUEUE } from '../alerts/alerts.service';
import { APPOINTMENT_REMINDERS_QUEUE } from '../appointments/appointments.service';
import { TELECARE_QUEUE } from '../telecare/telecare.service';
import { ANALYTICS_AGGREGATION_QUEUE } from '../analytics-aggregation/analytics-aggregation.service';
import { ANALYTICS_RECONCILIATION_QUEUE } from '../analytics-reconciliation/analytics-reconciliation.service';
import { ADMIN_REDIS } from './admin.service';

export type CheckStatus = 'ok' | 'warn' | 'down' | 'unknown';

export interface StatusCheck {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
  link?: string;
}

export interface SystemStatus {
  overall: CheckStatus;
  checkedAt: string;
  checks: StatusCheck[];
}

const RANK: Record<CheckStatus, number> = { ok: 0, unknown: 1, warn: 2, down: 3 };
const CHECK_TIMEOUT_MS = 3_000;
const CACHE_MS = 30_000;
const SPEND_CACHE_MS = 12 * 60 * 60 * 1000; // Cost Explorer bills $0.01 per call
const DAY_MS = 24 * 60 * 60 * 1000;
// Alarms live in af-south-1; the Route 53 external uptime alarm must live in us-east-1.
const ALARM_REGIONS = ['af-south-1', 'us-east-1'];
const AWS_CONSOLE = 'https://af-south-1.console.aws.amazon.com';

export const worst = (statuses: CheckStatus[]): CheckStatus =>
  statuses.reduce<CheckStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), 'ok');

/** Over-threshold → status, checked in order; anything under every threshold is ok. */
const grade = (value: number, warnAt: number, downAt = Infinity): CheckStatus =>
  value >= downAt ? 'down' : value >= warnAt ? 'warn' : 'ok';

@Injectable()
export class SystemStatusService {
  private readonly logger = new Logger(SystemStatusService.name);
  private cache: { at: number; value: SystemStatus } | null = null;
  private spendCache: { at: number; value: StatusCheck } | null = null;
  private readonly queues: Queue[];
  private readonly budgetUsd: number;
  private readonly openemrBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemr: OpenemrService,
    config: ConfigService,
    @Inject(ADMIN_REDIS) private readonly redis: Redis,
    @InjectQueue(OPENEMR_SYNC_QUEUE) openemrQueue: Queue,
    @InjectQueue(NOTIFICATIONS_QUEUE) notificationsQueue: Queue,
    @InjectQueue(ALERTS_QUEUE) alertsQueue: Queue,
    @InjectQueue(APPOINTMENT_REMINDERS_QUEUE) remindersQueue: Queue,
    @InjectQueue(TELECARE_QUEUE) telecareQueue: Queue,
    @InjectQueue(ANALYTICS_AGGREGATION_QUEUE) aggregationQueue: Queue,
    @InjectQueue(ANALYTICS_RECONCILIATION_QUEUE) reconciliationQueue: Queue,
  ) {
    this.queues = [openemrQueue, notificationsQueue, alertsQueue, remindersQueue, telecareQueue, aggregationQueue, reconciliationQueue];
    this.budgetUsd = Number(config.get('AWS_MONTHLY_BUDGET_USD', 350));
    this.openemrBase = config.get<string>('OPENEMR_BASE_URL', '');
  }

  async getStatus(role: string): Promise<SystemStatus> {
    if (!this.cache || Date.now() - this.cache.at > CACHE_MS) {
      this.cache = { at: Date.now(), value: await this.runChecks() };
    }
    const { value } = this.cache;
    if (role === UserRole.super_admin) return value;
    // Spend is super_admin-only; drop it and recompute overall without it.
    const checks = value.checks.filter((c) => c.key !== 'spend');
    return { ...value, checks, overall: worst(checks.map((c) => c.status)) };
  }

  private async runChecks(): Promise<SystemStatus> {
    const defs: [string, string, () => Promise<Omit<StatusCheck, 'key' | 'label'>>][] = [
      ['database', 'API & database', () => this.database()],
      ['redis', 'Redis', () => this.redisPing()],
      ['jobs', 'Background jobs', () => this.jobs()],
      ['openemr', 'OpenEMR', () => this.openemrReachable()],
      ['sync', 'OpenEMR sync', () => this.sync()],
      ['integration-errors', 'Integration errors (24h)', () => this.integrationErrors()],
      ['notifications', 'Notifications (24h)', () => this.notifications()],
      ['payments', 'Payments (24h)', () => this.payments()],
      ['aws-alarms', 'AWS alarms', () => this.awsAlarms()],
      ['spend', 'AWS spend (month to date)', () => this.spend()],
      ['release', 'Release', () => this.release()],
    ];
    const checks = await Promise.all(defs.map(([key, label, run]) => this.guard(key, label, run)));
    return { overall: worst(checks.map((c) => c.status)), checkedAt: new Date().toISOString(), checks };
  }

  /** One slow or broken dependency must never blank the page: timeout/throw → unknown. */
  private async guard(key: string, label: string, run: () => Promise<Omit<StatusCheck, 'key' | 'label'>>): Promise<StatusCheck> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS / 1000}s`)), CHECK_TIMEOUT_MS);
    });
    try {
      return { key, label, ...(await Promise.race([run(), timeout])) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Status check ${key} failed: ${message}`);
      return { key, label, status: 'unknown', detail: `Check failed: ${message}` };
    } finally {
      clearTimeout(timer);
    }
  }

  private async database() {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - start;
    return { status: grade(ms, 200), detail: `Connected · ${ms} ms`, link: `${AWS_CONSOLE}/rds/home?region=af-south-1#databases:` };
  }

  private async redisPing() {
    const start = Date.now();
    await this.redis.ping();
    const ms = Date.now() - start;
    return { status: grade(ms, 200), detail: `Connected · ${ms} ms` };
  }

  private async jobs() {
    const since = Date.now() - DAY_MS;
    const rows = await Promise.all(
      this.queues.map(async (q) => {
        const [counts, failed] = await Promise.all([q.getJobCounts(), q.getFailed(0, 199)]);
        return { name: q.name, waiting: counts.waiting, failed: failed.filter((j) => (j.finishedOn ?? 0) >= since).length };
      }),
    );
    const problems = rows.filter((r) => r.failed > 0 || r.waiting > 500);
    if (!problems.length) return { status: 'ok' as const, detail: `${rows.length} queues · no failures in 24h` };
    return {
      status: 'warn' as const,
      detail: problems.map((r) => `${r.name}: ${r.failed} failed, ${r.waiting} waiting`).join(' · '),
    };
  }

  private async openemrReachable() {
    // FHIR metadata is public: proves the server is up without spending a token.
    const start = Date.now();
    const res = await fetch(`${this.openemrBase}/apis/default/fhir/metadata`, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS - 500) });
    const ms = Date.now() - start;
    if (!res.ok) return { status: 'down' as const, detail: `Server returned HTTP ${res.status}`, link: '/system/sync' };
    try {
      await this.openemr.getAccessToken();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'down' as const, detail: `Reachable, but sign-in failing: ${message}`, link: '/system/sync' };
    }
    return { status: 'ok' as const, detail: `Reachable and signed in · ${ms} ms`, link: '/system/sync' };
  }

  private async sync() {
    const [pending, failed, oldest] = await Promise.all([
      this.prisma.openemrSyncQueue.count({ where: { status: 'pending' } }),
      this.prisma.openemrSyncQueue.count({ where: { status: 'failed' } }),
      this.prisma.openemrSyncQueue.findFirst({
        where: { status: 'pending', scheduledFor: { lte: new Date() } },
        orderBy: { scheduledFor: 'asc' },
        select: { scheduledFor: true },
      }),
    ]);
    const ageMin = oldest ? Math.floor((Date.now() - oldest.scheduledFor.getTime()) / 60_000) : 0;
    const status = worst([grade(ageMin, 15, 60), failed > 0 ? 'warn' : 'ok']);
    const age = oldest ? ` · oldest waiting ${ageMin} min` : '';
    return { status, detail: `${pending} pending, ${failed} failed${age}`, link: '/system/sync' };
  }

  private async integrationErrors() {
    const rows = await this.prisma.integrationError.groupBy({
      by: ['service'],
      where: { resolvedAt: null, occurredAt: { gte: new Date(Date.now() - DAY_MS) } },
      _count: { _all: true },
    });
    const total = rows.reduce((n, r) => n + r._count._all, 0);
    const detail = total ? rows.map((r) => `${r.service}: ${r._count._all}`).join(' · ') : 'None unresolved';
    return { status: grade(total, 1, 10), detail, link: '/system/errors' };
  }

  private async notifications() {
    const rows = await this.prisma.notificationDelivery.groupBy({
      by: ['channel', 'status'],
      where: { createdAt: { gte: new Date(Date.now() - DAY_MS) } },
      _count: { _all: true },
    });
    const byChannel = new Map<string, { total: number; failed: number }>();
    for (const r of rows) {
      const c = byChannel.get(r.channel) ?? { total: 0, failed: 0 };
      byChannel.set(r.channel, {
        total: c.total + r._count._all,
        failed: c.failed + (r.status === 'failed' ? r._count._all : 0),
      });
    }
    if (!byChannel.size) return { status: 'ok' as const, detail: 'Nothing sent', link: '/notifications' };
    const parts = [...byChannel].map(([channel, c]) => ({ channel, ...c, rate: c.failed / c.total }));
    return {
      status: worst(parts.map((p) => grade(p.rate, 0.05, 0.2))),
      detail: parts.map((p) => `${p.channel}: ${p.total - p.failed} sent, ${p.failed} failed`).join(' · '),
      link: '/notifications',
    };
  }

  private async payments() {
    const since = new Date(Date.now() - DAY_MS);
    const [paid, failed, last] = await Promise.all([
      this.prisma.payment.count({ where: { status: 'paid', paidAt: { gte: since } } }),
      this.prisma.payment.count({ where: { status: 'failed', createdAt: { gte: since } } }),
      this.prisma.payment.findFirst({ where: { status: 'paid' }, orderBy: { paidAt: 'desc' }, select: { paidAt: true } }),
    ]);
    const lastPaid = last?.paidAt ? ` · last success ${last.paidAt.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '';
    return { status: grade(failed, 1), detail: `${paid} paid, ${failed} failed${lastPaid}`, link: '/payments' };
  }

  private async awsAlarms() {
    const firing = (
      await Promise.all(
        ALARM_REGIONS.map(async (region) => {
          const res = await new CloudWatchClient({ region }).send(new DescribeAlarmsCommand({ StateValue: 'ALARM' }));
          return (res.MetricAlarms ?? []).map((a) => a.AlarmName ?? 'unnamed');
        }),
      )
    ).flat();
    return {
      status: firing.length ? ('down' as const) : ('ok' as const),
      detail: firing.length ? `Firing: ${firing.join(', ')}` : 'No alarms firing',
      link: `${AWS_CONSOLE}/cloudwatch/home?region=af-south-1#alarmsV2:`,
    };
  }

  private async spend() {
    if (this.spendCache && Date.now() - this.spendCache.at < SPEND_CACHE_MS) return this.spendCache.value;
    const now = new Date();
    const start = `${now.toISOString().slice(0, 8)}01`;
    // End is exclusive; on the 1st, Start === today, so push End a day out.
    const end = new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
    const res = await new CostExplorerClient({ region: 'us-east-1' }).send(
      new GetCostAndUsageCommand({ TimePeriod: { Start: start, End: end }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'] }),
    );
    const usd = Number(res.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount ?? 0);
    const value: StatusCheck = {
      key: 'spend',
      label: 'AWS spend (month to date)',
      status: grade(usd / this.budgetUsd, 0.8, 1),
      detail: `$${usd.toFixed(2)} of $${this.budgetUsd} budget`,
      link: 'https://us-east-1.console.aws.amazon.com/costmanagement/home#/home',
    };
    this.spendCache = { at: Date.now(), value };
    return value;
  }

  private async release() {
    const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString().slice(0, 16).replace('T', ' ');
    // On ECS the image tag is the deployed commit SHA (deploy-api.yml tags with github.sha).
    const metaUri = process.env.ECS_CONTAINER_METADATA_URI_V4;
    let version = 'local';
    if (metaUri) {
      const meta = (await (await fetch(metaUri, { signal: AbortSignal.timeout(1_000) })).json()) as { Image?: string };
      version = meta.Image?.split(':').pop()?.slice(0, 7) ?? 'unknown';
    }
    return {
      status: 'ok' as const,
      detail: `API ${version} · running since ${startedAt} UTC`,
      link: version.length === 7 ? `https://github.com/healthubafrica/health-vault/commit/${version}` : undefined,
    };
  }
}
