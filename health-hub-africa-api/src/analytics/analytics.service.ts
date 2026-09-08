import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RecordVisitDto } from './dto/record-visit.dto';
import { continentForCountry } from './continent-map';

export interface ActivityEventDto {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  anonymousVisitorId?: string;
  // Client-generated, persisted per browser-tab-session (sessionStorage) —
  // groups events into a visit without reusing the auth session identifier.
  analyticsSessionId?: string;
}

export interface VisitGeoContext {
  ipAddress?: string;
  userAgent?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

// Crude but effective — the same substrings every major analytics vendor
// checks first. Not trying to catch every bot (that's what real bot-
// management products are for); just keeping obvious crawlers out of
// "how many people visited" without adding a dependency for it.
const BOT_USER_AGENT = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|pingdom|uptimerobot|headlesschrome/i;

// Shared by getTrafficAnalytics (site visits) and trackEvent (funnel events)
// so both dashboards categorize devices identically.
function deviceCategoryFromUserAgent(userAgent: string | undefined): string {
  const ua = userAgent?.toLowerCase() ?? '';
  if (/ipad|tablet|kindle/.test(ua)) return 'Tablet';
  if (/mobile|iphone|android/.test(ua)) return 'Mobile';
  return ua ? 'Desktop' : 'Unknown';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Event Ingestion ────────────────────────────────────────────────────────

  // Public endpoint — currentUser is present only when a valid access token
  // was attached. Anonymous (pre-login) events are identified instead by the
  // client-persisted anonymousVisitorId, so the same table now covers both
  // halves of the identity model instead of authenticated patients only.
  async trackEvent(dto: ActivityEventDto, currentUser?: JwtPayload, geo?: VisitGeoContext) {
    try {
      const patientId = currentUser
        ? (await this.prisma.patient.findUnique({ where: { userId: currentUser.sub }, select: { id: true } }))?.id
        : undefined;

      // Nothing to key the row on — drop rather than write an orphan event.
      if (!patientId && !dto.anonymousVisitorId) return;

      await this.prisma.patientActivityEvent.create({
        data: {
          patientId,
          anonymousVisitorId: patientId ? undefined : dto.anonymousVisitorId,
          analyticsSessionId: dto.analyticsSessionId,
          environment: process.env.NODE_ENV ?? 'development',
          eventName: dto.eventType,
          countryCode: geo?.countryCode,
          deviceCategory: deviceCategoryFromUserAgent(geo?.userAgent),
          properties: {
            entityType: dto.entityType,
            entityId: dto.entityId,
            ...(dto.metadata ?? {}),
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Never break the caller for analytics failures
      this.logger.error('Analytics track failed', err);
    }
  }

  // ── Admin Dashboards ───────────────────────────────────────────────────────

  async getOperationalKpis() {
    const [
      totalPatients,
      totalProviders,
      activeAppointments,
      openDispatchCases,
      openExpertReviewCases,
      openSupportTickets,
    ] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.provider.count({ where: { user: { isVerified: true } } }),
      this.prisma.appointment.count({
        where: { status: { in: ['requested', 'confirmed', 'upcoming', 'in_progress'] } },
      }),
      this.prisma.dispatchRequest.count({
        where: { status: { notIn: ['closed'] } },
      }),
      this.prisma.expertReviewCase.count({
        where: { status: { notIn: ['closed', 'cancelled'] } },
      }),
      this.prisma.supportTicket.count({
        where: { status: { notIn: ['resolved', 'closed'] } },
      }),
    ]);

    return {
      totalPatients,
      totalProviders,
      activeAppointments,
      openDispatchCases,
      openExpertReviewCases,
      openSupportTickets,
      generatedAt: new Date(),
    };
  }

  async getRevenueReport(fromDate: string, toDate: string) {
    return this.prisma.payment.groupBy({
      by: ['currency', 'gateway'],
      where: {
        status: 'paid',
        paidAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
      _sum: { amountKobo: true },
      _count: { id: true },
    });
  }

  async getServiceUsageStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [appointments, telecareCount, labOrders, dispatchCases, expertReviews] =
      await Promise.all([
        this.prisma.appointment.count({ where: { createdAt: { gte: since } } }),
        this.prisma.telecareSession.count({ where: { createdAt: { gte: since } } }),
        this.prisma.labOrder.count({ where: { orderedAt: { gte: since } } }),
        this.prisma.dispatchRequest.count({ where: { createdAt: { gte: since } } }),
        this.prisma.expertReviewCase.count({ where: { createdAt: { gte: since } } }),
      ]);

    return {
      period: { days, since },
      appointments,
      telecareSessions: telecareCount,
      labOrders,
      dispatchCases,
      expertReviewCases: expertReviews,
    };
  }

  // ── Site Visits (public, anonymous) ───────────────────────────────────────
  //
  // Distinct from trackEvent above: trackEvent requires an authenticated
  // Patient (behavior inside the portal), site visits are anonymous traffic
  // on the public marketing site (myvaultplus-web) — most visitors here
  // never register at all. Geo is resolved server-side from trusted edge
  // headers by the caller (AnalyticsPublicController), never trusted from
  // the client directly.

  async recordVisit(dto: RecordVisitDto, geo: VisitGeoContext): Promise<void> {
    if (geo.userAgent && BOT_USER_AGENT.test(geo.userAgent)) return;

    try {
      await this.prisma.siteVisit.create({
        data: {
          path: dto.path?.slice(0, 500) ?? '/',
          referrer: dto.referrer,
          landingPage: dto.landingPage,
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          utmTerm: dto.utmTerm,
          utmContent: dto.utmContent,
          countryCode: geo.countryCode,
          region: geo.region,
          city: geo.city,
          timezone: dto.timezone,
          userAgent: geo.userAgent?.slice(0, 1000),
        },
      });
    } catch (err) {
      // Best-effort — a dropped pageview is never worth failing the request
      // the visitor's browser is waiting on.
      this.logger.warn(`Failed to record site visit: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getTrafficAnalytics(period = '30d') {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const visits = await this.prisma.siteVisit.findMany({
      where: { occurredAt: { gte: since } },
      select: {
        occurredAt: true, countryCode: true, region: true, city: true,
        userAgent: true, referrer: true, utmSource: true, utmMedium: true, utmCampaign: true,
      },
    });

    const dayMap = new Map<string, number>();
    const cursor = new Date(since);
    cursor.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    while (cursor <= today) {
      dayMap.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const v of visits) {
      const day = v.occurredAt.toISOString().slice(0, 10);
      const row = dayMap.get(day);
      if (row !== undefined) dayMap.set(day, row + 1);
    }

    const locationMap = new Map<string, { countryCode: string; continent: string; region: string; city: string; visits: number }>();
    const deviceMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();
    const campaignMap = new Map<string, { campaign: string; source: string; medium: string; visits: number }>();

    for (const v of visits) {
      const countryCode = v.countryCode?.toUpperCase() ?? 'Unknown';
      const region = v.region ?? 'Unknown';
      const city = v.city ?? 'Unknown';
      const locationKey = `${countryCode} ${region} ${city}`;
      const location = locationMap.get(locationKey) ?? { countryCode, continent: continentForCountry(countryCode), region, city, visits: 0 };
      location.visits++;
      locationMap.set(locationKey, location);

      const device = deviceCategoryFromUserAgent(v.userAgent ?? undefined);
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);

      if (v.referrer) {
        let referrer = v.referrer;
        try {
          referrer = new URL(v.referrer).hostname.replace(/^www\./, '');
        } catch {
          referrer = v.referrer.slice(0, 120);
        }
        referrerMap.set(referrer, (referrerMap.get(referrer) ?? 0) + 1);
      }

      if (v.utmCampaign || v.utmSource || v.utmMedium) {
        const campaign = v.utmCampaign ?? '(not set)';
        const source = v.utmSource ?? '(direct)';
        const medium = v.utmMedium ?? '(not set)';
        const key = `${campaign} ${source} ${medium}`;
        const row = campaignMap.get(key) ?? { campaign, source, medium, visits: 0 };
        row.visits++;
        campaignMap.set(key, row);
      }
    }

    return {
      data: {
        totalVisits: visits.length,
        activity: Array.from(dayMap.entries()).map(([date, count]) => ({ date, visits: count })),
        locations: Array.from(locationMap.values()).sort((a, b) => b.visits - a.visits).slice(0, 20),
        devices: Array.from(deviceMap.entries())
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
        referrers: Array.from(referrerMap.entries())
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        campaigns: Array.from(campaignMap.values()).sort((a, b) => b.visits - a.visits).slice(0, 20),
      },
    };
  }

  // KPI formulas per the analytics spec (§26), adapted to this app's actual
  // event order rather than the spec's idealized one — e.g. registration_complete
  // fires when the account is created (pre-verification), not after OTP, so
  // "registration conversion" here means completed accounts that go on to
  // verify, not landing-to-signup (no registration_start event exists; see
  // FUNNEL_GROUPS in the admin dashboard for why that was skipped).
  private static readonly KPI_DEFINITIONS: Array<{
    key: string;
    label: string;
    numerator: string;
    denominator: string;
  }> = [
    { key: 'otpVerificationRate', label: 'OTP Verification Rate', numerator: 'otp_verify_success', denominator: 'otp_requested' },
    { key: 'registrationToVerifiedRate', label: 'Registered → Verified', numerator: 'otp_verify_success', denominator: 'registration_complete' },
    { key: 'bookingConversionRate', label: 'Booking Conversion', numerator: 'booking_confirmed', denominator: 'booking_started' },
    { key: 'paymentSuccessRate', label: 'Payment Success Rate', numerator: 'payment_success', denominator: 'checkout_started' },
  ];

  // Spec §13: activation = a completed registration followed by at least one
  // approved meaningful health action. ponytail: scoped to "within the same
  // reporting period" rather than an unbounded lookback from each patient's
  // actual registration date — a correct unbounded version needs per-user
  // registration timestamps carried forward across periods, which nothing
  // here tracks yet. Extend if the business needs the stricter definition.
  private static readonly ACTIVATION_QUALIFYING_EVENTS = [
    'booking_confirmed', 'payment_success', 'upload_success', 'manual_entry_success', 'ticket_created',
  ];

  // Step counts (raw + unique users/sessions) for every funnel event name
  // emitted via analytics.track() — not hardcoded per funnel so new event
  // names show up automatically as screens are instrumented; the dashboard
  // groups them into named steps. Optional country/continent/device filters
  // narrow both the steps and the KPIs computed from them.
  async getFunnelAnalytics(period = '30d', filters?: { country?: string; continent?: string; device?: string }) {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.patientActivityEvent.findMany({
      where: {
        occurredAt: { gte: since },
        ...(filters?.country && { countryCode: filters.country }),
        ...(filters?.device && { deviceCategory: filters.device }),
      },
      select: { eventName: true, patientId: true, anonymousVisitorId: true, analyticsSessionId: true, countryCode: true },
    });
    const filtered = filters?.continent
      ? rows.filter((r) => continentForCountry(r.countryCode) === filters.continent)
      : rows;

    const byEvent = new Map<string, { count: number; users: Set<string>; sessions: Set<string> }>();
    for (const r of filtered) {
      const bucket = byEvent.get(r.eventName) ?? { count: 0, users: new Set(), sessions: new Set() };
      bucket.count++;
      const userKey = r.patientId ?? (r.anonymousVisitorId ? `anon:${r.anonymousVisitorId}` : undefined);
      if (userKey) bucket.users.add(userKey);
      if (r.analyticsSessionId) bucket.sessions.add(r.analyticsSessionId);
      byEvent.set(r.eventName, bucket);
    }

    const uniqueUsers = (eventName: string) => byEvent.get(eventName)?.users.size ?? 0;

    const registeredUsers = byEvent.get('registration_complete')?.users ?? new Set<string>();
    const activatedUsers = new Set<string>();
    for (const eventName of AnalyticsService.ACTIVATION_QUALIFYING_EVENTS) {
      for (const user of byEvent.get(eventName)?.users ?? []) {
        if (registeredUsers.has(user)) activatedUsers.add(user);
      }
    }
    const activationKpi = {
      key: 'activationRate',
      label: 'Activation Rate',
      numerator: activatedUsers.size,
      denominator: registeredUsers.size,
      value: registeredUsers.size > 0 ? Math.round((activatedUsers.size / registeredUsers.size) * 1000) / 10 : null,
    };

    return {
      data: {
        steps: Array.from(byEvent.entries())
          .map(([eventName, b]) => ({ eventName, count: b.count, uniqueUsers: b.users.size, uniqueSessions: b.sessions.size }))
          .sort((a, b) => b.count - a.count),
        kpis: [
          ...AnalyticsService.KPI_DEFINITIONS.map((def) => {
            const denominator = uniqueUsers(def.denominator);
            const numerator = uniqueUsers(def.numerator);
            return {
              key: def.key,
              label: def.label,
              numerator,
              denominator,
              value: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null,
            };
          }),
          activationKpi,
        ],
      },
    };
  }

  // Compares where a patient SAYS they live (Patient.country, entered at
  // onboarding) against where their sessions actually originate (IP-derived
  // countryCode on their events) — spec §4.4/§D. Only covers authenticated
  // events (anonymous visitors have no declared location to compare against).
  // Declared values never get overwritten by this — it's a read-only report.
  async getGeoComparison(period = '30d') {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.patientActivityEvent.findMany({
      where: { occurredAt: { gte: since }, patientId: { not: null }, countryCode: { not: null } },
      select: { patientId: true, countryCode: true },
      distinct: ['patientId', 'countryCode'],
    });

    const patientIds = Array.from(new Set(rows.map((r) => r.patientId as string)));
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, country: true },
    });
    const declaredByPatient = new Map(patients.map((p) => [p.id, p.country]));

    // Patient.country is a free-text country NAME ("Nigeria"); the access
    // side is an ISO alpha-2 code ("NG") off the geo headers. Intl.DisplayNames
    // converts the code to its English name so the two sides compare
    // meaningfully instead of "Nigeria" !== "NG" always mismatching.
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const comparisonMap = new Map<string, { declaredCountry: string; accessCountry: string; patients: number; matches: boolean }>();
    for (const r of rows) {
      const declaredCountry = declaredByPatient.get(r.patientId as string) ?? 'Unknown';
      const accessCode = (r.countryCode as string).toUpperCase();
      let accessCountry = accessCode;
      try {
        accessCountry = regionNames.of(accessCode) ?? accessCode;
      } catch {
        // Unrecognized/reserved code (e.g. private IP range) — keep the raw code.
      }
      const matches = declaredCountry.toLowerCase() === accessCountry.toLowerCase();
      const key = `${declaredCountry}|${accessCountry}`;
      const row = comparisonMap.get(key) ?? { declaredCountry, accessCountry, patients: 0, matches };
      row.patients++;
      comparisonMap.set(key, row);
    }

    const comparisons = Array.from(comparisonMap.values()).sort((a, b) => b.patients - a.patients);
    const diasporaPatients = comparisons.filter((c) => !c.matches).reduce((sum, c) => sum + c.patients, 0);

    return {
      data: {
        comparisons,
        totalPatients: patientIds.length,
        diasporaPatients,
      },
    };
  }

  // Spec §16: N-day retention. ponytail: this is the common product-analytics
  // simplification ("returned at least once N+ days after registering"), not
  // a strict single-day cohort curve (active on exactly day N) — the latter
  // needs a much larger sample to be statistically meaningful and isn't worth
  // the extra complexity until there's real registration volume to look at.
  // lookbackDays controls how far back to search for eligible cohort members
  // (must be >= the largest window, 30, or D30 has no eligible cohort at all).
  private static readonly RETENTION_WINDOWS = [1, 7, 30];

  async getRetentionAnalytics(lookbackDays = 90) {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    const now = new Date();

    const [registrations, activity] = await Promise.all([
      this.prisma.patientActivityEvent.findMany({
        where: { eventName: 'registration_complete', patientId: { not: null }, occurredAt: { gte: since } },
        select: { patientId: true, occurredAt: true },
      }),
      this.prisma.patientActivityEvent.findMany({
        where: { patientId: { not: null }, occurredAt: { gte: since } },
        select: { patientId: true, occurredAt: true },
      }),
    ]);

    // First registration_complete per patient — a re-fired event (retry,
    // duplicate tab) shouldn't reset their cohort start date.
    const registeredAt = new Map<string, Date>();
    for (const r of registrations) {
      const patientId = r.patientId as string;
      const existing = registeredAt.get(patientId);
      if (!existing || r.occurredAt < existing) registeredAt.set(patientId, r.occurredAt);
    }

    const activityByPatient = new Map<string, Date[]>();
    for (const a of activity) {
      const patientId = a.patientId as string;
      const list = activityByPatient.get(patientId) ?? [];
      list.push(a.occurredAt);
      activityByPatient.set(patientId, list);
    }

    const windows = AnalyticsService.RETENTION_WINDOWS.map((days) => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);

      let eligible = 0;
      let retained = 0;
      for (const [patientId, regDate] of registeredAt) {
        if (regDate > cutoff) continue; // hasn't had a chance to reach day N yet
        eligible++;
        const activityCutoff = new Date(regDate);
        activityCutoff.setDate(activityCutoff.getDate() + days);
        const returned = (activityByPatient.get(patientId) ?? []).some((t) => t >= activityCutoff);
        if (returned) retained++;
      }

      return {
        days,
        eligibleCohortSize: eligible,
        retainedUsers: retained,
        rate: eligible > 0 ? Math.round((retained / eligible) * 1000) / 10 : null,
      };
    });

    return { data: { windows, cohortSize: registeredAt.size } };
  }

  // Spec §17: Engagement Score must be transparent and configurable, not a
  // hidden AI score — weights live in one named constant, version bumps
  // whenever a weight/signal changes (so a report referencing an old score
  // can be told apart from a new one), and every response carries the raw
  // component contributions so Customer Success can see exactly why a
  // patient landed where they did without re-deriving it.
  //
  // ponytail: computed on demand for one patient (called from the admin user
  // detail page), not precomputed/stored for the whole patient base — there's
  // no established need yet for a sortable "all patients by engagement"
  // leaderboard, and building the batch/storage machinery for that before
  // anyone's asked for it is the kind of thing this spec itself warns
  // against (§13: "qualifying-event list and window must be configurable
  // and versioned", not "must run nightly for everyone").
  private static readonly ENGAGEMENT_SCORE_VERSION = 1;
  private static readonly ENGAGEMENT_WEIGHTS = {
    recentLogin: 20, // signed in within the last 30 days
    profileComplete: 15, // registration reached a Patient row
    hasBooking: 20, // booking_confirmed at least once, ever
    repeatBooking: 10, // booking_confirmed 2+ times
    hasUpload: 10, // upload_success at least once
    hasVitals: 10, // manual_entry_success at least once
    paidSubscription: 15, // active/trial subscription above the Free tier
  } as const; // sums to 100
  private static readonly ENGAGEMENT_CATEGORIES: Array<{ min: number; label: string }> = [
    { min: 80, label: 'Highly Engaged' },
    { min: 55, label: 'Engaged' },
    { min: 30, label: 'Low Engagement' },
    { min: 10, label: 'At Risk' },
    { min: 0, label: 'Dormant' },
  ];

  async getEngagementScore(userId: string, patientId: string) {
    const RECENT_LOGIN_DAYS = 30;
    const since = new Date();
    since.setDate(since.getDate() - RECENT_LOGIN_DAYS);

    const [user, patient, subscription, events] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true } }),
      this.prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }),
      this.prisma.patientSubscription.findFirst({
        where: { patientId, status: { in: ['active', 'trial'] } },
        select: { plan: { select: { tier: true } } },
      }),
      this.prisma.patientActivityEvent.groupBy({
        by: ['eventName'],
        where: { patientId, eventName: { in: ['booking_confirmed', 'upload_success', 'manual_entry_success'] } },
        _count: { _all: true },
      }),
    ]);

    const countOf = (eventName: string) => events.find((e) => e.eventName === eventName)?._count._all ?? 0;
    const bookingCount = countOf('booking_confirmed');
    const w = AnalyticsService.ENGAGEMENT_WEIGHTS;

    const components = {
      recentLogin: user?.lastLoginAt && user.lastLoginAt >= since ? w.recentLogin : 0,
      profileComplete: patient ? w.profileComplete : 0,
      hasBooking: bookingCount > 0 ? w.hasBooking : 0,
      repeatBooking: bookingCount > 1 ? w.repeatBooking : 0,
      hasUpload: countOf('upload_success') > 0 ? w.hasUpload : 0,
      hasVitals: countOf('manual_entry_success') > 0 ? w.hasVitals : 0,
      paidSubscription: subscription && subscription.plan.tier !== 'Free' ? w.paidSubscription : 0,
    };

    const score = Object.values(components).reduce((sum, v) => sum + v, 0);
    const category = AnalyticsService.ENGAGEMENT_CATEGORIES.find((c) => score >= c.min)?.label ?? 'Dormant';

    return {
      data: {
        score,
        category,
        version: AnalyticsService.ENGAGEMENT_SCORE_VERSION,
        components,
      },
    };
  }
}
