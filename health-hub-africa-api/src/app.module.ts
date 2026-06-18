import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { createRedisClient } from './common/redis/redis.factory';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { ProvidersModule } from './providers/providers.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { RecordsModule } from './records/records.module';
import { LabsModule } from './labs/labs.module';
import { VitalsModule } from './vitals/vitals.module';
import { TelecareModule } from './telecare/telecare.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { ExpertReviewModule } from './expert-review/expert-review.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { OpenemrModule } from './openemr/openemr.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConsentsModule } from './consents/consents.module';
import { SupportModule } from './support/support.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StrideModule } from './stride/stride.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health/health.controller';
import { AppController } from './app.controller';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        let redisConfig: any;
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            redisConfig = {
              host: parsed.hostname,
              port: parsed.port ? parseInt(parsed.port, 10) : 6379,
              password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
            };
            if (parsed.protocol === 'rediss:') {
              redisConfig.tls = { rejectUnauthorized: false };
            }
          } catch (e) {
            redisConfig = redisUrl;
          }
        } else {
          redisConfig = {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          };
        }
        return {
          redis: redisConfig,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        };
      },
    }),
    // Redis-backed Throttler storage. Required for horizontal scaling: with
    // the default in-memory storage, counters live in each Node process, so
    // running >1 instance lets a caller round-robin past the limit. Using
    // the same Redis we already run for Bull/OpenEMR keeps infra footprint
    // unchanged.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          { name: 'global', ttl: 60_000, limit: 100 },
          { name: 'auth',   ttl: 60_000, limit: 10  },
        ],
        storage: new ThrottlerStorageRedisService(createRedisClient(config)),
      }),
    }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    ProvidersModule,
    AppointmentsModule,
    RecordsModule,
    LabsModule,
    VitalsModule,
    TelecareModule,
    DispatchModule,
    ExpertReviewModule,
    SubscriptionsModule,
    PaymentsModule,
    OpenemrModule,
    NotificationsModule,
    ConsentsModule,
    SupportModule,
    AnalyticsModule,
    StrideModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
