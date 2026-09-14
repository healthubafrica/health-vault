import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RecordVisitDto } from './dto/record-visit.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { continentForCountry, continentCodeForContinent } from './continent-map';
import { catalogEntry, EVENT_NAME_RE } from './analytics-events.catalog';
import { GeoResolverService } from './geo-resolver.service';

// Kept as an alias so existing importers don't churn; the shape now lives in
// TrackEventDto (a validated class — see dto/track-event.dto.ts).
export type ActivityEventDto = TrackEventDto;

export interface VisitGeoContext {
  ipAddress?: string;
  userAgent?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timezone?: string;
  // Set server-side by our own staging/synthetic-monitoring BFF via the
  // x-hha-analytics-test header — trusted at the same level as x-hha-client-ip
  // (same-origin BFF only). Marks the row is_test_event so production
  // dashboards exclude it (spec §20 / §30).
  analyticsTest?: boolean;
}

// Access-geo derived from trusted edge headers (Vercel / CloudFront), not a
// GeoIP database — stamped on every event so a row stays reproducible and
// its uncertainty is legible. Swapped for a real provider in a later branch.
const EDGE_GEO_PROVIDER = 'edge-header';

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

// Order matters: Edge and Opera UAs both contain "Chrome"/"Safari" tokens,
// so the more specific browsers must be checked first. Good enough for a
// breakdown chart — not trying to replace a real UA-parsing library.
function browserFromUserAgent(userAgent: string | undefined): string {
  const ua = userAgent?.toLowerCase() ?? '';
  if (!ua) return 'Unknown';
  if (/edg\//.test(ua)) return 'Edge';
  if (/opr\/|opera/.test(ua)) return 'Opera';
  if (/samsungbrowser/.test(ua)) return 'Samsung Internet';
  if (/firefox\//.test(ua)) return 'Firefox';
  if (/crios\/|chrome\//.test(ua)) return 'Chrome';
  if (/fxios\/|safari\//.test(ua)) return 'Safari';
  return 'Other';
}

// Same "good enough for a breakdown, not a UA library" bar as the two above.
function osFromUserAgent(userAgent: string | undefined): string {
  const ua = userAgent?.toLowerCase() ?? '';
  if (!ua) return 'Unknown';
  if (/windows nt/.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  if (/mac os x|macintosh/.test(ua)) return 'macOS';
  if (/android/.test(ua)) return 'Android';
  if (/cros/.test(ua)) return 'ChromeOS';
  if (/linux/.test(ua)) return 'Linux';
  return 'Other';
}

// country → 'country', +region → 'region', +city → 'city' (spec §H
// geo_accuracy_level — "communicate uncertainty", never fabricate precision).
function edgeGeoAccuracy(geo: VisitGeoContext | undefined): string {
  if (geo?.city) return 'city';
  if (geo?.region) return 'region';
  if (geo?.countryCode) return 'country';
  return 'unknown';
}

// Merged access-geo for a request: the self-hosted GeoLite2 lookup on the
// trusted client IP when available, otherwise the trusted edge-header geo
// the platform already resolves. Every field carries provider/accuracy so
// the stored row stays reproducible.
export interface AccessGeo {
  countryCode?: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  continentName?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  geoAccuracy: string;
  geoSource?: string;
  geoProvider?: string;
  geoProviderVersion?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Optional so unit tests can `new AnalyticsService(prisma)`. In the app
    // it's always provided by AnalyticsModule.
    private readonly geoResolver?: GeoResolverService,
  ) {}

  // Spec §20 / §30: production dashboards exclude staging + synthetic-monitor
  // traffic by default. is_test_event is the explicit classification QA can
  // still query around. Spread this into every dashboard `where`.
  static readonly PRODUCTION_EVENT_FILTER = { isTestEvent: false } as const;

  // Spec §28: true when the patient has an 'analytics' consent row set to
  // granted = false. Absence of a row means "not yet decided" → allowed.
  private async analyticsConsentDenied(patientId: string): Promise<boolean> {
    try {
      const consent = await this.prisma.patientConsent.findUnique({
        where: { patientId_consentType: { patientId, consentType: 'analytics' } },
        select: { granted: true },
      });
      return consent ? consent.granted === false : false;
    } catch {
      // Never let a consent-lookup failure silently suppress telemetry —
      // fail open, same as the rest of this best-effort pipeline.
      return false;
    }
  }

  // GeoLite2 result wins field-by-field; edge headers fill the gaps.
  private resolveAccessGeo(geo?: VisitGeoContext): AccessGeo {
    const resolved = this.geoResolver?.resolve(geo?.ipAddress) ?? undefined;
    const countryCode = (resolved?.countryCode ?? geo?.countryCode)?.toUpperCase();
    return {
      countryCode,
      regionCode: resolved?.regionCode,
      regionName: resolved?.regionName ?? geo?.region,
      city: resolved?.city ?? geo?.city,
      continentName: resolved?.continentName ?? (countryCode ? continentForCountry(countryCode) : undefined),
      timezone: resolved?.timezone ?? geo?.timezone,
      latitude: resolved?.latitude,
      longitude: resolved?.longitude,
      asn: resolved?.asn,
      geoAccuracy: resolved?.geoAccuracy ?? edgeGeoAccuracy(geo),
      geoSource: countryCode ? 'geoip' : undefined,
      geoProvider: resolved?.geoProvider ?? (countryCode ? EDGE_GEO_PROVIDER : undefined),
      geoProviderVersion: resolved?.geoProviderVersion,
    };
  }

  // ── Event Ingestion ────────────────────────────────────────────────────────

  // Public endpoint — currentUser is present only when a valid access token
  // was attached. Anonymous (pre-login) events are identified instead by the
  // client-persisted anonymousVisitorId, so the same table now covers both
  // halves of the identity model instead of authenticated patients only.
  async trackEvent(dto: ActivityEventDto, currentUser?: JwtPayload, geo?: VisitGeoContext) {
    try {
      const eventName = dto.eventType?.trim();

      // Reject malformed *shapes* (spec §23) — but let well-formed unknown
      // names through: the pipeline deliberately surfaces newly-instrumented
      // events in the dashboards without a backend change. An uncatalogued
      // name is logged so it gets added to the catalog + governance doc on
      // purpose rather than drifting in silently.
      if (!eventName || !EVENT_NAME_RE.test(eventName)) {
        this.logger.warn(`Dropped analytics event — malformed name: ${JSON.stringify(dto.eventType)?.slice(0, 80)}`);
        return;
      }
      const catalog = catalogEntry(eventName);
      if (!catalog) {
        this.logger.warn(`Uncatalogued analytics event "${eventName}" — add it to analytics-events.catalog.ts and ANALYTICS-PRIVACY-GOVERNANCE.md`);
      }

      const patientId = currentUser
        ? (await this.prisma.patient.findUnique({ where: { userId: currentUser.sub }, select: { id: true } }))?.id
        : undefined;

      // Nothing to key the row on — drop rather than write an orphan event.
      if (!patientId && !dto.anonymousVisitorId) return;

      // Consent gate (spec §28): if the patient has explicitly declined the
      // 'analytics' consent, drop product telemetry. Absence of a row = not
      // yet decided = allowed. Security-relevant events go through
      // emitServerEvent (login_*), which is intentionally NOT gated so an
      // analytics opt-out can't disable account-protection logging.
      if (patientId && (await this.analyticsConsentDenied(patientId))) return;

      const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
      const g = this.resolveAccessGeo(geo);

      const data = {
        eventId: dto.eventId,
        eventVersion: dto.eventVersion ?? catalog?.version ?? 1,
        patientId,
        anonymousVisitorId: patientId ? undefined : dto.anonymousVisitorId,
        analyticsSessionId: dto.analyticsSessionId,
        // Clients may only claim 'mobile'; anything else (incl. a spoofed
        // 'server') collapses to 'web'. True server events use emitServerEvent().
        ingestionSource: dto.ingestionSource === 'mobile' ? 'mobile' : 'web',
        environment: process.env.NODE_ENV ?? 'development',
        // The staging/synthetic BFF header wins outright; otherwise a raw
        // client can only self-mark as test traffic outside production.
        isTestEvent: geo?.analyticsTest === true ? true : isProd ? false : Boolean(dto.isTestEvent),
        eventName,
        featureArea: dto.featureArea,
        pageName: dto.pageName,
        pagePath: dto.pagePath,
        elementId: dto.elementId,
        elementType: dto.elementType,
        action: dto.action,
        outcome: dto.outcome,
        countryCode: g.countryCode,
        regionCode: g.regionCode,
        regionName: g.regionName,
        city: g.city,
        // Column holds the continent NAME ("Africa"), matching how the
        // dashboards already filter (continentForCountry, not an ISO code).
        continentCode: g.continentName,
        timezone: g.timezone,
        latitude: g.latitude,
        longitude: g.longitude,
        asn: g.asn,
        geoAccuracy: g.geoAccuracy,
        geoSource: g.geoSource,
        geoProvider: g.geoProvider,
        geoProviderVersion: g.geoProviderVersion,
        deviceCategory: deviceCategoryFromUserAgent(geo?.userAgent),
        browser: browserFromUserAgent(geo?.userAgent),
        os: osFromUserAgent(geo?.userAgent),
        userAgent: geo?.userAgent?.slice(0, 1000),
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        receivedAt: new Date(),
        properties: {
          entityType: dto.entityType,
          entityId: dto.entityId,
          ...(dto.metadata ?? {}),
        } as Prisma.InputJsonValue,
      };

      if (dto.eventId) {
        // Idempotent by dedup key — a retried beacon is a no-op, not a dup row.
        await this.prisma.patientActivityEvent.upsert({
          where: { eventId: dto.eventId },
          create: data,
          update: {},
        });
      } else {
        await this.prisma.patientActivityEvent.create({ data });
      }

      await this.rollUpSession({
        analyticsSessionId: dto.analyticsSessionId,
        patientId,
        anonymousVisitorId: dto.anonymousVisitorId,
        eventName,
        pagePath: dto.pagePath,
        deviceCategory: data.deviceCategory,
        browser: data.browser,
        os: data.os,
        countryCode: g.countryCode,
        continentCode: g.continentName,
        ingestionSource: data.ingestionSource,
        environment: data.environment,
        isTestEvent: data.isTestEvent,
        userAgent: data.userAgent,
      });
    } catch (err) {
      // Never break the caller for analytics failures
      this.logger.error('Analytics track failed', err);
    }
  }

  // Authoritative server-side event (spec §23): outcomes like
  // registration_complete / payment_success / booking_confirmed must not be
  // counted from a browser beacon that a closed tab can drop. Callers pass
  // the patient they already have (userId or patientId); this is
  // fire-and-forget — `void this.analytics.emitServerEvent(...)` — and never
  // throws back into the caller.
  async emitServerEvent(
    eventName: string,
    opts: {
      userId?: string;
      patientId?: string;
      anonymousVisitorId?: string;
      analyticsSessionId?: string;
      properties?: Record<string, unknown>;
      geo?: VisitGeoContext;
    },
  ): Promise<void> {
    try {
      if (!EVENT_NAME_RE.test(eventName)) {
        this.logger.warn(`emitServerEvent: malformed event name "${eventName}"`);
        return;
      }

      let patientId = opts.patientId;
      if (!patientId && opts.userId) {
        patientId = (
          await this.prisma.patient.findUnique({ where: { userId: opts.userId }, select: { id: true } })
        )?.id;
      }
      if (!patientId && !opts.anonymousVisitorId) return;

      const catalog = catalogEntry(eventName);
      const g = this.resolveAccessGeo(opts.geo);
      const ua = opts.geo?.userAgent;
      const deviceCategory = deviceCategoryFromUserAgent(ua);
      const browser = browserFromUserAgent(ua);
      const os = osFromUserAgent(ua);
      const environment = process.env.NODE_ENV ?? 'development';

      await this.prisma.patientActivityEvent.create({
        data: {
          eventVersion: catalog?.version ?? 1,
          patientId,
          anonymousVisitorId: patientId ? undefined : opts.anonymousVisitorId,
          analyticsSessionId: opts.analyticsSessionId,
          ingestionSource: 'server',
          environment,
          eventName,
          countryCode: g.countryCode,
          regionCode: g.regionCode,
          regionName: g.regionName,
          city: g.city,
          continentCode: g.continentName,
          timezone: g.timezone,
          latitude: g.latitude,
          longitude: g.longitude,
          asn: g.asn,
          geoAccuracy: g.geoAccuracy,
          geoSource: g.geoSource,
          geoProvider: g.geoProvider,
          geoProviderVersion: g.geoProviderVersion,
          deviceCategory,
          browser,
          os,
          userAgent: ua?.slice(0, 1000),
          receivedAt: new Date(),
          properties: (opts.properties ?? {}) as Prisma.InputJsonValue,
        },
      });

      // Rolls up only when the caller had a client session id to pass
      // through (most webhooks won't) — rollUpSession no-ops otherwise.
      await this.rollUpSession({
        analyticsSessionId: opts.analyticsSessionId,
        patientId,
        anonymousVisitorId: opts.anonymousVisitorId,
        eventName,
        deviceCategory,
        browser,
        os,
        countryCode: g.countryCode,
        continentCode: g.continentName,
        ingestionSource: 'server',
        environment,
        userAgent: ua ?? null,
      });
    } catch (err) {
      this.logger.error(`emitServerEvent(${eventName}) failed`, err);
    }
  }

  // Meaningful health actions (spec §7 "engaged_session" / §13 activation
  // signals) — one of these makes a visit engaged regardless of length.
  private static readonly MEANINGFUL_SESSION_EVENTS = new Set([
    'booking_confirmed', 'payment_success', 'upload_success', 'manual_entry_success',
    'ticket_created', 'share_success', 'registration_complete', 'otp_verify_success',
    'dispatch_request_success', 'telecare_session_join_success', 'travelsafe_trip_created',
    'profile_completed', 'first_meaningful_action',
  ]);

  // Incrementally rolls the AnalyticsSession row forward as each event lands
  // (spec §7). Best-effort — a failure here never blocks the event write.
  private async rollUpSession(p: {
    analyticsSessionId?: string;
    patientId?: string;
    anonymousVisitorId?: string;
    eventName: string;
    pagePath?: string;
    deviceCategory?: string | null;
    browser?: string | null;
    os?: string | null;
    countryCode?: string;
    continentCode?: string;
    ingestionSource?: string;
    environment?: string;
    isTestEvent?: boolean;
    userAgent?: string | null;
  }): Promise<void> {
    if (!p.analyticsSessionId) return;
    const now = new Date();
    const isPageView = p.eventName === 'page_view';
    const isClick = p.eventName === 'ui_click';
    const isMeaningful = AnalyticsService.MEANINGFUL_SESSION_EVENTS.has(p.eventName);

    try {
      const existing = await this.prisma.analyticsSession.findUnique({
        where: { analyticsSessionId: p.analyticsSessionId },
        select: { id: true, exitPage: true },
      });

      if (!existing) {
        const identityWhere = p.patientId
          ? { patientId: p.patientId }
          : p.anonymousVisitorId
            ? { anonymousVisitorId: p.anonymousVisitorId }
            : undefined;
        const returningVisitor = identityWhere
          ? (await this.prisma.analyticsSession.count({ where: identityWhere })) > 0
          : false;

        await this.prisma.analyticsSession.create({
          data: {
            analyticsSessionId: p.analyticsSessionId,
            patientId: p.patientId,
            anonymousVisitorId: p.patientId ? null : p.anonymousVisitorId,
            startedAt: now,
            lastEventAt: now,
            entryPage: p.pagePath,
            exitPage: p.pagePath,
            pageViewCount: isPageView ? 1 : 0,
            clickCount: isClick ? 1 : 0,
            eventCount: 1,
            engaged: isMeaningful,
            returningVisitor,
            deviceCategory: p.deviceCategory,
            browser: p.browser,
            os: p.os,
            countryCode: p.countryCode,
            continentCode: p.continentCode,
            ingestionSource: p.ingestionSource,
            environment: p.environment,
            isTestEvent: p.isTestEvent ?? false,
            userAgent: p.userAgent,
          },
        });
        return;
      }

      await this.prisma.analyticsSession.update({
        where: { analyticsSessionId: p.analyticsSessionId },
        data: {
          lastEventAt: now,
          exitPage: p.pagePath ?? existing.exitPage,
          pageViewCount: isPageView ? { increment: 1 } : undefined,
          clickCount: isClick ? { increment: 1 } : undefined,
          eventCount: { increment: 1 },
          // Stitch a session to the patient once it authenticates mid-visit.
          ...(p.patientId ? { patientId: p.patientId } : {}),
          ...(isMeaningful ? { engaged: true } : {}),
        },
      });

      // >= 2 events is also "engaged" (spec §7). Column-only condition, no read.
      if (!isMeaningful) {
        await this.prisma.analyticsSession.updateMany({
          where: { analyticsSessionId: p.analyticsSessionId, engaged: false, eventCount: { gte: 2 } },
          data: { engaged: true },
        });
      }
    } catch (err) {
      // Unique-violation race on create just means a concurrent event won.
      this.logger.debug(`Session rollup skipped: ${err instanceof Error ? err.message : String(err)}`);
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

    // Same GeoLite2-first, edge-header-fallback resolution as trackEvent —
    // SiteVisit only has room for country/region/city/timezone.
    const g = this.resolveAccessGeo(geo);

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
          countryCode: g.countryCode,
          region: g.regionName,
          city: g.city,
          timezone: g.timezone ?? dto.timezone,
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

    // World (implicit — totalVisits below is the level-0 aggregate) ->
    // Continent -> Country -> admin-1 (region, from x-vercel-ip-country-region
    // / cloudfront-viewer-country-region — free edge-header geo, an ISO
    // 3166-2 subdivision code/name depending on provider) -> city (spec §B
    // levels 0-5). All from data already collected for the flat `locations`
    // list below; this just nests it instead of a second query.
    // ponytail: admin-2 (LGA/county — finer than city) has no free source;
    // city is the practical ceiling without a paid GeoIP vendor. Stop here
    // until that's decided, rather than approximating city->LGA mapping for
    // one country while leaving every other country flat.
    type CountryNode = { countryCode: string; visits: number; regions: Map<string, RegionNode> };
    type RegionNode = { region: string; visits: number; cities: Map<string, number> };
    type ContinentNode = { continent: string; visits: number; countries: Map<string, CountryNode> };
    const hierarchyMap = new Map<string, ContinentNode>();

    for (const v of visits) {
      const countryCode = v.countryCode?.toUpperCase() ?? 'Unknown';
      const region = v.region ?? 'Unknown';
      const city = v.city ?? 'Unknown';
      // 'Unknown' isn't a real ISO code, so this falls through to
      // continentForCountry's own not-found fallback ('Unknown') rather
      // than needing a special case here.
      const continent = continentForCountry(countryCode);
      const locationKey = `${countryCode} ${region} ${city}`;
      const location = locationMap.get(locationKey) ?? { countryCode, continent, region, city, visits: 0 };
      location.visits++;
      locationMap.set(locationKey, location);

      const continentNode = hierarchyMap.get(continent) ?? { continent, visits: 0, countries: new Map<string, CountryNode>() };
      continentNode.visits++;
      const countryNode = continentNode.countries.get(countryCode) ?? { countryCode, visits: 0, regions: new Map<string, RegionNode>() };
      countryNode.visits++;
      const regionNode = countryNode.regions.get(region) ?? { region, visits: 0, cities: new Map<string, number>() };
      regionNode.visits++;
      regionNode.cities.set(city, (regionNode.cities.get(city) ?? 0) + 1);
      countryNode.regions.set(region, regionNode);
      continentNode.countries.set(countryCode, countryNode);
      hierarchyMap.set(continent, continentNode);

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
        // World is the implicit level 0 — totalVisits above already is that
        // aggregate, so it isn't repeated as a wrapping node here.
        hierarchy: Array.from(hierarchyMap.values())
          .map((cont) => ({
            continent: cont.continent,
            continentCode: continentCodeForContinent(cont.continent),
            visits: cont.visits,
            countries: Array.from(cont.countries.values())
              .map((c) => ({
                countryCode: c.countryCode,
                visits: c.visits,
                regions: Array.from(c.regions.values())
                  .map((r) => ({
                    region: r.region,
                    visits: r.visits,
                    cities: Array.from(r.cities.entries())
                      .map(([city, visits]) => ({ city, visits }))
                      .sort((a, b) => b.visits - a.visits),
                  }))
                  .sort((a, b) => b.visits - a.visits),
              }))
              .sort((a, b) => b.visits - a.visits),
          }))
          .sort((a, b) => b.visits - a.visits),
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
        ...AnalyticsService.PRODUCTION_EVENT_FILTER,
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

  // Spec §8.3 CTA CTR = qualified unique clicks ÷ qualified impressions.
  // Pairs cta_impression events (TrackImpression, web only so far) with
  // ui_click events sharing the same elementId. Unique-user basis, matching
  // every other KPI in this file (booking/payment conversion, activation) —
  // an element seen twice by the same visitor across two page loads should
  // count as one qualified impression, not two.
  async getClickstreamAnalytics(period = '30d') {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.patientActivityEvent.findMany({
      where: {
        occurredAt: { gte: since },
        eventName: { in: ['cta_impression', 'ui_click'] },
        elementId: { not: null },
      },
      select: { eventName: true, elementId: true, patientId: true, anonymousVisitorId: true },
    });

    const byElement = new Map<
      string,
      { impressions: number; impressionUsers: Set<string>; clicks: number; clickUsers: Set<string> }
    >();

    for (const r of rows) {
      const elementId = r.elementId as string;
      const bucket = byElement.get(elementId) ?? {
        impressions: 0,
        impressionUsers: new Set<string>(),
        clicks: 0,
        clickUsers: new Set<string>(),
      };
      const userKey = r.patientId ?? (r.anonymousVisitorId ? `anon:${r.anonymousVisitorId}` : undefined);

      if (r.eventName === 'cta_impression') {
        bucket.impressions++;
        if (userKey) bucket.impressionUsers.add(userKey);
      } else {
        bucket.clicks++;
        if (userKey) bucket.clickUsers.add(userKey);
      }
      byElement.set(elementId, bucket);
    }

    return {
      data: {
        ctas: Array.from(byElement.entries())
          .map(([elementId, b]) => ({
            elementId,
            impressions: b.impressions,
            uniqueImpressions: b.impressionUsers.size,
            clicks: b.clicks,
            uniqueClicks: b.clickUsers.size,
            // null (not 0) when nothing has seen this element yet — same
            // convention as every other ratio KPI in this file.
            ctr:
              b.impressionUsers.size > 0
                ? Math.round((b.clickUsers.size / b.impressionUsers.size) * 1000) / 10
                : null,
          }))
          .sort((a, b) => b.clicks - a.clicks),
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
      where: {
        ...AnalyticsService.PRODUCTION_EVENT_FILTER,
        occurredAt: { gte: since },
        patientId: { not: null },
        countryCode: { not: null },
      },
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

  // Spec §3: age bands are "configuration-driven", not hardcoded per query —
  // this table is the one place that changes if the business redefines a
  // bracket. calculateAge()/ageBandFor() are pure so they're trivially unit
  // testable without a DB.
  private static readonly AGE_BANDS: Array<{ label: string; minAge: number; maxAge: number | null }> = [
    { label: '0–4', minAge: 0, maxAge: 4 },
    { label: '5–12', minAge: 5, maxAge: 12 },
    { label: '13–17', minAge: 13, maxAge: 17 },
    { label: '18–24', minAge: 18, maxAge: 24 },
    { label: '25–34', minAge: 25, maxAge: 34 },
    { label: '35–44', minAge: 35, maxAge: 44 },
    { label: '45–54', minAge: 45, maxAge: 54 },
    { label: '55–64', minAge: 55, maxAge: 64 },
    { label: '65+', minAge: 65, maxAge: null },
  ];

  private static calculateAge(dateOfBirth: Date, asOf: Date): number {
    let age = asOf.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = asOf.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dateOfBirth.getDate())) age--;
    return age;
  }

  private static ageBandFor(age: number): string {
    return AnalyticsService.AGE_BANDS.find((b) => age >= b.minAge && (b.maxAge === null || age <= b.maxAge))?.label ?? 'Unknown';
  }

  // Spec §18 Demographics & Geography dashboard: age bands, sex/gender as
  // collected, nationality — a population snapshot of the current active
  // patient base (not time-windowed like the funnel/retention metrics
  // above), matching how "population profile" reads in spec §3. patient_type
  // segmentation from that same table isn't included: there's no
  // patient_type field on Patient today, and inventing a business
  // classification isn't an analytics-reporting decision to make silently.
  async getDemographicsAnalytics() {
    const now = new Date();
    const patients = await this.prisma.patient.findMany({
      where: { user: { deletedAt: null } },
      select: {
        dateOfBirth: true,
        gender: true,
        nationality: true,
        subscriptions: {
          where: { status: 'active' },
          select: { plan: { select: { tier: true } } },
          take: 1,
        },
      },
    });

    const ageBands = new Map<string, number>();
    const genders = new Map<string, number>();
    const nationalities = new Map<string, number>();
    const planTiers = new Map<string, number>();

    for (const p of patients) {
      const ageBand = AnalyticsService.ageBandFor(AnalyticsService.calculateAge(p.dateOfBirth, now));
      ageBands.set(ageBand, (ageBands.get(ageBand) ?? 0) + 1);

      genders.set(p.gender, (genders.get(p.gender) ?? 0) + 1);

      const nationality = p.nationality?.trim() || 'Not declared';
      nationalities.set(nationality, (nationalities.get(nationality) ?? 0) + 1);

      const tier = p.subscriptions[0]?.plan.tier ?? 'Free';
      planTiers.set(tier, (planTiers.get(tier) ?? 0) + 1);
    }

    // Age bands render in their defined order (not by count) — a bar chart
    // of "0-4, 5-12, 13-17, ..." reads naturally; sorted-by-count would
    // scramble the age progression every time the mix shifts.
    const ageBandOrder = [...AnalyticsService.AGE_BANDS.map((b) => b.label), 'Unknown'];

    return {
      data: {
        totalPatients: patients.length,
        ageBands: ageBandOrder
          .filter((label) => ageBands.has(label))
          .map((label) => ({ label, count: ageBands.get(label) as number })),
        genders: Array.from(genders.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
        nationalities: Array.from(nationalities.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
        planTiers: Array.from(planTiers.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  }

  // Spec §16: N-day retention. ponytail: this is the common product-analytics
  // simplification ("returned at least once N+ days after registering"), not
  // a strict single-day cohort curve (active on exactly day N) — the latter
  // needs a much larger sample to be statistically meaningful and isn't worth
  // the extra complexity until there's real registration volume to look at.
  // lookbackDays controls how far back to search for eligible cohort members
  // (must exceed the largest window below, or that window has no eligible
  // cohort at all — kept as a buffer past the max rather than exactly equal
  // to it, so there's a real cohort at the edge, not just the boundary day).
  private static readonly RETENTION_WINDOWS = [1, 7, 30, 60, 90];
  private static readonly RETENTION_LOOKBACK_BUFFER_DAYS = 30;
  private static readonly RETENTION_DEFAULT_LOOKBACK_DAYS =
    Math.max(...AnalyticsService.RETENTION_WINDOWS) + AnalyticsService.RETENTION_LOOKBACK_BUFFER_DAYS;

  // Spec §16: "Cohort definitions must be immutable/versioned so historical
  // retention reports do not change silently when business rules are
  // modified." Same idea as ENGAGEMENT_SCORE_VERSION below — bump this
  // whenever RETENTION_WINDOWS or the eligibility/return-window logic in
  // this method changes, and every response carries it, so a report that
  // was generated (or exported/screenshotted) under an older definition can
  // be told apart from one generated after a rule change, instead of the
  // numbers silently drifting between two runs of the "same" report.
  private static readonly RETENTION_COHORT_DEFINITION_VERSION = 1;

  async getRetentionAnalytics(lookbackDays = AnalyticsService.RETENTION_DEFAULT_LOOKBACK_DAYS) {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    const now = new Date();

    const [registrations, activity] = await Promise.all([
      this.prisma.patientActivityEvent.findMany({
        where: {
          ...AnalyticsService.PRODUCTION_EVENT_FILTER,
          eventName: 'registration_complete',
          patientId: { not: null },
          occurredAt: { gte: since },
        },
        select: { patientId: true, occurredAt: true },
      }),
      this.prisma.patientActivityEvent.findMany({
        where: {
          ...AnalyticsService.PRODUCTION_EVENT_FILTER,
          patientId: { not: null },
          occurredAt: { gte: since },
        },
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

    return {
      data: {
        windows,
        cohortSize: registeredAt.size,
        lookbackDays,
        cohortDefinitionVersion: AnalyticsService.RETENTION_COHORT_DEFINITION_VERSION,
      },
    };
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
        where: {
          ...AnalyticsService.PRODUCTION_EVENT_FILTER,
          patientId,
          eventName: { in: ['booking_confirmed', 'upload_success', 'manual_entry_success'] },
        },
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

  // Digital Experience dashboard — device/browser breakdown for the patient
  // portal itself (distinct from getTrafficAnalytics, which covers the
  // anonymous public marketing site) plus client-side error visibility.
  // client_error events are emitted by ErrorTracker (health-hub-africa
  // portal) via the same trackEvent()/PatientActivityEvent pipeline as every
  // other funnel event — no new table, no new ingestion endpoint.
  async getDigitalExperienceAnalytics(period = '30d') {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.patientActivityEvent.findMany({
      where: { ...AnalyticsService.PRODUCTION_EVENT_FILTER, occurredAt: { gte: since } },
      select: { eventName: true, deviceCategory: true, userAgent: true, properties: true, occurredAt: true },
    });

    const deviceMap = new Map<string, number>();
    const browserMap = new Map<string, number>();
    const errorMessageMap = new Map<string, number>();
    let errorCount = 0;

    for (const e of events) {
      const device = e.deviceCategory ?? 'Unknown';
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);

      const browser = browserFromUserAgent(e.userAgent ?? undefined);
      browserMap.set(browser, (browserMap.get(browser) ?? 0) + 1);

      if (e.eventName === 'client_error') {
        errorCount++;
        const message = (e.properties as { message?: string } | null)?.message ?? '(no message)';
        errorMessageMap.set(message, (errorMessageMap.get(message) ?? 0) + 1);
      }
    }

    return {
      data: {
        totalEvents: events.length,
        devices: Array.from(deviceMap.entries())
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
        browsers: Array.from(browserMap.entries())
          .map(([browser, count]) => ({ browser, count }))
          .sort((a, b) => b.count - a.count),
        errorCount,
        // null (not 0) when there's simply no traffic to divide by — same
        // convention as every other KPI in this file.
        errorRate: events.length > 0 ? Math.round((errorCount / events.length) * 1000) / 10 : null,
        topErrors: Array.from(errorMessageMap.entries())
          .map(([message, count]) => ({ message, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20),
      },
    };
  }
}
