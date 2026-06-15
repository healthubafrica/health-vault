import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Called once at process start, before any other module is loaded.
// Sentry must be initialised here so it can instrument built-in modules
// (http, https, pg, etc.) before they are imported by the app.
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return; // Sentry is optional; skip silently in environments without a DSN
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,

    // Performance monitoring — capture 10% of transactions in production,
    // 100% in other environments for easier debugging
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // CPU profiling — follow the same sample rate as traces
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Strip PII from breadcrumbs and events
    beforeSend(event) {
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}
