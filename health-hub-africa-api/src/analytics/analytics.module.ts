import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController, AnalyticsPublicController } from './analytics.controller';

@Module({
  providers: [AnalyticsService],
  controllers: [AnalyticsController, AnalyticsPublicController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
