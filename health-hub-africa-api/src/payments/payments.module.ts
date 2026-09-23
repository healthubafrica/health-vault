import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { OpenemrModule } from '../openemr/openemr.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [NotificationsModule, OpenemrModule, AnalyticsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
