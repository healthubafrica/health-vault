import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { AdminService, ADMIN_REDIS } from './admin.service';
import { AdminController } from './admin.controller';
import { SystemStatusService } from './system-status.service';
import { ALERTS_QUEUE } from '../alerts/alerts.service';
import { APPOINTMENT_REMINDERS_QUEUE } from '../appointments/appointments.service';
import { TELECARE_QUEUE } from '../telecare/telecare.service';
import { ANALYTICS_AGGREGATION_QUEUE } from '../analytics-aggregation/analytics-aggregation.service';
import { ANALYTICS_RECONCILIATION_QUEUE } from '../analytics-reconciliation/analytics-reconciliation.service';
import { OPENEMR_SYNC_QUEUE } from '../openemr/openemr.service';
import { OpenemrModule } from '../openemr/openemr.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NOTIFICATIONS_QUEUE } from '../notifications/notifications.service';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AlertsModule } from '../alerts/alerts.module';
import { createRedisClient } from '../common/redis/redis.factory';

@Module({
  imports: [
    BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    // Read-only handles for the System Status page's job counts.
    BullModule.registerQueue(
      { name: ALERTS_QUEUE },
      { name: APPOINTMENT_REMINDERS_QUEUE },
      { name: TELECARE_QUEUE },
      { name: ANALYTICS_AGGREGATION_QUEUE },
      { name: ANALYTICS_RECONCILIATION_QUEUE },
    ),
    OpenemrModule,
    NotificationsModule,
    StorageModule,
    AuthModule,
    AnalyticsModule,
    AlertsModule,
  ],
  providers: [
    {
      provide: ADMIN_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    AdminService,
    SystemStatusService,
  ],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
