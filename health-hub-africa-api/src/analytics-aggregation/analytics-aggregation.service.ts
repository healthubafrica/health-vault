import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import {
  aggregateAppointmentRows,
  aggregateDispatchRows,
  aggregateTravelSafeRows,
  fetchServiceUsageRowsForDay,
  UsageBucket,
} from './service-usage-aggregation.util';
import { aggregateRevenueRows, fetchPaymentRowsForDay } from './revenue-aggregation.util';
import { aggregateFunnelEventRows, fetchFunnelEventRowsForDay } from './funnel-aggregation.util';
import { aggregateDimensionEventRows, fetchDimensionEventRowsForDay } from './dimension-aggregation.util';

export const ANALYTICS_AGGREGATION_QUEUE = 'analytics-aggregation';

// ~3 months per request — enough for any real gap (a redeploy pause, a
// pipeline bug caught late) without one request silently churning years of
// history against production Postgres.
const MAX_BACKFILL_DAYS = 92;

export interface BackfillDayResult {
  reportDate: string;
  status: 'ok' | 'error';
  error?: string;
}

// Cron runs once every 24h — see getPipelineHealth.
const STALE_AFTER_HOURS = 30;

export interface PipelineHealth {
  lastRunAt: string | null;
  lastReportDate: string | null;
  isStale: boolean;
}

/**
 * Spec §25 (Data Warehouse / Aggregation Configuration) — populates the
 * previously-unwritten `ServiceUsageDaily` and `RevenueSummary` tables so
 * operational dashboards can eventually read pre-aggregated rows instead of
 * scanning raw transactional tables on every request. Nothing reads these
 * tables yet — this PR only writes them; wiring dashboard queries over to
 * them is a follow-up once a day or two of real rows exist to validate
 * against.
 */
@Injectable()
export class AnalyticsAggregationService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ANALYTICS_AGGREGATION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    const repeatables = await this.queue.getRepeatableJobs();
    for (const r of repeatables.filter((j) => j.name === 'aggregate-daily')) {
      await this.queue.removeRepeatableByKey(r.key);
    }
    // Runs once a day at 01:15 UTC — 2h15m after the prior WAT business day
    // ends (WAT midnight = UTC 23:00, see dayWindow()), giving it time to
    // settle rather than racing still-in-flight late-night rows.
    await this.queue.add('aggregate-daily', {}, { repeat: { cron: '15 1 * * *' }, removeOnComplete: 10 });
  }

  /** Aggregates the previous WAT (Africa/Lagos, UTC+1) business day — see
   * dayWindow() for why that's not the same as a UTC calendar day.
   * Idempotent — safe to re-run for the same day (upserts on the tables'
   * unique keys), which is what lets a redeploy or manual retrigger
   * recompute a day without duplicating rows. */
  async runDailyAggregation(forDate?: Date): Promise<void> {
    const { start, end, reportDate } = this.dayWindow(forDate ?? new Date());

    try {
      await this.aggregateServiceUsage(start, end, reportDate);
      await this.aggregateRevenue(start, end, reportDate);
      await this.aggregateFunnelMetrics(start, end, reportDate);
      await this.aggregateDimensionMetrics(start, end, reportDate);
    } catch (err) {
      this.logger.error(
        `Daily analytics aggregation failed for ${reportDate.toISOString().slice(0, 10)}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /** Re-runs runDailyAggregation for every calendar day in [fromReportDate,
   * toReportDate] (inclusive, UTC) — the operational backfill/reprocessing
   * path spec §25 calls for, so a gap (a redeploy pause, a pipeline bug
   * caught late) doesn't require a one-off script. Sequential rather than
   * Promise.all: a wide range hitting Postgres concurrently would contend
   * with the live cron job and dashboard reads, and this is an operational
   * action, not a latency-sensitive one. Runs every day even after one
   * fails, returning one result per day, so a bad day in the middle of a
   * range doesn't hide whether the rest succeeded. */
  async runBackfill(fromReportDate: Date, toReportDate: Date): Promise<BackfillDayResult[]> {
    const cursor = new Date(Date.UTC(fromReportDate.getUTCFullYear(), fromReportDate.getUTCMonth(), fromReportDate.getUTCDate()));
    const last = new Date(Date.UTC(toReportDate.getUTCFullYear(), toReportDate.getUTCMonth(), toReportDate.getUTCDate()));
    if (cursor.getTime() > last.getTime()) {
      throw new BadRequestException('fromReportDate must not be after toReportDate');
    }
    const spanDays = Math.round((last.getTime() - cursor.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (spanDays > MAX_BACKFILL_DAYS) {
      throw new BadRequestException(`Backfill range too large (${spanDays} days) — max ${MAX_BACKFILL_DAYS} days per request`);
    }

    const results: BackfillDayResult[] = [];
    while (cursor.getTime() <= last.getTime()) {
      const reportDate = cursor.toISOString().slice(0, 10);
      // runDailyAggregation aggregates the day BEFORE its `forDate` arg
      // (see dayWindow below) — pass the day after the target report date.
      const forDate = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      try {
        await this.runDailyAggregation(forDate);
        results.push({ reportDate, status: 'ok' });
      } catch (err) {
        results.push({ reportDate, status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return results;
  }

  /** Data-freshness signal for the admin dashboard (spec §25) — the most
   * recent `updatedAt` across the 4 pre-aggregate tables, since there's no
   * dedicated job-run log and the cron processor already swallows per-run
   * errors (logs, doesn't rethrow), so Bull's own job-completion history
   * wouldn't reliably distinguish a real success from a silent failure
   * either. Whichever table a run actually wrote to is a fine proxy for
   * "the pipeline ran" in practice, since a real production day almost
   * always produces at least a page_view row. */
  async getPipelineHealth(): Promise<PipelineHealth> {
    const [usage, revenue, funnel, dimension] = await Promise.all([
      this.prisma.serviceUsageDaily.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true, reportDate: true } }),
      this.prisma.revenueSummary.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true, reportDate: true } }),
      this.prisma.funnelEventDaily.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true, reportDate: true } }),
      this.prisma.dimensionDailyMetric.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true, reportDate: true } }),
    ]);

    const candidates = [usage, revenue, funnel, dimension].filter(
      (row): row is { updatedAt: Date; reportDate: Date } => row !== null,
    );
    if (candidates.length === 0) {
      return { lastRunAt: null, lastReportDate: null, isStale: true };
    }

    const latest = candidates.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
    const ageHours = (Date.now() - latest.updatedAt.getTime()) / (60 * 60 * 1000);

    return {
      lastRunAt: latest.updatedAt.toISOString(),
      lastReportDate: latest.reportDate.toISOString().slice(0, 10),
      // Cron runs once every 24h — 30h tolerates normal jitter without
      // false-positiving, while still catching a genuinely missed run.
      isStale: ageHours > STALE_AFTER_HOURS,
    };
  }

  // Business timezone alignment (spec §25 gap): Africa/Lagos (WAT) is a
  // fixed UTC+1 offset with no DST, so a WAT calendar day is a UTC calendar
  // day shifted by exactly 1 hour — no timezone-library complexity needed.
  // Deliberately scoped to just this daily cron's day boundaries; the many
  // "last Nd" rolling-window API endpoints (getFunnelAnalytics, etc.) stay
  // UTC-relative, since a 1-hour shift barely moves a 30-day window's edge.
  private static readonly WAT_OFFSET_MS = 60 * 60 * 1000;

  private dayWindow(referenceDate: Date): { start: Date; end: Date; reportDate: Date } {
    // Shift into WAT wall-clock time (still a UTC-labeled Date) so
    // getUTC*() below reads back the WAT calendar date, not the UTC one.
    const watReference = new Date(referenceDate.getTime() + AnalyticsAggregationService.WAT_OFFSET_MS);
    const watToday = Date.UTC(watReference.getUTCFullYear(), watReference.getUTCMonth(), watReference.getUTCDate());
    const watYesterday = watToday - 24 * 60 * 60 * 1000;

    // reportDate is a pure calendar-date label (WAT's "yesterday") — not
    // shifted back into a UTC instant, since @db.Date only stores Y/M/D.
    const reportDate = new Date(watYesterday);
    // start/end ARE true UTC instants, offset by the WAT gap, so the
    // event-window query lines up with real WAT midnight-to-midnight.
    const start = new Date(watYesterday - AnalyticsAggregationService.WAT_OFFSET_MS);
    const end = new Date(watToday - AnalyticsAggregationService.WAT_OFFSET_MS);
    return { start, end, reportDate };
  }

  private async aggregateServiceUsage(start: Date, end: Date, reportDate: Date): Promise<void> {
    const { appointments, dispatches, travelSafeTrips } = await fetchServiceUsageRowsForDay(this.prisma, start, end);

    const buckets: UsageBucket[] = [...aggregateAppointmentRows(appointments)];
    const dispatchBucket = aggregateDispatchRows(dispatches);
    if (dispatchBucket) buckets.push(dispatchBucket);
    const travelSafeBucket = aggregateTravelSafeRows(travelSafeTrips);
    if (travelSafeBucket) buckets.push(travelSafeBucket);

    for (const bucket of buckets) {
      await this.prisma.serviceUsageDaily.upsert({
        where: { reportDate_serviceType: { reportDate, serviceType: bucket.serviceType } },
        create: {
          reportDate,
          serviceType: bucket.serviceType,
          totalSessions: bucket.totalSessions,
          uniquePatients: bucket.uniquePatients,
          completedCount: bucket.completedCount,
          cancelledCount: bucket.cancelledCount,
          avgDurationSeconds: bucket.avgDurationSeconds,
        },
        update: {
          totalSessions: bucket.totalSessions,
          uniquePatients: bucket.uniquePatients,
          completedCount: bucket.completedCount,
          cancelledCount: bucket.cancelledCount,
          avgDurationSeconds: bucket.avgDurationSeconds,
        },
      });
    }
  }

  private async aggregateRevenue(start: Date, end: Date, reportDate: Date): Promise<void> {
    const payments = await fetchPaymentRowsForDay(this.prisma, start, end);
    const buckets = aggregateRevenueRows(payments);

    for (const bucket of buckets) {
      // Can't use upsert()'s compound-unique shorthand here: Prisma's
      // generated compound-unique input requires a non-null serviceType
      // even though the column itself is nullable (NULL isn't usable for
      // matching a unique constraint) — see revenue-aggregation.util.ts for
      // why serviceType is always null in this slice. findFirst + branch is
      // the documented workaround; safe here since this runs from a single
      // sequential cron job, not concurrent writers.
      const existing = await this.prisma.revenueSummary.findFirst({
        where: { reportDate, serviceType: null, gateway: bucket.gateway },
        select: { id: true },
      });

      const fields = {
        totalTransactions: bucket.totalTransactions,
        grossRevenueKobo: bucket.grossRevenueKobo,
        refundsKobo: bucket.refundsKobo,
        netRevenueKobo: bucket.netRevenueKobo,
        failedCount: bucket.failedCount,
      };

      if (existing) {
        await this.prisma.revenueSummary.update({ where: { id: existing.id }, data: fields });
      } else {
        await this.prisma.revenueSummary.create({ data: { reportDate, serviceType: null, gateway: bucket.gateway, ...fields } });
      }
    }
  }

  // Spec §25's funnel-metrics daily aggregate — the first of the still-
  // missing page/click/feature/geography/funnel pre-aggregation categories
  // (see docs/ANALYTICS-EVENT-SCHEMA-AGGREGATION-DESIGN.md §3). eventName
  // is non-nullable on FunnelEventDaily's unique key, so (unlike
  // aggregateRevenue above) the compound-unique upsert shorthand works
  // directly — no findFirst/branch workaround needed here.
  private async aggregateFunnelMetrics(start: Date, end: Date, reportDate: Date): Promise<void> {
    const rows = await fetchFunnelEventRowsForDay(this.prisma, start, end);
    const buckets = aggregateFunnelEventRows(rows);

    for (const bucket of buckets) {
      await this.prisma.funnelEventDaily.upsert({
        where: { reportDate_eventName: { reportDate, eventName: bucket.eventName } },
        create: {
          reportDate,
          eventName: bucket.eventName,
          count: bucket.count,
          uniqueUsers: bucket.uniqueUsers,
          uniqueSessions: bucket.uniqueSessions,
        },
        update: {
          count: bucket.count,
          uniqueUsers: bucket.uniqueUsers,
          uniqueSessions: bucket.uniqueSessions,
        },
      });
    }
  }

  // Spec §25's page/click/feature/geography daily aggregates — the other 3
  // of the 4 categories named alongside funnel metrics (see
  // dimension-aggregation.util.ts for why one flexible table replaces 3
  // near-identical ones). dimensionValue is non-nullable on the unique key,
  // same reasoning as aggregateFunnelMetrics above — compound-unique upsert
  // works directly.
  private async aggregateDimensionMetrics(start: Date, end: Date, reportDate: Date): Promise<void> {
    const rows = await fetchDimensionEventRowsForDay(this.prisma, start, end);
    const buckets = aggregateDimensionEventRows(rows);

    for (const bucket of buckets) {
      await this.prisma.dimensionDailyMetric.upsert({
        where: { reportDate_dimension_dimensionValue: { reportDate, dimension: bucket.dimension, dimensionValue: bucket.dimensionValue } },
        create: {
          reportDate,
          dimension: bucket.dimension,
          dimensionValue: bucket.dimensionValue,
          count: bucket.count,
          uniqueUsers: bucket.uniqueUsers,
          uniqueSessions: bucket.uniqueSessions,
        },
        update: {
          count: bucket.count,
          uniqueUsers: bucket.uniqueUsers,
          uniqueSessions: bucket.uniqueSessions,
        },
      });
    }
  }
}
