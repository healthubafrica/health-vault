import { cohortMetrics } from './cohort-metrics';
const row = (patientId: string, date: string, eventName = 'registration_complete', analyticsSessionId = 's1') => ({ patientId, anonymousVisitorId: null, eventName, analyticsSessionId, occurredAt: new Date(date), countryCode: 'NG' });
it('segments cohorts without exposing identities and computes second-session time', () => {
  const registrations = [row('p1', '2026-01-01'), row('p2', '2026-01-02')];
  const activity = [row('p1', '2026-01-01', 'page_view'), row('p1', '2026-02-01', 'booking_confirmed', 's2')];
  const groups = cohortMetrics(registrations, activity, 'country', new Map(), new Date('2026-03-01'));
  expect(groups[0].windows.find(window => window.days === 30)?.rate).toBe(50);
  expect(groups[0].medianSecondsToSecondSession).toBe(31 * 86400);
  expect(JSON.stringify(groups)).not.toContain('p1');
});
