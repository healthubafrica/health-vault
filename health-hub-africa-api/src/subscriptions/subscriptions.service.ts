import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  async findPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceKobo: 'asc' },
    });
  }

  async findPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  // ── Patient Subscriptions ─────────────────────────────────────────────────

  async subscribe(dto: SubscribeDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    } else {
      this.requireAdmin(currentUser);
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (dto.billingCycle === 'annually') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (dto.billingCycle === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Pricing lives on the plan (priceKobo per billingPeriod); the
    // subscription row only tracks the period.
    return this.prisma.patientSubscription.create({
      data: {
        patientId,
        planId: dto.planId,
        startedAt: startDate,
        expiresAt: endDate,
      },
      include: { plan: true },
    });
  }

  async findMySubscription(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.patientSubscription.findFirst({
      where: { patientId: patient.id, status: { in: ['active', 'trial'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSubscriptionForPatient(patientId: string, currentUser: JwtPayload) {
    this.requireAdmin(currentUser);

    return this.prisma.patientSubscription.findFirst({
      where: { patientId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelSubscription(subscriptionId: string, currentUser: JwtPayload) {
    const sub = await this.prisma.patientSubscription.findUnique({
      where: { id: subscriptionId },
      include: { patient: { select: { userId: true } } },
    });

    if (!sub) throw new NotFoundException('Subscription not found');

    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    const isOwner = sub.patient.userId === currentUser.sub;
    if (!isAdmin && !isOwner) throw new ForbiddenException('Access denied');

    return this.prisma.patientSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }

  private requireAdmin(user: JwtPayload) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin];
    if (!adminRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
