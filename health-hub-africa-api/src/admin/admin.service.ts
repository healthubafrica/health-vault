import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  CreateFacilityDto,
} from './dto/admin.dto';
import { OPENEMR_SYNC_QUEUE, SyncJobData } from '../openemr/openemr.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly openemrQueue: Queue<SyncJobData>,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { patient: { firstName: { contains: search, mode: 'insensitive' } } },
            { patient: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true, hhaPatientId: true } },
          provider: { select: { id: true, firstName: true, lastName: true, isAvailable: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getUser(id: string) {
    const raw = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            hhaPatientId: true,
            firstName: true,
            lastName: true,
            subscriptions: {
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                status: true,
                startedAt: true,
                expiresAt: true,
                plan: { select: { name: true, tier: true, priceKobo: true } },
              },
            },
          },
        },
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!raw) throw new NotFoundException('User not found');

    const { phone, patient, provider, ...rest } = raw;

    const latestSub = patient?.subscriptions?.[0];
    const subscription = latestSub
      ? {
          plan: latestSub.plan.name,
          tier: String(latestSub.plan.tier),
          status: String(latestSub.status),
          expiresAt: latestSub.expiresAt.toISOString(),
        }
      : undefined;

    const fullName = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : provider
      ? `${provider.firstName} ${provider.lastName}`.trim()
      : undefined;

    return {
      data: {
        ...rest,
        phoneNumber: phone ?? undefined,
        fullName,
        subscription,
        patient: patient
          ? {
              id: patient.id,
              hhaPatientId: patient.hhaPatientId,
              firstName: patient.firstName,
              lastName: patient.lastName,
              openemrSyncStatus: 'unknown',
            }
          : undefined,
      },
    };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, currentUser: JwtPayload) {
    this.requireSuperAdmin(currentUser);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        // Activating an account implies admin vouches for the user, so mark verified too.
        // Without this, unverified accounts would be "active" but still blocked at login.
        ...(dto.isActive ? { isVerified: true } : {}),
      },
      select: { id: true, email: true, isActive: true, isVerified: true },
    });
  }

  async getAuditLogs(page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where: any = userId ? { actorId: userId } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalyticsSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [kpi, totalUsers, newUsersToday, appointmentsToday, activeDispatch, openemrSyncErrors] =
      await Promise.all([
        this.prisma.operationalKpi.findFirst({ orderBy: { snapshotAt: 'desc' } }),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.appointment.count({
          where: {
            scheduledAt: {
              gte: todayStart,
              lt: new Date(todayStart.getTime() + 86_400_000),
            },
          },
        }),
        this.prisma.dispatchRequest.count({ where: { status: { in: ['requested', 'assigned'] as any } } }),
        this.prisma.integrationError.count({ where: { resolvedAt: null } }),
      ]);

    return {
      data: {
        totalUsers,
        activeSubscriptions: kpi?.activeSubscriptions ?? 0,
        mrr: Number(kpi?.mrrKobo ?? 0),
        newUsersToday,
        appointmentsToday,
        activeDispatch,
        openemrSyncErrors,
        userGrowthPct: 0,
        subscriptionGrowthPct: 0,
        mrrGrowthPct: 0,
      },
    };
  }

  async getAnalyticsRevenue(period = '30d') {
    const since = this.periodToDate(period);
    const records = await this.prisma.revenueSummary.findMany({
      where: { reportDate: { gte: since } },
      orderBy: { reportDate: 'asc' },
    });

    return {
      data: records.map((r) => ({
        date: r.reportDate.toISOString().split('T')[0],
        amount: Number(r.netRevenueKobo),
        gateway: String(r.gateway),
      })),
    };
  }

  async getAnalyticsUsage(period = '30d') {
    const since = this.periodToDate(period);
    const records = await this.prisma.serviceUsageDaily.findMany({
      where: { reportDate: { gte: since } },
      orderBy: { reportDate: 'asc' },
    });

    // Pivot: one row per date, each service type becomes a column
    const byDate = new Map<string, { appointments: number; telecare: number; dispatch: number; labOrders: number; expertReviews: number }>();
    for (const r of records) {
      const date = r.reportDate.toISOString().split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, { appointments: 0, telecare: 0, dispatch: 0, labOrders: 0, expertReviews: 0 });
      }
      const row = byDate.get(date)!;
      const st = String(r.serviceType).toLowerCase();
      if (st.includes('telecare') || st.includes('teleconsult')) {
        row.telecare += r.totalSessions;
      } else if (st.includes('dispatch') || st.includes('emergency')) {
        row.dispatch += r.totalSessions;
      } else if (st.includes('lab')) {
        row.labOrders += r.totalSessions;
      } else if (st.includes('expert')) {
        row.expertReviews += r.totalSessions;
      } else {
        row.appointments += r.totalSessions;
      }
    }

    return {
      data: Array.from(byDate.entries()).map(([date, counts]) => ({ date, ...counts })),
    };
  }

  // ── System ────────────────────────────────────────────────────────────────

  async getSystemHealth() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;

      const [unresolvedErrors, pendingSyncItems] = await Promise.all([
        this.prisma.integrationError.count({ where: { resolvedAt: null } }),
        this.prisma.openemrSyncQueue.count({ where: { status: 'pending' } }),
      ]);

      return {
        data: {
          status: 'healthy',
          db: { status: 'connected', latencyMs },
          integrations: { unresolvedErrors, pendingSyncItems },
          checkedAt: new Date().toISOString(),
        },
      };
    } catch {
      return {
        data: {
          status: 'degraded',
          db: { status: 'error', latencyMs: Date.now() - start },
          checkedAt: new Date().toISOString(),
        },
      };
    }
  }

  async getSyncQueue(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.openemrSyncQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledFor: 'asc' },
      }),
      this.prisma.openemrSyncQueue.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getIntegrationErrors(page = 1, limit = 20, resolved?: boolean) {
    const skip = (page - 1) * limit;
    const where: any =
      resolved !== undefined
        ? { resolvedAt: resolved ? { not: null } : null }
        : {};

    const [data, total] = await Promise.all([
      this.prisma.integrationError.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.integrationError.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async retryIntegrationError(id: string) {
    const record = await this.prisma.integrationError.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Integration error not found');

    await this.prisma.integrationError.update({
      where: { id },
      data: { retryCount: { increment: 1 } },
    });
    return { message: 'Queued for retry' };
  }

  async retrySyncQueueItem(id: string) {
    const item = await this.prisma.openemrSyncQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Sync queue item not found');

    await this.prisma.openemrSyncQueue.update({
      where: { id },
      data: { status: 'pending', errorMessage: null, lastAttemptedAt: null },
    });

    await this.openemrQueue.add(
      'sync-patient',
      {
        patientId: item.patientId,
        operation: item.operation as SyncJobData['operation'],
        payload: (item.payload as Record<string, unknown>) ?? {},
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 10 },
    );

    return { message: 'Queued for retry' };
  }

  // ── Operations ────────────────────────────────────────────────────────────

  async listAppointments(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          hhaRef: true,
          serviceType: true,
          status: true,
          scheduledAt: true,
          durationMinutes: true,
          isTelecare: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async listTelecareSessions(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.telecareSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        select: {
          id: true,
          hhaRef: true,
          status: true,
          scheduledAt: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          platform: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.telecareSession.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async listDispatchRequests(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.dispatchRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          hhaRef: true,
          emergencyType: true,
          status: true,
          locationText: true,
          etaMinutes: true,
          stridePriority: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.dispatchRequest.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async listLabOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { overallStatus: status } : {};

    const [data, total] = await Promise.all([
      this.prisma.labOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderedAt: 'desc' },
        select: {
          id: true,
          hhaRef: true,
          overallStatus: true,
          orderedAt: true,
          collectedAt: true,
          reportedAt: true,
          labFacility: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.labOrder.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async listExpertReviewCases(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.expertReviewCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          hhaRef: true,
          reviewType: true,
          urgency: true,
          status: true,
          clinicalQuestion: true,
          primaryDiagnosis: true,
          submittedAt: true,
          completedAt: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.expertReviewCase.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Facilities ─────────────────────────────────────────────────────────────

  async listFacilities(page = 1, limit = 20, country?: string) {
    const skip = (page - 1) * limit;
    // The facility model has no country column — match on state/city instead.
    const where: any = country
      ? {
          OR: [
            { state: { contains: country, mode: 'insensitive' } },
            { city: { contains: country, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.healthcareFacility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.healthcareFacility.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // Map the facility DTO onto schema columns. Contact details have no
  // dedicated columns and are appended to the address text.
  private toFacilityData(dto: Partial<CreateFacilityDto>) {
    const address =
      [dto.address, dto.phone ? `Tel: ${dto.phone}` : null, dto.email]
        .filter(Boolean)
        .join(' | ') || undefined;
    return {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { facilityType: dto.type }),
      ...(address !== undefined && { address }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
    };
  }

  async createFacility(dto: CreateFacilityDto) {
    return this.prisma.healthcareFacility.create({
      data: {
        name: dto.name,
        facilityType: dto.type ?? 'general',
        ...this.toFacilityData({ ...dto, name: undefined, type: undefined }),
      },
    });
  }

  async updateFacility(id: string, dto: Partial<CreateFacilityDto>) {
    const facility = await this.prisma.healthcareFacility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    return this.prisma.healthcareFacility.update({
      where: { id },
      data: this.toFacilityData(dto),
    });
  }

  async deleteFacility(id: string) {
    const facility = await this.prisma.healthcareFacility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    // Hard delete — the model has no soft-delete flag. Refuse when the
    // facility is referenced by dispatch or triage records.
    try {
      await this.prisma.healthcareFacility.delete({ where: { id } });
    } catch {
      throw new ForbiddenException(
        'Facility is referenced by dispatch records and cannot be deleted',
      );
    }
    return { message: 'Facility deleted' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private requireSuperAdmin(user: JwtPayload) {
    if (user.role !== UserRole.super_admin) {
      throw new ForbiddenException('Super admin access required');
    }
  }

  private periodToDate(period: string): Date {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
