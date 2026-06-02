import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export interface ActivityEventDto {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

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

      await this.prisma.patientActivityEvent.create({
        data: {
          patientId: patient?.id,
          userId: currentUser.sub,
          eventType: dto.eventType,
          entityType: dto.entityType,
          entityId: dto.entityId,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
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
      this.prisma.provider.count({ where: { isVerified: true } }),
      this.prisma.appointment.count({
        where: { status: { in: ['scheduled', 'confirmed', 'in_progress'] } },
      }),
      this.prisma.dispatchCase.count({
        where: { status: { notIn: ['resolved', 'cancelled'] } },
      }),
      this.prisma.expertReviewCase.count({
        where: { status: { notIn: ['delivered', 'cancelled'] } },
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
      by: ['currency', 'purpose'],
      where: {
        status: 'succeeded',
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
        this.prisma.dispatchCase.count({ where: { createdAt: { gte: since } } }),
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
}
