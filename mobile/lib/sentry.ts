import * as Sentry from '@sentry/react-native';

export const routingInstrumentation = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  ignoreEmptyBackNavigationTransactions: true,
});

const dsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  process.env.SENTRY_DSN ||
  'https://a5de4966903458e7ff98b889547fc998@o4511519708807168.ingest.de.sentry.io/4512312596693072';

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    debug: false,
    environment: __DEV__ ? 'development' : 'production',
    // Performance monitoring: capture 100% in development; 20% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    integrations: [
      routingInstrumentation,
    ],
  });
}

export function setSentryUser(user: { id: string; email: string; firstName?: string; lastName?: string } | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
  });
}

export { Sentry };
