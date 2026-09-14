import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AnalyticsAggregationService, ANALYTICS_AGGREGATION_QUEUE } from './analytics-aggregation.service';

@Processor(ANALYTICS_AGGREGATION_QUEUE)
export class AnalyticsAggregationProcessor {
  private readonly logger = new Logger(AnalyticsAggregationProcessor.name);
  constructor(private readonly aggregation: AnalyticsAggregationService) {}

  @Process({ name: 'aggregate-daily' })
  async handleAggregateDaily() {
    try {
      await this.aggregation.runDailyAggregation();
    } catch (err) {
      this.logger.error(`Daily aggregation job failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
