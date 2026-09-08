import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AlertsService, ALERTS_QUEUE } from './alerts.service';
import { AlertsProcessor } from './alerts.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: ALERTS_QUEUE }),
    NotificationsModule,
  ],
  providers: [AlertsService, AlertsProcessor],
  exports: [AlertsService],
})
export class AlertsModule {}
