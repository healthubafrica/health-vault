const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// getSentryExpoConfig wraps Expo's own getDefaultConfig and additionally
// annotates the bundle so stack traces symbolicate correctly in Sentry —
// without it, crash reports in a release build show minified frames.
module.exports = getSentryExpoConfig(__dirname);
