import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RecordVisitDto } from './dto/record-visit.dto';

export interface ActivityEventDto {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Event Ingestion ────────────────────────────────────────────────────────

  async trackEvent(dto: ActivityEventDto, currentUser: JwtPayload) {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });

      // Events are patient-scoped in the schema — skip for non-patient users
      if (!patient) return;

      await this.prisma.patientActivityEvent.create({
        data: {
          patientId: patient.id,
          eventName: dto.eventType,
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

    const locationMap = new Map<string, { countryCode: string; region: string; city: string; visits: number }>();
    const deviceMap = new Map<string, number>();
    const referrerMap = new Map<string, number>();
    const campaignMap = new Map<string, { campaign: string; source: string; medium: string; visits: number }>();

    for (const v of visits) {
      const countryCode = v.countryCode?.toUpperCase() ?? 'Unknown';
      const region = v.region ?? 'Unknown';
      const city = v.city ?? 'Unknown';
      const locationKey = `${countryCode} ${region} ${city}`;
      const location = locationMap.get(locationKey) ?? { countryCode, region, city, visits: 0 };
      location.visits++;
      locationMap.set(locationKey, location);

      const ua = v.userAgent?.toLowerCase() ?? '';
      const device = /ipad|tablet|kindle/.test(ua)
        ? 'Tablet'
        : /mobile|iphone|android/.test(ua)
          ? 'Mobile'
          : ua
            ? 'Desktop'
            : 'Unknown';
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
}
