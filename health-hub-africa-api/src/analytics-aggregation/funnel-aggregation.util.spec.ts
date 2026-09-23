import { aggregateFunnelEventRows } from './funnel-aggregation.util';

describe('aggregateFunnelEventRows', () => {
  it('counts raw events, unique users, and unique sessions per event name', () => {
    const buckets = aggregateFunnelEventRows([
      // p1 fires otp_requested twice in two sessions -> 2 events, 1 unique user, 2 unique sessions
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1', analyticsSessionId: 's1' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1', analyticsSessionId: 's2' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p2', analyticsSessionId: 's3' },
      { eventName: 'otp_verify_success', patientId: 'patient-1', anonymousVisitorId: null, analyticsSessionId: 's1' },
    ]);

    const otpRequested = buckets.find((b) => b.eventName === 'otp_requested')!;
    expect(otpRequested).toEqual({ eventName: 'otp_requested', count: 3, uniqueUsers: 2, uniqueSessions: 3 });

    const otpVerified = buckets.find((b) => b.eventName === 'otp_verify_success')!;
    expect(otpVerified).toEqual({ eventName: 'otp_verify_success', count: 1, uniqueUsers: 1, uniqueSessions: 1 });
  });

  it('keys unique users by patientId when present, falling back to anon:<anonymousVisitorId> otherwise', () => {
    const buckets = aggregateFunnelEventRows([
      { eventName: 'page_view', patientId: 'patient-1', anonymousVisitorId: null, analyticsSessionId: null },
      // Same patient could theoretically also send an anonymousVisitorId; a real patientId always wins the key.
      { eventName: 'page_view', patientId: 'patient-1', anonymousVisitorId: 'stale-anon-id', analyticsSessionId: null },
      { eventName: 'page_view', patientId: null, anonymousVisitorId: 'visitor-2', analyticsSessionId: null },
    ]);

    const pageView = buckets.find((b) => b.eventName === 'page_view')!;
    expect(pageView.count).toBe(3);
    expect(pageView.uniqueUsers).toBe(2);
  });

  it('does not count a row toward uniqueUsers when it has neither patientId nor anonymousVisitorId', () => {
    const buckets = aggregateFunnelEventRows([
      { eventName: 'client_error', patientId: null, anonymousVisitorId: null, analyticsSessionId: null },
    ]);

    const clientError = buckets.find((b) => b.eventName === 'client_error')!;
    expect(clientError.count).toBe(1);
    expect(clientError.uniqueUsers).toBe(0);
    expect(clientError.uniqueSessions).toBe(0);
  });

  it('returns an empty array for no rows', () => {
    expect(aggregateFunnelEventRows([])).toEqual([]);
  });
});
