const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// getSentryExpoConfig wraps Expo's own getDefaultConfig and additionally
// annotates the bundle so stack traces symbolicate correctly in Sentry —
// without it, crash reports in a release build show minified frames.
const config = getSentryExpoConfig(__dirname);

// Keep test files out of the app bundle.
config.resolver.blockList = [
  /.*\.unit\.test\.[jt]sx?$/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
  /.*\/__tests__\/.*/,
];

module.exports = config;
