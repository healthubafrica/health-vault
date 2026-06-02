import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StrideService {
  constructor(private readonly prisma: PrismaService) {}

  // STRIDE™ — Strategic Triage & Resource Integration for Diagnostic Emergencies
  // HPACS™ — Health Provider Access & Coordination System
  // EFCE™ — Emergency Field Care Execution

  async getStrideOverview() {
    const [
      activeCases,
      pendingCases,
      resolvedToday,
      assignedProviders,
    ] = await Promise.all([
      this.prisma.dispatchCase.count({
        where: { status: { in: ['dispatched', 'en_route', 'on_scene', 'transporting', 'at_facility'] } },
      }),
      this.prisma.dispatchCase.count({ where: { status: 'pending' } }),
      this.prisma.dispatchCase.count({
        where: {
          status: 'resolved',
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.dispatchCase.count({
        where: {
          status: { in: ['dispatched', 'en_route', 'on_scene'] },
          assignedProviderId: { not: null },
        },
      }),
    ]);

    return {
      module: 'STRIDE™',
      activeCases,
      pendingCases,
      resolvedToday,
      assignedProviders,
      timestamp: new Date(),
    };
  }

  async getHpacsOverview() {
    const [totalProviders, verifiedProviders, availableForEmergency] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { isVerified: true } }),
      this.prisma.provider.count({ where: { isVerified: true, acceptsEmergencies: true } }),
    ]);

    return {
      module: 'HPACS™',
      totalProviders,
      verifiedProviders,
      availableForEmergency,
      timestamp: new Date(),
    };
  }

  async getEfceActiveCases() {
    return this.prisma.dispatchCase.findMany({
      where: {
        status: { in: ['on_scene', 'transporting', 'at_facility'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        patient: { select: { firstName: true, lastName: true, hhaPatientId: true } },
        statusEvents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getExpertReviewFunnel() {
    const statuses = [
      'submitted',
      'under_review',
      'specialist_assigned',
      'report_in_progress',
      'report_ready',
      'delivered',
      'cancelled',
    ];

    const counts = await Promise.all(
      statuses.map((status) =>
        this.prisma.expertReviewCase.count({ where: { status: status as any } }),
      ),
    );

    return statuses.reduce((acc, status, i) => {
      acc[status] = counts[i];
      return acc;
    }, {} as Record<string, number>);
  }
}
