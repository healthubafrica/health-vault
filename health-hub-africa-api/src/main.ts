import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

// JSON.stringify (and therefore Express's res.json) throws on BigInt with no
// built-in conversion. Several Prisma columns (storage quotas, max file
// sizes) are BigInt and get returned in raw entities/relations across
// multiple controllers — without this, any of those responses 500s. All of
// our BigInt columns hold byte counts capped in the tens of gigabytes, far
// under Number.MAX_SAFE_INTEGER, so converting to Number is lossless.
(BigInt.prototype as unknown as { toJSON(): number }).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  app.enableShutdownHooks();

  // SEC-004: trust the first proxy hop (AWS ALB) so req.ip contains the real
  // client IP and per-IP rate limiting works correctly.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Sentry error capture happens in GlobalExceptionFilter — an Express-level
  // error handler is never reached because Nest's exception layer catches
  // everything first.

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const adminUrl = config.get<string>('ADMIN_URL', 'http://localhost:3001');
  const isProd = config.get('NODE_ENV') === 'production';

  // ── Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: isProd,
    }),
  );

  // ── Compression ─────────────────────────────────────────────────────────
  app.use(compression());

  // ── CORS ────────────────────────────────────────────────────────────────
  // Allow both the bare domain and the www-prefixed variant so that the
  // browser's Origin header is accepted regardless of which canonical form
  // the client uses (e.g. https://myvaultplus.com AND https://www.myvaultplus.com).
  const buildCorsOrigins = (base: string): string[] => {
    try {
      const url = new URL(base);
      const bare = `${url.protocol}//${url.hostname.replace(/^www\./, '')}${url.port ? `:${url.port}` : ''}`;
      const www = `${url.protocol}//www.${url.hostname.replace(/^www\./, '')}${url.port ? `:${url.port}` : ''}`;
      return [bare, www];
    } catch {
      return [base];
    }
  };

  const prodOrigins = [
    ...buildCorsOrigins(frontendUrl),
    ...buildCorsOrigins(adminUrl),
  ];

  app.enableCors({
    origin: isProd ? prodOrigins : [...prodOrigins, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
  });

  // ── Global prefix & versioning ──────────────────────────────────────────
  app.setGlobalPrefix('api', { exclude: ['health', '/', ''] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global validation pipe ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (dev only) ──────────────────────────────────────────────────
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MyHealth Vault+™ API')
      .setDescription('HHA Middleware — Health-Hub Africa® Backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  logger.log(`HHA Middleware running on port ${port} [${isProd ? 'production' : 'development'}]`);
  if (!isProd) logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
