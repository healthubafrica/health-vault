import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController, AnalyticsPublicController } from './analytics.controller';
import { GeoResolverService } from './geo-resolver.service';

@Module({
  providers: [AnalyticsService, GeoResolverService],
  controllers: [AnalyticsController, AnalyticsPublicController],
  exports: [AnalyticsService, GeoResolverService],
})
export class AnalyticsModule {}
