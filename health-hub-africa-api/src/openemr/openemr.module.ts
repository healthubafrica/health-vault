import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { OpenemrService, OPENEMR_SYNC_QUEUE, OPENEMR_REDIS } from './openemr.service';
import { OpenemrController } from './openemr.controller';
import { OpenemrProcessor } from './openemr.processor';
import { createRedisClient } from '../common/redis/redis.factory';

@Module({
  imports: [
    // OpenEMR's FHIR API is the slowest upstream we touch (database-backed
    // PHP, no horizontal scale). 5 req/sec keeps us well under their
    // realistic throughput so a burst of patient syncs doesn't time-out
    // or get our OAuth client throttled by their proxy. Cluster-wide via
    // Redis — extra workers don't multiply the rate.
    BullModule.registerQueue({
      name: OPENEMR_SYNC_QUEUE,
      limiter: { max: 5, duration: 1000 },
    }),
  ],
  providers: [
    {
      provide: OPENEMR_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    OpenemrService,
    OpenemrProcessor,
  ],
  controllers: [OpenemrController],
  exports: [OpenemrService],
})
export class OpenemrModule {}
