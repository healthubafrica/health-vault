import { previousReportingDay } from './reporting-window';

describe('Lagos reporting days', () => {
  it.each([
    ['2026-09-28T02:30:00Z', '2026-09-26T23:00:00.000Z', '2026-09-27T23:00:00.000Z'],
    ['2026-01-01T00:00:00Z', '2025-12-30T23:00:00.000Z', '2025-12-31T23:00:00.000Z'],
    ['2026-09-27T23:00:00Z', '2026-09-26T23:00:00.000Z', '2026-09-27T23:00:00.000Z'],
  ])('uses half-open calendar boundaries at %s', (reference, start, end) => {
    const window = previousReportingDay(new Date(reference));
    expect(window.start.toISOString()).toBe(start);
    expect(window.end.toISOString()).toBe(end);
  });
});
