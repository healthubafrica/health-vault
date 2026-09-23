import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnalyticsReconciliationService, ANALYTICS_RECONCILIATION_QUEUE } from './analytics-reconciliation.service';
import { AnalyticsReconciliationProcessor } from './analytics-reconciliation.processor';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [BullModule.registerQueue({ name: ANALYTICS_RECONCILIATION_QUEUE }), AlertsModule],
  providers: [AnalyticsReconciliationService, AnalyticsReconciliationProcessor],
  exports: [AnalyticsReconciliationService],
})
export class AnalyticsReconciliationModule {}
