import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalyticsAggregationService, ANALYTICS_AGGREGATION_QUEUE } from './analytics-aggregation.service';
import { AnalyticsAggregationProcessor } from './analytics-aggregation.processor';
import { AnalyticsAggregationController } from './analytics-aggregation.controller';

@Module({
  imports: [BullModule.registerQueue({ name: ANALYTICS_AGGREGATION_QUEUE })],
  controllers: [AnalyticsAggregationController],
  providers: [AnalyticsAggregationService, AnalyticsAggregationProcessor],
  exports: [AnalyticsAggregationService],
})
export class AnalyticsAggregationModule {}
