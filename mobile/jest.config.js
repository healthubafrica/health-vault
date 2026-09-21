// First-ever mobile test runner (spec §22/§30 gap: mobile had zero tests,
// not even e2e — the ported analytics SDK logic rode on the web client's
// tests for confidence until now). Scoped to **/*.unit.test.ts, matching
// the naming convention health-hub-africa/vitest.config.ts already uses,
// so "unit test" means the same thing across both clients.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.unit.test.ts'],
};
