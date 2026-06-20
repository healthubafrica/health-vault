import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { AdminService, ADMIN_REDIS } from './admin.service';
import { AdminController } from './admin.controller';
import { OPENEMR_SYNC_QUEUE } from '../openemr/openemr.service';
import { createRedisClient } from '../common/redis/redis.factory';

@Module({
  imports: [BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE })],
  providers: [
    {
      provide: ADMIN_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    AdminService,
  ],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
