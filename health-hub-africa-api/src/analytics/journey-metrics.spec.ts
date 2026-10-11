import { actionErrorRate, journeyMetrics, paymentAttemptRate, JourneyEvent } from './journey-metrics';
const event = (eventName: string, second = 0, properties = {}): JourneyEvent => ({ eventName, patientId: 'p1', anonymousVisitorId: null,
  analyticsSessionId: 's1', occurredAt: new Date(2026, 0, 1, 0, 0, second), properties, pagePath: '/records' });

it('counts three payment attempts by the same patient as three, including retries only once', () => {
  const rows = ['a', 'b', 'c', 'c'].map((paymentId) => event('payment_attempted', 0, { paymentId }));
  rows.push(event('payment_success', 1, { paymentId: 'c' }), event('payment_success', 2, { paymentId: 'c' }));
  expect(paymentAttemptRate(rows)).toEqual({ numerator: 1, denominator: 3, value: 33.3 });
});
it('does not dilute action errors with navigation events', () => {
  expect(actionErrorRate([event('upload_success'), event('upload_failure'), ...Array(100).fill(event('page_view'))]))
    .toEqual({ numerator: 1, denominator: 2, value: 50 });
});
it('requires ordered stages and reports abandonment, elapsed time and retries', () => {
  const result = journeyMetrics([event('upload_success', 0), event('records_view', 1), event('upload_start', 3), event('upload_start', 4), event('upload_success', 7)]);
  const stages = result.funnels.find((f) => f.name === 'records')!.stages;
  expect(stages.map((s) => s.users)).toEqual([1, 1, 1]);
  expect(stages[2].medianElapsedSeconds).toBe(4);
  expect(stages[1].retryCount).toBe(1);
  expect(JSON.stringify(result)).not.toContain('p1');
});
