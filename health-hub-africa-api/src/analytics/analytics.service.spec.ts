import { AnalyticsService } from './analytics.service';

describe('AnalyticsService.trackEvent (anonymous + authenticated identity)', () => {
  function buildService(patient: { id: string } | null = { id: 'patient-1' }) {
    const prisma = {
      patient: { findUnique: jest.fn().mockResolvedValue(patient) },
      patientActivityEvent: {
        create: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      analyticsSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      patientConsent: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new AnalyticsService(prisma as any);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);
    return { service, prisma };
  }

  it('records against patientId when authenticated', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1', anonymousVisitorId: undefined }) }),
    );
  });

  it('records against anonymousVisitorId when unauthenticated', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view', anonymousVisitorId: 'anon-1' }, undefined);

    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: undefined, anonymousVisitorId: 'anon-1' }) }),
    );
  });

  it('drops the event when neither a patient nor an anonymous id can be resolved', async () => {
    const { service, prisma } = buildService(null);
    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
  });

  it('persists the structured spec §20 fields, derived geo, and a server receivedAt', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent(
      {
        eventType: 'ui_click',
        eventId: '11111111-1111-4111-8111-111111111111',
        featureArea: 'dashboard',
        elementId: 'book_telecare_btn',
        elementType: 'button',
        action: 'click',
        pagePath: '/portal/dashboard',
        analyticsSessionId: 'sess-1',
      },
      { sub: 'user-1' } as any,
      { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Chrome/120', countryCode: 'ng', region: 'Lagos', city: 'Lagos', timezone: 'Africa/Lagos' },
    );

    expect(prisma.patientActivityEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: '11111111-1111-4111-8111-111111111111' },
        create: expect.objectContaining({
          eventName: 'ui_click',
          eventVersion: 1,
          featureArea: 'dashboard',
          elementId: 'book_telecare_btn',
          elementType: 'button',
          pagePath: '/portal/dashboard',
          ingestionSource: 'web',
          countryCode: 'NG',
          regionName: 'Lagos',
          city: 'Lagos',
          continentCode: 'Africa',
          geoAccuracy: 'city',
          geoSource: 'geoip',
          browser: 'Chrome',
          os: 'iOS',
          receivedAt: expect.any(Date),
        }),
        update: {},
      }),
    );
  });

  it('prefers a GeoLite2 lookup over the edge-header geo when the resolver returns a hit', async () => {
    const prisma = {
      patient: { findUnique: jest.fn().mockResolvedValue({ id: 'patient-1' }) },
      patientActivityEvent: { create: jest.fn().mockResolvedValue({}), upsert: jest.fn().mockResolvedValue({}) },
    };
    const geoResolver = {
      resolve: jest.fn().mockReturnValue({
        countryCode: 'GB',
        regionCode: 'ENG',
        regionName: 'England',
        city: 'London',
        continentName: 'Europe',
        timezone: 'Europe/London',
        latitude: 51.5,
        longitude: -0.12,
        asn: 'AS5089',
        geoAccuracy: 'city',
        geoProvider: 'maxmind-geolite2',
        geoProviderVersion: '2026-09-10',
      }),
    };
    const service = new AnalyticsService(prisma as any, geoResolver as any);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

    await service.trackEvent(
      { eventType: 'page_view' },
      { sub: 'user-1' } as any,
      // Edge headers say Nigeria — the GeoLite2 hit (UK) must win.
      { ipAddress: '102.89.34.10', countryCode: 'NG', region: 'Lagos', city: 'Lagos' },
    );

    expect(geoResolver.resolve).toHaveBeenCalledWith('102.89.34.10');
    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryCode: 'GB',
          regionName: 'England',
          city: 'London',
          continentCode: 'Europe',
          asn: 'AS5089',
          latitude: 51.5,
          geoProvider: 'maxmind-geolite2',
          geoProviderVersion: '2026-09-10',
        }),
      }),
    );
  });

  it('is idempotent on eventId — a replayed beacon upserts, never a second create', async () => {
    const { service, prisma } = buildService();
    const dto = { eventType: 'booking_confirmed', eventId: '22222222-2222-4222-8222-222222222222', anonymousVisitorId: 'anon-9' };
    await service.trackEvent(dto, undefined);
    await service.trackEvent(dto, undefined);

    expect(prisma.patientActivityEvent.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
  });

  it('drops an event whose name is malformed (not lowercase snake_case)', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'UI Click!' } as any, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.upsert).not.toHaveBeenCalled();
    expect((service as any).logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed name'));
  });

  it('still records a well-formed but uncatalogued event, logging the drift', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'brand_new_feature_used', anonymousVisitorId: 'anon-1' }, undefined);

    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventName: 'brand_new_feature_used', eventVersion: 1 }) }),
    );
    expect((service as any).logger.warn).toHaveBeenCalledWith(expect.stringContaining('Uncatalogued'));
  });

  it('collapses a client-claimed ingestionSource of "server" down to "web"', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent(
      { eventType: 'page_view', ingestionSource: 'server', anonymousVisitorId: 'anon-1' } as any,
      undefined,
    );

    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ingestionSource: 'web' }) }),
    );
  });

  // ── Session rollup (spec §7), exercised through trackEvent ────────────────

  it('opens an AnalyticsSession on the first event, seeding entry/exit page and counts', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent(
      { eventType: 'page_view', analyticsSessionId: 'sess-1', pagePath: '/portal/dashboard', anonymousVisitorId: 'anon-1' },
      undefined,
    );

    expect(prisma.analyticsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          analyticsSessionId: 'sess-1',
          entryPage: '/portal/dashboard',
          exitPage: '/portal/dashboard',
          pageViewCount: 1,
          eventCount: 1,
          engaged: false,
          returningVisitor: false,
        }),
      }),
    );
  });

  it('marks a returning visitor when a prior session exists for the identity', async () => {
    const { service, prisma } = buildService();
    prisma.analyticsSession.count.mockResolvedValueOnce(3);

    await service.trackEvent(
      { eventType: 'page_view', analyticsSessionId: 'sess-2', anonymousVisitorId: 'anon-7' },
      undefined,
    );

    expect(prisma.analyticsSession.count).toHaveBeenCalledWith({ where: { anonymousVisitorId: 'anon-7' } });
    expect(prisma.analyticsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ returningVisitor: true }) }),
    );
  });

  it('opens the session as engaged when the very first event is a meaningful action', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent(
      { eventType: 'booking_confirmed', analyticsSessionId: 'sess-3', anonymousVisitorId: 'anon-1' },
      undefined,
    );

    expect(prisma.analyticsSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ engaged: true }) }),
    );
  });

  it('advances an existing session: moves exit page, increments counts, flips engaged at 2+ events', async () => {
    const { service, prisma } = buildService();
    prisma.analyticsSession.findUnique.mockResolvedValueOnce({ id: 'row-1', exitPage: '/a' });

    await service.trackEvent(
      { eventType: 'ui_click', analyticsSessionId: 'sess-4', pagePath: '/b', anonymousVisitorId: 'anon-1' },
      undefined,
    );

    expect(prisma.analyticsSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { analyticsSessionId: 'sess-4' },
        data: expect.objectContaining({ exitPage: '/b', clickCount: { increment: 1 }, eventCount: { increment: 1 } }),
      }),
    );
    expect(prisma.analyticsSession.updateMany).toHaveBeenCalledWith({
      where: { analyticsSessionId: 'sess-4', engaged: false, eventCount: { gte: 2 } },
      data: { engaged: true },
    });
  });

  it('does not touch AnalyticsSession when the event carries no analyticsSessionId', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view', anonymousVisitorId: 'anon-1' }, undefined);

    expect(prisma.analyticsSession.findUnique).not.toHaveBeenCalled();
    expect(prisma.analyticsSession.create).not.toHaveBeenCalled();
  });

  it('never lets a session-rollup failure break the event write', async () => {
    const { service, prisma } = buildService();
    prisma.analyticsSession.findUnique.mockRejectedValueOnce(new Error('db down'));

    await service.trackEvent(
      { eventType: 'page_view', analyticsSessionId: 'sess-5', anonymousVisitorId: 'anon-1' },
      undefined,
    );

    expect(prisma.patientActivityEvent.create).toHaveBeenCalled();
  });

  // ── emitServerEvent (spec §23 authoritative outcomes) ────────────────────

  it('emitServerEvent resolves patientId from userId and tags the row ingestionSource=server', async () => {
    const { service, prisma } = buildService();
    await service.emitServerEvent('login_success', { userId: 'user-1', geo: { countryCode: 'ng' } });

    expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' }, select: { id: true } });
    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventName: 'login_success',
          patientId: 'patient-1',
          ingestionSource: 'server',
          countryCode: 'NG',
        }),
      }),
    );
  });

  it('emitServerEvent takes an explicit patientId without a Patient lookup', async () => {
    const { service, prisma } = buildService();
    await service.emitServerEvent('booking_confirmed', { patientId: 'p-99', properties: { serviceType: 'telecare' } });

    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventName: 'booking_confirmed', patientId: 'p-99', ingestionSource: 'server' }),
      }),
    );
  });

  it('emitServerEvent drops the event when the user has no Patient row and no anon id', async () => {
    const { service, prisma } = buildService(null);
    await service.emitServerEvent('login_success', { userId: 'user-x' });

    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
  });

  it('emitServerEvent never throws back into the caller', async () => {
    const { service, prisma } = buildService();
    prisma.patientActivityEvent.create.mockRejectedValueOnce(new Error('insert failed'));

    await expect(
      service.emitServerEvent('payment_success', { patientId: 'p-1' }),
    ).resolves.toBeUndefined();
  });

  // ── Consent gate (spec §28) + test-traffic marker (spec §20/§30) ─────────

  it('drops an authenticated event when the patient has declined analytics consent', async () => {
    const { service, prisma } = buildService();
    prisma.patientConsent.findUnique.mockResolvedValueOnce({ granted: false });

    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientConsent.findUnique).toHaveBeenCalledWith({
      where: { patientId_consentType: { patientId: 'patient-1', consentType: 'analytics' } },
      select: { granted: true },
    });
    expect(prisma.patientActivityEvent.create).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.upsert).not.toHaveBeenCalled();
  });

  it('records the event when the analytics consent row is granted', async () => {
    const { service, prisma } = buildService();
    prisma.patientConsent.findUnique.mockResolvedValueOnce({ granted: true });

    await service.trackEvent({ eventType: 'page_view' }, { sub: 'user-1' } as any);

    expect(prisma.patientActivityEvent.create).toHaveBeenCalled();
  });

  it('does not consult consent for anonymous (pre-login) events', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent({ eventType: 'page_view', anonymousVisitorId: 'anon-1' }, undefined);

    expect(prisma.patientConsent.findUnique).not.toHaveBeenCalled();
    expect(prisma.patientActivityEvent.create).toHaveBeenCalled();
  });

  it('honours the staging BFF x-hha-analytics-test marker even outside a dev NODE_ENV', async () => {
    const { service, prisma } = buildService();
    await service.trackEvent(
      { eventType: 'page_view', anonymousVisitorId: 'anon-1' },
      undefined,
      { analyticsTest: true },
    );

    expect(prisma.patientActivityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isTestEvent: true }) }),
    );
  });
});

describe('AnalyticsService.getFunnelAnalytics (unique-user KPIs)', () => {
  function buildService(rows: Array<{ eventName: string; patientId: string | null; anonymousVisitorId: string | null }>) {
    const prisma = { patientActivityEvent: { findMany: jest.fn().mockResolvedValue(rows) } };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('counts unique users per step, not raw events, and derives KPI percentages', async () => {
    const { service } = buildService([
      // 2 unique otp_requested (p1 twice, p2 once) -> 2 unique users
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p1' },
      { eventName: 'otp_requested', patientId: null, anonymousVisitorId: 'p2' },
      // only p1 verifies
      { eventName: 'otp_verify_success', patientId: null, anonymousVisitorId: 'p1' },
    ]);

    const result = await service.getFunnelAnalytics('30d');

    const otpRequested = result.data.steps.find((s) => s.eventName === 'otp_requested');
    expect(otpRequested).toEqual({ eventName: 'otp_requested', count: 3, uniqueUsers: 2, uniqueSessions: 0 });

    const kpi = result.data.kpis.find((k) => k.key === 'otpVerificationRate');
    expect(kpi).toEqual({ key: 'otpVerificationRate', label: 'OTP Verification Rate', numerator: 1, denominator: 2, value: 50 });
  });

  it('reports a null KPI value instead of dividing by zero when the denominator step never fired', async () => {
    const { service } = buildService([]);
    const result = await service.getFunnelAnalytics('30d');

    expect(result.data.steps).toEqual([]);
    expect(result.data.kpis.every((k) => k.value === null)).toBe(true);
  });

  it('passes country/device filters through to the query', async () => {
    const { service, prisma } = buildService([]);
    await service.getFunnelAnalytics('7d', { country: 'NG', device: 'Mobile' });

    expect(prisma.patientActivityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ countryCode: 'NG', deviceCategory: 'Mobile' }),
      }),
    );
  });

  it('excludes test / synthetic traffic from the dashboard query by default (spec §20/§30)', async () => {
    const { service, prisma } = buildService([]);
    await service.getFunnelAnalytics('30d');

    expect(prisma.patientActivityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isTestEvent: false }) }),
    );
  });

  it('computes activation rate as registered users who also did a qualifying action', async () => {
    const { service } = buildService([
      { eventName: 'registration_complete', patientId: 'p1', anonymousVisitorId: null } as any,
      { eventName: 'registration_complete', patientId: 'p2', anonymousVisitorId: null } as any,
      // only p1 goes on to do a qualifying action
      { eventName: 'booking_confirmed', patientId: 'p1', anonymousVisitorId: null } as any,
      // an unregistered user doing a qualifying action doesn't count as activated
      { eventName: 'payment_success', patientId: 'p3', anonymousVisitorId: null } as any,
    ]);

    const result = await service.getFunnelAnalytics('30d');

    const activation = result.data.kpis.find((k) => k.key === 'activationRate');
    expect(activation).toEqual({ key: 'activationRate', label: 'Activation Rate', numerator: 1, denominator: 2, value: 50 });
  });

  it('narrows by continent client-side after fetching (continent has no DB column)', async () => {
    const { service } = buildService([
      { eventName: 'page_view', patientId: null, anonymousVisitorId: 'ng-visitor', countryCode: 'NG' } as any,
      { eventName: 'page_view', patientId: null, anonymousVisitorId: 'us-visitor', countryCode: 'US' } as any,
    ]);

    const result = await service.getFunnelAnalytics('30d', { continent: 'Africa' });

    expect(result.data.steps).toEqual([{ eventName: 'page_view', count: 1, uniqueUsers: 1, uniqueSessions: 0 }]);
  });
});

describe('AnalyticsService.getClickstreamAnalytics (CTA impressions/clicks/CTR)', () => {
  function buildService(rows: Array<{ eventName: string; elementId: string | null; patientId: string | null; anonymousVisitorId: string | null }>) {
    const prisma = { patientActivityEvent: { findMany: jest.fn().mockResolvedValue(rows) } };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('computes CTR as unique clickers ÷ unique viewers, not raw event counts', async () => {
    const { service } = buildService([
      // 3 impressions, 2 unique viewers (p1 twice — two page loads)
      { eventName: 'cta_impression', elementId: 'book_telecare_btn', patientId: 'p1', anonymousVisitorId: null },
      { eventName: 'cta_impression', elementId: 'book_telecare_btn', patientId: 'p1', anonymousVisitorId: null },
      { eventName: 'cta_impression', elementId: 'book_telecare_btn', patientId: 'p2', anonymousVisitorId: null },
      // only p1 clicks
      { eventName: 'ui_click', elementId: 'book_telecare_btn', patientId: 'p1', anonymousVisitorId: null },
    ]);

    const result = await service.getClickstreamAnalytics('30d');

    expect(result.data.ctas).toEqual([
      { elementId: 'book_telecare_btn', impressions: 3, uniqueImpressions: 2, clicks: 1, uniqueClicks: 1, ctr: 50 },
    ]);
  });

  it('reports a null CTR instead of dividing by zero when the element has never been seen', async () => {
    const { service } = buildService([
      { eventName: 'ui_click', elementId: 'orphan_btn', patientId: null, anonymousVisitorId: 'a1' },
    ]);

    const result = await service.getClickstreamAnalytics('30d');

    expect(result.data.ctas).toEqual([
      { elementId: 'orphan_btn', impressions: 0, uniqueImpressions: 0, clicks: 1, uniqueClicks: 1, ctr: null },
    ]);
  });

  it('keeps separate elements separate and sorts by click volume', async () => {
    const { service } = buildService([
      { eventName: 'cta_impression', elementId: 'low_click_btn', patientId: null, anonymousVisitorId: 'v1' },
      { eventName: 'ui_click', elementId: 'low_click_btn', patientId: null, anonymousVisitorId: 'v1' },
      { eventName: 'cta_impression', elementId: 'high_click_btn', patientId: null, anonymousVisitorId: 'v2' },
      { eventName: 'ui_click', elementId: 'high_click_btn', patientId: null, anonymousVisitorId: 'v2' },
      { eventName: 'ui_click', elementId: 'high_click_btn', patientId: null, anonymousVisitorId: 'v3' },
    ]);

    const result = await service.getClickstreamAnalytics('30d');

    expect(result.data.ctas.map((c) => c.elementId)).toEqual(['high_click_btn', 'low_click_btn']);
  });
});

describe('AnalyticsService.getRetentionAnalytics (D1/D7/D30/D60/D90)', () => {
  function buildService(registrations: unknown[], activity: unknown[]) {
    const prisma = {
      patientActivityEvent: {
        findMany: jest.fn().mockResolvedValueOnce(registrations).mockResolvedValueOnce(activity),
      },
    };
    const service = new AnalyticsService(prisma as any);
    return { service };
  }

  it('counts a patient as D7-retained only if they returned 7+ days after registering', async () => {
    const registeredAt = new Date();
    registeredAt.setDate(registeredAt.getDate() - 20); // registered 20 days ago -> eligible for D1/D7 windows

    const returnedD7 = new Date(registeredAt);
    returnedD7.setDate(returnedD7.getDate() + 8); // returned on day 8 -> counts for D1 and D7, not D30

    const { service } = await Promise.resolve(
      buildService(
        [{ patientId: 'p1', occurredAt: registeredAt }],
        [
          { patientId: 'p1', occurredAt: registeredAt }, // the registration event itself
          { patientId: 'p1', occurredAt: returnedD7 },
        ],
      ),
    );

    const result = await service.getRetentionAnalytics(90);

    const d1 = result.data.windows.find((w) => w.days === 1);
    const d7 = result.data.windows.find((w) => w.days === 7);
    const d30 = result.data.windows.find((w) => w.days === 30);

    expect(d1).toMatchObject({ eligibleCohortSize: 1, retainedUsers: 1, rate: 100 });
    expect(d7).toMatchObject({ eligibleCohortSize: 1, retainedUsers: 1, rate: 100 });
    // Registered only 20 days ago -> not yet eligible for the D30 window at all.
    expect(d30).toMatchObject({ eligibleCohortSize: 0, retainedUsers: 0, rate: null });
  });

  it('does not double-count a patient who fired registration_complete more than once', async () => {
    const first = new Date();
    first.setDate(first.getDate() - 40);
    const duplicate = new Date();
    duplicate.setDate(duplicate.getDate() - 39);

    const { service } = buildService(
      [
        { patientId: 'p1', occurredAt: duplicate },
        { patientId: 'p1', occurredAt: first }, // earlier row arrives second — must still win
      ],
      [],
    );

    const result = await service.getRetentionAnalytics(90);
    expect(result.data.cohortSize).toBe(1);
  });

  it('counts a patient as D60/D90-retained only once they return that far out, using the default lookback', async () => {
    const registeredAt = new Date();
    registeredAt.setDate(registeredAt.getDate() - 95); // old enough to be eligible for every window, including D90

    const returnedD65 = new Date(registeredAt);
    returnedD65.setDate(returnedD65.getDate() + 65); // past D60, short of D90

    const { service } = buildService(
      [{ patientId: 'p1', occurredAt: registeredAt }],
      [
        { patientId: 'p1', occurredAt: registeredAt },
        { patientId: 'p1', occurredAt: returnedD65 },
      ],
    );

    // No lookbackDays passed — must default to enough of a buffer past D90
    // for a 95-day-old registration to actually be eligible for it.
    const result = await service.getRetentionAnalytics();

    const d30 = result.data.windows.find((w) => w.days === 30);
    const d60 = result.data.windows.find((w) => w.days === 60);
    const d90 = result.data.windows.find((w) => w.days === 90);

    expect(d30).toMatchObject({ eligibleCohortSize: 1, retainedUsers: 1, rate: 100 });
    expect(d60).toMatchObject({ eligibleCohortSize: 1, retainedUsers: 1, rate: 100 });
    expect(d90).toMatchObject({ eligibleCohortSize: 1, retainedUsers: 0, rate: 0 });
  });

  it('reports lookbackDays used and a stable cohortDefinitionVersion for historical comparability', async () => {
    const { service } = buildService([], []);
    const result = await service.getRetentionAnalytics();

    expect(result.data.lookbackDays).toBe(120); // max window (90) + 30-day buffer
    expect(result.data.cohortDefinitionVersion).toBe(1);
  });
});

describe('AnalyticsService.getEngagementScore (transparent, versioned)', () => {
  function buildService(overrides: {
    lastLoginAt?: Date | null;
    patientExists?: boolean;
    subscriptionTier?: string | null;
    eventCounts?: Record<string, number>;
  } = {}) {
    const eventCounts = overrides.eventCounts ?? {};
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ lastLoginAt: overrides.lastLoginAt ?? null }) },
      patient: { findUnique: jest.fn().mockResolvedValue(overrides.patientExists === false ? null : { id: 'p1' }) },
      patientSubscription: {
        findFirst: jest.fn().mockResolvedValue(
          overrides.subscriptionTier ? { plan: { tier: overrides.subscriptionTier } } : null,
        ),
      },
      patientActivityEvent: {
        groupBy: jest.fn().mockResolvedValue(
          Object.entries(eventCounts).map(([eventName, count]) => ({ eventName, _count: { _all: count } })),
        ),
      },
    };
    const service = new AnalyticsService(prisma as any);
    return { service };
  }

  it('scores a fully inactive patient as 0 / Dormant', async () => {
    const { service } = buildService({ patientExists: true });

    const result = await service.getEngagementScore('u1', 'p1');

    expect(result.data).toEqual({
      score: 15, // profileComplete only — a Patient row always exists once someone reaches this call
      category: 'At Risk',
      version: 1,
      components: {
        recentLogin: 0, profileComplete: 15, hasBooking: 0, repeatBooking: 0,
        hasUpload: 0, hasVitals: 0, paidSubscription: 0,
      },
    });
  });

  it('scores full engagement across every signal as Highly Engaged', async () => {
    const recentLogin = new Date();
    const { service } = buildService({
      lastLoginAt: recentLogin,
      patientExists: true,
      subscriptionTier: 'Gold',
      eventCounts: { booking_confirmed: 3, upload_success: 1, manual_entry_success: 1 },
    });

    const result = await service.getEngagementScore('u1', 'p1');

    expect(result.data.score).toBe(100);
    expect(result.data.category).toBe('Highly Engaged');
  });

  it('does not award the paid-subscription component for the Free tier', async () => {
    const { service } = buildService({ patientExists: true, subscriptionTier: 'Free' });

    const result = await service.getEngagementScore('u1', 'p1');

    expect(result.data.components.paidSubscription).toBe(0);
  });

  it('awards repeatBooking only on the second confirmed booking, not the first', async () => {
    const { service: single } = buildService({ patientExists: true, eventCounts: { booking_confirmed: 1 } });
    const { service: repeat } = buildService({ patientExists: true, eventCounts: { booking_confirmed: 2 } });

    const singleResult = await single.getEngagementScore('u1', 'p1');
    const repeatResult = await repeat.getEngagementScore('u1', 'p1');

    expect(singleResult.data.components).toMatchObject({ hasBooking: 20, repeatBooking: 0 });
    expect(repeatResult.data.components).toMatchObject({ hasBooking: 20, repeatBooking: 10 });
  });
});

describe('AnalyticsService.getDigitalExperienceAnalytics (device/browser + client errors)', () => {
  function buildService(events: Array<{ eventName: string; deviceCategory: string | null; userAgent: string | null; properties?: unknown }>) {
    const prisma = { patientActivityEvent: { findMany: jest.fn().mockResolvedValue(events) } };
    const service = new AnalyticsService(prisma as any);
    return { service };
  }

  it('breaks down devices and browsers from stored deviceCategory/userAgent', async () => {
    const { service } = buildService([
      { eventName: 'page_view', deviceCategory: 'Mobile', userAgent: 'Mozilla/5.0 (iPhone) CriOS/1.0 Safari/1.0' },
      { eventName: 'page_view', deviceCategory: 'Desktop', userAgent: 'Mozilla/5.0 (Windows) Chrome/1.0 Safari/1.0' },
      { eventName: 'page_view', deviceCategory: 'Desktop', userAgent: 'Mozilla/5.0 (Macintosh) Version/1.0 Safari/1.0' },
    ]);

    const result = await service.getDigitalExperienceAnalytics('30d');

    expect(result.data.totalEvents).toBe(3);
    expect(result.data.devices).toEqual([{ device: 'Desktop', count: 2 }, { device: 'Mobile', count: 1 }]);
    expect(result.data.browsers).toEqual(
      expect.arrayContaining([{ browser: 'Chrome', count: 2 }, { browser: 'Safari', count: 1 }]),
    );
  });

  it('counts client_error events and ranks their top messages', async () => {
    const { service } = buildService([
      { eventName: 'page_view', deviceCategory: 'Desktop', userAgent: 'Chrome/1.0' },
      { eventName: 'client_error', deviceCategory: 'Desktop', userAgent: 'Chrome/1.0', properties: { message: 'TypeError: x is undefined' } },
      { eventName: 'client_error', deviceCategory: 'Mobile', userAgent: 'CriOS/1.0', properties: { message: 'TypeError: x is undefined' } },
      { eventName: 'client_error', deviceCategory: 'Desktop', userAgent: 'Chrome/1.0', properties: { message: 'NetworkError' } },
    ]);

    const result = await service.getDigitalExperienceAnalytics('30d');

    expect(result.data.errorCount).toBe(3);
    expect(result.data.errorRate).toBe(75); // 3 of 4 total events
    expect(result.data.topErrors[0]).toEqual({ message: 'TypeError: x is undefined', count: 2 });
  });

  it('reports a null error rate instead of dividing by zero when there is no traffic', async () => {
    const { service } = buildService([]);
    const result = await service.getDigitalExperienceAnalytics('30d');

    expect(result.data.errorRate).toBeNull();
    expect(result.data.errorCount).toBe(0);
  });
});

describe('AnalyticsService.getGeoComparison (declared vs access geography)', () => {
  function buildService(events: Array<{ patientId: string; countryCode: string }>, patients: Array<{ id: string; country: string }>) {
    const prisma = {
      patientActivityEvent: { findMany: jest.fn().mockResolvedValue(events) },
      patient: { findMany: jest.fn().mockResolvedValue(patients) },
    };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('matches declared country name against the access country code via Intl.DisplayNames', async () => {
    const { service } = buildService(
      [{ patientId: 'p1', countryCode: 'NG' }],
      [{ id: 'p1', country: 'Nigeria' }],
    );

    const result = await service.getGeoComparison('30d');

    expect(result.data.comparisons).toEqual([
      { declaredCountry: 'Nigeria', accessCountry: 'Nigeria', patients: 1, matches: true },
    ]);
    expect(result.data.diasporaPatients).toBe(0);
  });

  it('flags a diaspora patient when declared and access countries differ', async () => {
    const { service } = buildService(
      [{ patientId: 'p1', countryCode: 'US' }],
      [{ id: 'p1', country: 'Nigeria' }],
    );

    const result = await service.getGeoComparison('30d');

    expect(result.data.comparisons[0]).toMatchObject({ declaredCountry: 'Nigeria', accessCountry: 'United States', matches: false });
    expect(result.data.diasporaPatients).toBe(1);
  });
});

describe('AnalyticsService.getDemographicsAnalytics (age band / gender / nationality / plan)', () => {
  const now = new Date();
  // Relative to "now" rather than fixed calendar dates so this test never
  // rots into a different age band as the years pass.
  function bornYearsAgo(years: number): Date {
    return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  }

  function buildService(patients: Array<{
    dateOfBirth: Date;
    gender: string;
    nationality: string | null;
    subscriptions: Array<{ plan: { tier: string } }>;
  }>) {
    const prisma = { patient: { findMany: jest.fn().mockResolvedValue(patients) } };
    const service = new AnalyticsService(prisma as any);
    return { service, prisma };
  }

  it('excludes patients whose user account is soft-deleted', async () => {
    const { service, prisma } = buildService([]);
    await service.getDemographicsAnalytics();

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user: { deletedAt: null } } }),
    );
  });

  it('buckets patients into configured age bands, ordered by age progression not count', async () => {
    const { service } = buildService([
      { dateOfBirth: bornYearsAgo(70), gender: 'Male', nationality: 'Nigerian', subscriptions: [] },
      { dateOfBirth: bornYearsAgo(70), gender: 'Male', nationality: 'Nigerian', subscriptions: [] },
      { dateOfBirth: bornYearsAgo(70), gender: 'Male', nationality: 'Nigerian', subscriptions: [] },
      { dateOfBirth: bornYearsAgo(20), gender: 'Female', nationality: 'Nigerian', subscriptions: [] },
    ]);

    const result = await service.getDemographicsAnalytics();

    // 65+ has 3x the count of 18-24 but must still render after it.
    expect(result.data.ageBands).toEqual([
      { label: '18–24', count: 1 },
      { label: '65+', count: 3 },
    ]);
    expect(result.data.totalPatients).toBe(4);
  });

  it('counts gender and defaults an undeclared nationality to "Not declared"', async () => {
    const { service } = buildService([
      { dateOfBirth: bornYearsAgo(30), gender: 'Female', nationality: null, subscriptions: [] },
      { dateOfBirth: bornYearsAgo(30), gender: 'Female', nationality: '  ', subscriptions: [] },
    ]);

    const result = await service.getDemographicsAnalytics();

    expect(result.data.genders).toEqual([{ label: 'Female', count: 2 }]);
    expect(result.data.nationalities).toEqual([{ label: 'Not declared', count: 2 }]);
  });

  it('defaults plan tier to Free when there is no active subscription', async () => {
    const { service } = buildService([
      { dateOfBirth: bornYearsAgo(30), gender: 'Male', nationality: 'Ghanaian', subscriptions: [] },
      { dateOfBirth: bornYearsAgo(30), gender: 'Male', nationality: 'Ghanaian', subscriptions: [{ plan: { tier: 'GoldCare' } }] },
    ]);

    const result = await service.getDemographicsAnalytics();

    expect(result.data.planTiers).toEqual(
      expect.arrayContaining([{ label: 'Free', count: 1 }, { label: 'GoldCare', count: 1 }]),
    );
  });
});

describe('AnalyticsService.getTrafficAnalytics (country -> region -> city hierarchy)', () => {
  function buildService(visits: Array<{ occurredAt: Date; countryCode: string | null; region: string | null; city: string | null; userAgent?: string | null; referrer?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }>) {
    const prisma = { siteVisit: { findMany: jest.fn().mockResolvedValue(visits) } };
    const service = new AnalyticsService(prisma as any);
    return { service };
  }

  it('nests visits by country, then region, then city, sorted by visit count', async () => {
    const { service } = buildService([
      { occurredAt: new Date(), countryCode: 'ng', region: 'LA', city: 'Lagos' },
      { occurredAt: new Date(), countryCode: 'ng', region: 'LA', city: 'Lagos' },
      { occurredAt: new Date(), countryCode: 'ng', region: 'FC', city: 'Abuja' },
      { occurredAt: new Date(), countryCode: 'us', region: 'CA', city: 'San Francisco' },
    ]);

    const result = await service.getTrafficAnalytics('30d');

    expect(result.data.hierarchy).toEqual([
      {
        continent: 'Africa', continentCode: 'AF', visits: 3,
        countries: [{
          countryCode: 'NG', visits: 3,
          regions: [
            { region: 'LA', visits: 2, cities: [{ city: 'Lagos', visits: 2 }] },
            { region: 'FC', visits: 1, cities: [{ city: 'Abuja', visits: 1 }] },
          ],
        }],
      },
      {
        continent: 'North America', continentCode: 'NA', visits: 1,
        countries: [{
          countryCode: 'US', visits: 1,
          regions: [{ region: 'CA', visits: 1, cities: [{ city: 'San Francisco', visits: 1 }] }],
        }],
      },
    ]);
  });

  it('groups multiple countries under the same continent, sorted by visit count within it', async () => {
    const { service } = buildService([
      { occurredAt: new Date(), countryCode: 'ng', region: 'LA', city: 'Lagos' },
      { occurredAt: new Date(), countryCode: 'gh', region: 'AA', city: 'Accra' },
      { occurredAt: new Date(), countryCode: 'gh', region: 'AA', city: 'Accra' },
    ]);

    const result = await service.getTrafficAnalytics('30d');

    expect(result.data.hierarchy).toEqual([
      {
        continent: 'Africa', continentCode: 'AF', visits: 3,
        countries: [
          { countryCode: 'GH', visits: 2, regions: [{ region: 'AA', visits: 2, cities: [{ city: 'Accra', visits: 2 }] }] },
          { countryCode: 'NG', visits: 1, regions: [{ region: 'LA', visits: 1, cities: [{ city: 'Lagos', visits: 1 }] }] },
        ],
      },
    ]);
  });

  it('buckets missing geo data under "Unknown" instead of dropping it', async () => {
    const { service } = buildService([{ occurredAt: new Date(), countryCode: null, region: null, city: null }]);

    const result = await service.getTrafficAnalytics('30d');

    expect(result.data.hierarchy).toEqual([
      {
        continent: 'Unknown', continentCode: 'UN', visits: 1,
        countries: [{ countryCode: 'Unknown', visits: 1, regions: [{ region: 'Unknown', visits: 1, cities: [{ city: 'Unknown', visits: 1 }] }] }],
      },
    ]);
  });
});
