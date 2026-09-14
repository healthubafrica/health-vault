import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

export const ANALYTICS_AGGREGATION_QUEUE = 'analytics-aggregation';

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
    // Runs once a day, well after midnight UTC, aggregating the prior UTC
    // day — gives every timezone's "yesterday" activity time to settle
    // rather than racing still-in-flight late-night rows.
    await this.queue.add('aggregate-daily', {}, { repeat: { cron: '15 1 * * *' }, removeOnComplete: 10 });
  }

  /** Aggregates the previous UTC calendar day. Idempotent — safe to re-run
   * for the same day (upserts on the tables' unique keys), which is what
   * lets a redeploy or manual retrigger recompute a day without duplicating
   * rows. */
  async runDailyAggregation(forDate?: Date): Promise<void> {
    const { start, end, reportDate } = this.dayWindow(forDate ?? new Date());

    try {
      await this.aggregateServiceUsage(start, end, reportDate);
      await this.aggregateRevenue(start, end, reportDate);
    } catch (err) {
      this.logger.error(
        `Daily analytics aggregation failed for ${reportDate.toISOString().slice(0, 10)}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  private dayWindow(referenceDate: Date): { start: Date; end: Date; reportDate: Date } {
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end, reportDate: start };
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
}
