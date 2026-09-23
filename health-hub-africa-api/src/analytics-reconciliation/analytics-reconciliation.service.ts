import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AlertSeverity, ServiceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { compareAmounts, compareCounts, ReconciliationResult } from './reconciliation-checks.util';

export const ANALYTICS_RECONCILIATION_QUEUE = 'analytics-reconciliation';

/**
 * Implements docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md — compares
 * analytics-derived counts against transactional source-of-truth records
 * for the outcomes named in that plan, and raises an AdminAlert (reusing
 * AlertsService, not a parallel mechanism) when a pair mismatches beyond
 * the documented threshold.
 *
 * Deliberately excludes registration_complete from the plan's original
 * scope: AuthService.emitRegistrationComplete fires it on BOTH the
 * new-account branch and the resend-to-unverified-account branch (see its
 * own comment — "matching what the client-side event already counts as a
 * completed registration"), so the event count can legitimately exceed the
 * User/Patient row-creation count. That's an expected one-to-many
 * relationship, not drift — reconciling it would produce permanent,
 * uninformative mismatches, which is exactly what the plan says to avoid.
 */
@Injectable()
export class AnalyticsReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    @InjectQueue(ANALYTICS_RECONCILIATION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    const repeatables = await this.queue.getRepeatableJobs();
    for (const r of repeatables.filter((j) => j.name === 'reconcile-daily')) {
      await this.queue.removeRepeatableByKey(r.key);
    }
    // 75 minutes after AnalyticsAggregationService's 01:15 UTC run, so that
    // day's ServiceUsageDaily/RevenueSummary rows exist before checks 4-5
    // read them (see docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md "Cadence").
    await this.queue.add('reconcile-daily', {}, { repeat: { cron: '30 2 * * *' }, removeOnComplete: 10 });
  }

  /** Reconciles the previous UTC calendar day. Read-only and idempotent —
   * safe to re-run for the same day any number of times. */
  async runDailyReconciliation(forDate?: Date): Promise<ReconciliationResult[]> {
    const { start, end, reportDate } = this.dayWindow(forDate ?? new Date());

    const results = await Promise.all([
      this.reconcilePaymentSuccess(start, end),
      this.reconcilePaymentFailure(start, end),
      this.reconcileBookingConfirmed(start, end),
      this.reconcileRevenueAggregate(reportDate, start, end),
      this.reconcileServiceUsageAggregate(reportDate, start, end),
    ]);

    for (const result of results) {
      this.logger.log(
        `Reconciliation ${result.pair} for ${reportDate.toISOString().slice(0, 10)}: ` +
          `analytics=${result.analyticsCount} transactional=${result.transactionalCount} diff=${result.diff}` +
          (result.mismatched ? ' — MISMATCH' : ''),
      );
      if (result.mismatched) {
        await this.alerts.raise({
          type: `reconciliation_mismatch:${result.pair}`,
          severity: AlertSeverity.warning,
          title: `Analytics reconciliation mismatch: ${result.pair}`,
          body:
            `For ${reportDate.toISOString().slice(0, 10)}, ${result.pair} shows analytics=${result.analyticsCount} ` +
            `vs. transactional=${result.transactionalCount} (diff ${result.diff}) — review the underlying rows ` +
            `before trusting that day's numbers for this metric.`,
          metadata: { reportDate: reportDate.toISOString(), ...result },
        });
      }
    }

    return results;
  }

  private dayWindow(referenceDate: Date): { start: Date; end: Date; reportDate: Date } {
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end, reportDate: start };
  }

  // ── Event-vs-transactional pairs ────────────────────────────────────────

  private async reconcilePaymentSuccess(start: Date, end: Date): Promise<ReconciliationResult> {
    const [analyticsCount, transactionalCount] = await Promise.all([
      this.prisma.patientActivityEvent.count({
        where: { eventName: 'payment_success', ingestionSource: 'server', isTestEvent: false, occurredAt: { gte: start, lt: end } },
      }),
      // Same createdAt-window convention revenue-aggregation.util.ts uses —
      // consistent day-bucketing with the aggregate this pair is meant to
      // corroborate.
      this.prisma.payment.count({ where: { status: 'paid', createdAt: { gte: start, lt: end } } }),
    ]);
    return compareCounts('payment_success_vs_paid_payments', analyticsCount, transactionalCount);
  }

  private async reconcilePaymentFailure(start: Date, end: Date): Promise<ReconciliationResult> {
    const [analyticsCount, transactionalCount] = await Promise.all([
      this.prisma.patientActivityEvent.count({
        where: { eventName: 'payment_failure', ingestionSource: 'server', isTestEvent: false, occurredAt: { gte: start, lt: end } },
      }),
      this.prisma.payment.count({ where: { status: 'failed', createdAt: { gte: start, lt: end } } }),
    ]);
    return compareCounts('payment_failure_vs_failed_payments', analyticsCount, transactionalCount);
  }

  private async reconcileBookingConfirmed(start: Date, end: Date): Promise<ReconciliationResult> {
    const [analyticsCount, transactionalCount] = await Promise.all([
      this.prisma.patientActivityEvent.count({
        where: { eventName: 'booking_confirmed', ingestionSource: 'server', isTestEvent: false, occurredAt: { gte: start, lt: end } },
      }),
      // AppointmentsService.create fires booking_confirmed exactly once,
      // synchronously with the row's own creation — a clean 1:1 pair.
      this.prisma.appointment.count({ where: { createdAt: { gte: start, lt: end } } }),
    ]);
    return compareCounts('booking_confirmed_vs_appointments_created', analyticsCount, transactionalCount);
  }

  // ── Aggregate-vs-source pairs ────────────────────────────────────────────

  private async reconcileRevenueAggregate(reportDate: Date, start: Date, end: Date): Promise<ReconciliationResult> {
    const [aggregateRows, sourceRows] = await Promise.all([
      this.prisma.revenueSummary.findMany({ where: { reportDate }, select: { netRevenueKobo: true } }),
      this.prisma.payment.findMany({
        where: { status: 'paid', createdAt: { gte: start, lt: end } },
        select: { amountKobo: true, refundAmountKobo: true },
      }),
    ]);
    const aggregateNet = aggregateRows.reduce((sum, r) => sum + Number(r.netRevenueKobo), 0);
    const sourceNet = sourceRows.reduce((sum, r) => sum + r.amountKobo - (r.refundAmountKobo ?? 0), 0);
    return compareAmounts('revenue_summary_vs_payments', aggregateNet, sourceNet);
  }

  // Restricted to appointment-sourced ServiceTypes only — ServiceUsageDaily
  // also carries DispatchCare/TravelSafe buckets aggregated from
  // DispatchRequest/TravelSafeTrip, not Appointment, so summing every
  // serviceType's completedCount would systematically overcount against an
  // Appointment-only source count (a permanent, meaningless "mismatch",
  // exactly what the reconciliation plan says to avoid).
  private static readonly APPOINTMENT_SERVICE_TYPES: ServiceType[] = [
    ServiceType.MinuteCare,
    ServiceType.TeleCare,
    ServiceType.CareTest,
    ServiceType.HealthConsult,
    ServiceType.ExpertReview,
    ServiceType.NeuroFlex,
  ];

  private async reconcileServiceUsageAggregate(reportDate: Date, start: Date, end: Date): Promise<ReconciliationResult> {
    const [aggregateRows, sourceCount] = await Promise.all([
      this.prisma.serviceUsageDaily.findMany({
        where: { reportDate, serviceType: { in: AnalyticsReconciliationService.APPOINTMENT_SERVICE_TYPES } },
        select: { completedCount: true },
      }),
      this.prisma.appointment.count({ where: { status: 'completed', createdAt: { gte: start, lt: end } } }),
    ]);
    const aggregateCompleted = aggregateRows.reduce((sum, r) => sum + r.completedCount, 0);
    return compareCounts('service_usage_daily_vs_completed_appointments', aggregateCompleted, sourceCount);
  }
}
