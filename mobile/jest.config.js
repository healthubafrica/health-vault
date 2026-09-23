// First-ever mobile test runner (spec §22/§30 gap: mobile had zero tests,
// not even e2e — the ported analytics SDK logic rode on the web client's
// tests for confidence until now). Scoped to **/*.unit.test.{ts,tsx},
// matching the naming convention health-hub-africa/vitest.config.ts
// already uses, so "unit test" means the same thing across both clients.
// .tsx added alongside the original .ts once screen/component-level tests
// (via @testing-library/react-native) joined the pure-logic SDK tests.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.unit.test.ts', '**/*.unit.test.tsx'],
  // Mirrors tsconfig.json's "@/*" path mapping — Metro resolves this at
  // runtime automatically, but Jest's module resolution is separate and
  // needs it spelled out explicitly.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
