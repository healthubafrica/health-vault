import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN || 'https://61b6893179e80cb8b10e7c85d7d72f9c@o4511519708807168.ingest.de.sentry.io/4511566967930960';

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? 'development',
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
