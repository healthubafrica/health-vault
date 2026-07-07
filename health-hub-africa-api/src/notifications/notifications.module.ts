import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { NotificationsService, NOTIFICATIONS_QUEUE } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import {
  NotificationRateLimiterService,
  NOTIFICATIONS_REDIS,
} from './notification-rate-limiter.service';
import { createRedisClient } from '../common/redis/redis.factory';

@Module({
  imports: [
    // Queue-level limiter caps how fast jobs leave the queue, independent of
    // concurrency. Binding constraint is Resend's free tier (10 req/sec). SMS
    // (Africa's Talking) and FCM (push) are more permissive, but they share
    // this queue, so the global cap protects them all without per-channel
    // splitting. Bull's limiter is cluster-wide via Redis, so adding more
    // workers does not multiply the rate.
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
      limiter: { max: 10, duration: 1000 },
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATIONS_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    NotificationRateLimiterService,
    NotificationsService,
    NotificationsProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
