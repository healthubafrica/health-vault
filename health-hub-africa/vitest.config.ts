import { defineConfig } from 'vitest/config'

// Scoped to *.unit.test.ts so this never collides with Playwright's e2e
// suite (playwright.config.ts's testDir: './tests/e2e') — the two runners
// select disjoint files by both directory and extension.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['**/*.unit.test.ts'],
    exclude: ['node_modules', 'tests/e2e', '.next'],
  },
})
