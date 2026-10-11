import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AlertsService, ALERTS_QUEUE } from './alerts.service';
import { AlertsProcessor } from './alerts.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsAggregationModule } from '../analytics-aggregation/analytics-aggregation.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: ALERTS_QUEUE }),
    NotificationsModule,
    AnalyticsAggregationModule,
  ],
  providers: [AlertsService, AlertsProcessor],
  exports: [AlertsService],
})
export class AlertsModule {}
