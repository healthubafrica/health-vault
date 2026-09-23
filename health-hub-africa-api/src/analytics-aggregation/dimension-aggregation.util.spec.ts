import { aggregateDimensionEventRows, DimensionEventRow } from './dimension-aggregation.util';

function row(overrides: Partial<DimensionEventRow>): DimensionEventRow {
  return {
    eventName: 'page_view',
    pagePath: null,
    elementId: null,
    featureArea: null,
    countryCode: null,
    patientId: null,
    anonymousVisitorId: null,
    analyticsSessionId: null,
    ...overrides,
  };
}

describe('aggregateDimensionEventRows', () => {
  it('buckets page_view rows by pagePath under the "page" dimension', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'page_view', pagePath: '/dashboard', patientId: 'p1' }),
      row({ eventName: 'page_view', pagePath: '/dashboard', patientId: 'p2' }),
      row({ eventName: 'page_view', pagePath: '/appointments', patientId: 'p1' }),
    ]);

    const dashboard = buckets.find((b) => b.dimension === 'page' && b.dimensionValue === '/dashboard')!;
    expect(dashboard).toEqual({ dimension: 'page', dimensionValue: '/dashboard', count: 2, uniqueUsers: 2, uniqueSessions: 0 });
  });

  it('ignores pagePath on non-page_view events — the "page" dimension is scoped to page views only', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'ui_click', pagePath: '/dashboard', elementId: 'quick_action_telecare' }),
    ]);

    expect(buckets.find((b) => b.dimension === 'page')).toBeUndefined();
    expect(buckets.find((b) => b.dimension === 'element')).toEqual(
      expect.objectContaining({ dimensionValue: 'quick_action_telecare' }),
    );
  });

  it('buckets ui_click rows by elementId under the "element" dimension', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'ui_click', elementId: 'book_appointment_cta', patientId: 'p1' }),
      row({ eventName: 'ui_click', elementId: 'book_appointment_cta', anonymousVisitorId: 'v1' }),
    ]);

    const cta = buckets.find((b) => b.dimension === 'element' && b.dimensionValue === 'book_appointment_cta')!;
    expect(cta.count).toBe(2);
    expect(cta.uniqueUsers).toBe(2);
  });

  it('buckets featureArea across every event type, not just one', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'page_view', featureArea: 'vault', pagePath: '/vault' }),
      row({ eventName: 'upload_success', featureArea: 'vault' }),
      row({ eventName: 'ui_click', featureArea: 'vault', elementId: 'upload_record_cta' }),
    ]);

    const vault = buckets.find((b) => b.dimension === 'feature_area' && b.dimensionValue === 'vault')!;
    expect(vault.count).toBe(3);
  });

  it('buckets countryCode across every event type', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'page_view', countryCode: 'NG' }),
      row({ eventName: 'booking_confirmed', countryCode: 'NG' }),
      row({ eventName: 'page_view', countryCode: 'GH' }),
    ]);

    expect(buckets.find((b) => b.dimension === 'country' && b.dimensionValue === 'NG')!.count).toBe(2);
    expect(buckets.find((b) => b.dimension === 'country' && b.dimensionValue === 'GH')!.count).toBe(1);
  });

  it('excludes rows with a null/empty value for a given dimension from that dimension entirely', () => {
    const buckets = aggregateDimensionEventRows([row({ eventName: 'page_view', pagePath: null })]);
    expect(buckets.find((b) => b.dimension === 'page')).toBeUndefined();
  });

  it('counts unique sessions the same way every other aggregate in this codebase does', () => {
    const buckets = aggregateDimensionEventRows([
      row({ eventName: 'page_view', pagePath: '/dashboard', analyticsSessionId: 's1' }),
      row({ eventName: 'page_view', pagePath: '/dashboard', analyticsSessionId: 's1' }),
      row({ eventName: 'page_view', pagePath: '/dashboard', analyticsSessionId: 's2' }),
    ]);

    const dashboard = buckets.find((b) => b.dimension === 'page' && b.dimensionValue === '/dashboard')!;
    expect(dashboard.count).toBe(3);
    expect(dashboard.uniqueSessions).toBe(2);
  });

  it('returns an empty array for no rows', () => {
    expect(aggregateDimensionEventRows([])).toEqual([]);
  });
});
