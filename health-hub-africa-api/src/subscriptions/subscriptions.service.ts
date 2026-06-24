import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentGateway, PlanTier, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments/payments.service';
import { PaymentPurpose } from '../payments/dto/initiate-payment.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ── Plans ──────────────────────────────────────────────────────────────────

  async findPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
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

    // Cancel any existing active or trial subscription (upgrade path)
    const existing = await this.prisma.patientSubscription.findFirst({
      where: { patientId, status: { in: ['active', 'trial'] } },
      orderBy: { createdAt: 'desc' },
    });

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (dto.billingCycle === 'annually') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (dto.billingCycle === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Cancel-then-create must be atomic: if create fails after cancel commits,
    // the patient would be left with zero active subscriptions.
    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.patientSubscription.update({
          where: { id: existing.id },
          data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: 'Upgraded to new plan' },
        });
      }

      // Pricing lives on the plan (priceKobo per billingPeriod); the
      // subscription row only tracks the period.
      return tx.patientSubscription.create({
        data: {
          patientId,
          planId: dto.planId,
          startedAt: startDate,
          expiresAt: endDate,
        },
        include: { plan: true },
      });
    });
  }

  // Patient-facing upgrade flow. For paid plans this issues a pending Payment
  // with a structured `metadata` blob so the gateway webhook can activate the
  // subscription on success. Free plan stays self-service via the existing
  // `subscribe()` path (no money to charge).
  async upgrade(dto: UpgradeSubscriptionDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan.tier === PlanTier.Free) {
      throw new BadRequestException(
        'Use DELETE /subscriptions/:id to revert to the Free plan',
      );
    }

    const amountKobo = dto.billingCycle === 'annually'
      ? (plan.launchPriceKobo > 0 ? plan.launchPriceKobo : plan.annualPriceKobo)
      : plan.priceKobo;

    if (!amountKobo || amountKobo <= 0) {
      throw new BadRequestException(
        `Plan ${plan.name} has no price for billing cycle ${dto.billingCycle}`,
      );
    }

    const gateway = dto.gateway ?? PaymentGateway.Paystack;

    const gatewayResponse = await this.paymentsService.initiate(
      {
        gateway,
        purpose: PaymentPurpose.subscription,
        amountKobo,
        currency: 'NGN',
        referenceId: plan.id,
      },
      currentUser,
      {
        description: `${plan.name} subscription — ${dto.billingCycle}`,
        metadata: {
          kind: 'subscription_upgrade',
          planId: plan.id,
          planName: plan.name,
          billingCycle: dto.billingCycle,
        },
      },
    );

    return {
      requiresPayment: true,
      ...gatewayResponse,
    };
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
