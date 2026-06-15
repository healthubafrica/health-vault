import { Injectable } from '@nestjs/common';
import { ExpertReviewStatus } from '@prisma/client';
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
      assignedUnits,
    ] = await Promise.all([
      this.prisma.dispatchRequest.count({
        where: {
          status: {
            in: ['unit_assigned', 'en_route', 'on_scene', 'patient_stabilised', 'transported'],
          },
        },
      }),
      this.prisma.dispatchRequest.count({ where: { status: 'requested' } }),
      this.prisma.dispatchRequest.count({
        where: {
          status: 'closed',
          closedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.dispatchRequest.count({
        where: {
          status: { in: ['unit_assigned', 'en_route', 'on_scene'] },
          unitId: { not: null },
        },
      }),
    ]);

    return {
      module: 'STRIDE™',
      activeCases,
      pendingCases,
      resolvedToday,
      assignedProviders: assignedUnits,
      timestamp: new Date(),
    };
  }

  async getHpacsOverview() {
    const [totalProviders, verifiedProviders, availableForEmergency] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { user: { isVerified: true } } }),
      this.prisma.provider.count({
        where: { user: { isVerified: true }, isAvailable: true },
      }),
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
    return this.prisma.dispatchRequest.findMany({
      where: {
        status: { in: ['on_scene', 'patient_stabilised', 'transported'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        patient: { select: { firstName: true, lastName: true, hhaPatientId: true } },
        events: { orderBy: { occurredAt: 'desc' }, take: 1 },
      },
    });
  }

  async getExpertReviewFunnel() {
    const statuses: ExpertReviewStatus[] = [
      'submitted',
      'under_review',
      'specialist_assigned',
      'in_consultation',
      'report_ready',
      'closed',
      'cancelled',
    ];

    const counts = await Promise.all(
      statuses.map((status) =>
        this.prisma.expertReviewCase.count({ where: { status } }),
      ),
    );

    return statuses.reduce((acc, status, i) => {
      acc[status] = counts[i];
      return acc;
    }, {} as Record<string, number>);
  }
}
