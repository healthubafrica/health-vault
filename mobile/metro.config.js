const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);
const defaultBlockList = config.resolver.blockList;

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  /\.(?:unit\.test|test|spec)\.[jt]sx?$/,
  /[\\/]__tests__[\\/]/,
];

module.exports = config;
