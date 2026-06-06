import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of transactions in production; 100% otherwise
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and inputs so no PHI is captured in replays
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't send events when there is no DSN (local dev without Sentry configured)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
