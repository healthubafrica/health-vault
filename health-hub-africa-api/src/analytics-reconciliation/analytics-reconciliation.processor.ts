import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AnalyticsReconciliationService, ANALYTICS_RECONCILIATION_QUEUE } from './analytics-reconciliation.service';

@Processor(ANALYTICS_RECONCILIATION_QUEUE)
export class AnalyticsReconciliationProcessor {
  private readonly logger = new Logger(AnalyticsReconciliationProcessor.name);
  constructor(private readonly reconciliation: AnalyticsReconciliationService) {}

  @Process({ name: 'reconcile-daily' })
  async handleReconcileDaily() {
    try {
      await this.reconciliation.runDailyReconciliation();
    } catch (err) {
      this.logger.error(`Daily reconciliation job failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
