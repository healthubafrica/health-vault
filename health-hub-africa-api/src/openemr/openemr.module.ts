import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OpenemrService, OPENEMR_SYNC_QUEUE, OPENEMR_REDIS } from './openemr.service';
import { OpenemrController } from './openemr.controller';
import { OpenemrProcessor } from './openemr.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: OPENEMR_SYNC_QUEUE }),
  ],
  providers: [
    {
      provide: OPENEMR_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            return new Redis({
              host: parsed.hostname,
              port: parsed.port ? parseInt(parsed.port, 10) : 6379,
              password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
              lazyConnect: true,
            });
          } catch {
            return new Redis(redisUrl, { lazyConnect: true });
          }
        }
        return new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
        });
      },
    },
    OpenemrService,
    OpenemrProcessor,
  ],
  controllers: [OpenemrController],
  exports: [OpenemrService],
})
export class OpenemrModule {}
