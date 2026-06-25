import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, DispatchStatus, UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  CreateFacilityDto,
} from './dto/admin.dto';
import { OPENEMR_SYNC_QUEUE, OpenemrService, SyncJobData } from '../openemr/openemr.service';

export const ADMIN_REDIS = Symbol('ADMIN_REDIS');

const DEFAULT_FLAGS: Record<string, { label: string; description: string; defaultValue: boolean }> = {
  teleconsult_enabled: { label: 'TeleCare', description: 'Enable teleconsult booking for patients', defaultValue: true },
  dispatch_enabled: { label: 'DispatchCare', description: 'Enable emergency dispatch service', defaultValue: true },
  expert_review_enabled: { label: 'Expert Review', description: 'Enable expert review case submissions', defaultValue: true },
  lab_orders_enabled: { label: 'Lab Orders', description: 'Enable lab test ordering', defaultValue: true },
  neuroflex_enabled: { label: 'NeuroFlex', description: 'Enable NeuroFlex AI health screening', defaultValue: false },
  patient_registration_open: { label: 'Patient Registration', description: 'Allow new patient signups', defaultValue: true },
};

const FLAGS_REDIS_KEY = 'admin:feature-flags';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly openemrQueue: Queue<SyncJobData>,
    @Inject(ADMIN_REDIS) private readonly redis: Redis,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { patient: { firstName: { contains: search, mode: 'insensitive' } } },
            { patient: { lastName: { contains: search, mode: 'insensitive' } } },
            { patient: { hhaPatientId: { contains: search, mode: 'insensitive' } } },
            { patient: { openemrPatientUuid: { contains: search, mode: 'insensitive' } } },
            { provider: { firstName: { contains: search, mode: 'insensitive' } } },
            { provider: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
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
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              hhaPatientId: true,
              openemrPatientUuid: true,
              subscriptions: {
                where: { status: { in: ['active', 'trial'] } },
                take: 1,
                orderBy: { startedAt: 'desc' },
                select: {
                  status: true,
                  expiresAt: true,
                  plan: { select: { name: true, tier: true } },
                },
              },
            },
          },
          provider: {
            select: { id: true, firstName: true, lastName: true, isAvailable: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Flatten so the admin Users table renders directly: fullName, phoneNumber,
    // and the latest active subscription (matches getUser's shape).
    const data = rows.map((u) => {
      const sub = u.patient?.subscriptions?.[0];
      const fullName = u.patient
        ? `${u.patient.firstName} ${u.patient.lastName}`.trim()
        : u.provider
        ? `${u.provider.firstName} ${u.provider.lastName}`.trim()
        : undefined;
      return {
        id: u.id,
        email: u.email,
        phoneNumber: u.phone ?? undefined,
        role: u.role,
        fullName,
        isActive: u.isActive,
        isVerified: u.isVerified,
        lastLoginAt: u.lastLoginAt ?? undefined,
        createdAt: u.createdAt,
        patient: u.patient
          ? {
              id: u.patient.id,
              hhaPatientId: u.patient.hhaPatientId,
              firstName: u.patient.firstName,
              lastName: u.patient.lastName,
              openemrPatientUuid: u.patient.openemrPatientUuid ?? null,
            }
          : undefined,
        provider: u.provider
          ? {
              id: u.provider.id,
              firstName: u.provider.firstName,
              lastName: u.provider.lastName,
              isAvailable: u.provider.isAvailable,
            }
          : undefined,
        subscription: sub
          ? {
              plan: sub.plan.name,
              tier: String(sub.plan.tier),
              status: String(sub.status),
              expiresAt: sub.expiresAt.toISOString(),
            }
          : undefined,
      };
    });

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
            openemrSyncStatus: true,
            openemrPatientUuid: true,
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
              openemrSyncStatus: patient.openemrSyncStatus,
              openemrPatientUuid: patient.openemrPatientUuid ?? null,
            }
          : undefined,
      },
    };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, currentUser: JwtPayload) {
    this.requireSuperAdmin(currentUser);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // No-op early so we don't churn sessions on an idempotent PATCH.
    if (user.role === dto.role) {
      return { id: user.id, email: user.email, role: user.role };
    }

    // Update role + revoke live sessions atomically so the target user's
    // existing access tokens cannot outlive the role change past the next
    // refresh (≤15 min). JwtStrategy already reads role from the DB on every
    // request so authorization itself is correct immediately; revoking
    // sessions also forces a re-login on the frontend, which refreshes the
    // cached user used for UI gating (sidebar, route guards).
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { role: dto.role },
        select: { id: true, email: true, role: true },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return updated;
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

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isVerified: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('User is already verified');

    // Invalidate any outstanding verification tokens
    await this.prisma.verificationToken.updateMany({
      where: { userId, type: 'email', usedAt: null },
      data: { usedAt: new Date() },
    });

    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: otpHash,
        type: 'email',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.notifications.sendEmail(
      user.email,
      'MyHealth Vault+™ — Verify Your Email',
      `Your email verification OTP is: ${otp}\n\nIt expires in 10 minutes.`,
      userId,
    );

    return { message: 'Verification email sent' };
  }

  async sendOnboardingEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isVerified: true, patient: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) throw new BadRequestException('User has not verified their email yet');
    if (user.patient) throw new BadRequestException('User has already completed onboarding');

    const frontendUrl = process.env.FRONTEND_URL ?? 'https://app.myvaultplus.com';

    await this.notifications.sendEmail(
      user.email,
      'Complete Your MyHealth Vault+™ Profile',
      `Hello,\n\nYour account is verified but your health profile is not set up yet.\n\nPlease log in and complete your onboarding to access all features:\n${frontendUrl}/onboarding\n\nIf you have any issues, contact our support team.`,
      userId,
    );

    return { message: 'Onboarding email sent' };
  }

  async getAuditLogs(page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where = userId ? { actorId: userId } : {};

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: { actor: { select: { email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.actorId ?? null,
      userEmail: r.actor?.email ?? '(system)',
      action: r.action,
      resource: r.resourceType,
      resourceId: r.resourceId ?? null,
      ipAddress: r.ipAddress ?? null,
      createdAt: r.occurredAt,
    }));

    return { data, meta: { total, page, limit } };
  }

  async getAuditLog(id: string) {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, email: true, role: true } },
        patient: { select: { id: true, firstName: true, lastName: true, hhaPatientId: true } },
      },
    });

    if (!row) throw new NotFoundException('Audit log entry not found');

    return {
      data: {
        id: row.id,
        userId: row.actorId ?? null,
        userEmail: row.actor?.email ?? '(system)',
        userRole: row.actor?.role ?? null,
        action: row.action,
        resource: row.resourceType,
        resourceId: row.resourceId ?? null,
        severity: row.severity,
        metadata: row.metadata,
        ipAddress: row.ipAddress ?? null,
        userAgent: row.userAgent ?? null,
        patient: row.patient
          ? { id: row.patient.id, name: `${row.patient.firstName} ${row.patient.lastName}`, hhaPatientId: row.patient.hhaPatientId }
          : null,
        createdAt: row.occurredAt,
      },
    };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalyticsSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const safe = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
      promise.catch(() => fallback);

    const ACTIVE_DISPATCH_STATUSES: DispatchStatus[] = [
      DispatchStatus.requested,
      DispatchStatus.triaged,
      DispatchStatus.unit_assigned,
      DispatchStatus.en_route,
      DispatchStatus.on_scene,
    ];

    const [kpi, totalUsers, newUsersToday, appointmentsToday, activeDispatch, openemrSyncErrors] =
      await Promise.all([
        safe(this.prisma.operationalKpi.findFirst({ orderBy: { snapshotAt: 'desc' } }), null),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
        safe(
          this.prisma.appointment.count({
            where: {
              scheduledAt: {
                gte: todayStart,
                lt: new Date(todayStart.getTime() + 86_400_000),
              },
            },
          }),
          0,
        ),
        safe(
          this.prisma.dispatchRequest.count({
            where: { status: { in: ACTIVE_DISPATCH_STATUSES } },
          }),
          0,
        ),
        safe(this.prisma.integrationError.count({ where: { resolvedAt: null } }), 0),
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
    const records = await this.prisma.revenueSummary
      .findMany({ where: { reportDate: { gte: since } }, orderBy: { reportDate: 'asc' } })
      .catch(() => []);

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
    const records = await this.prisma.serviceUsageDaily
      .findMany({ where: { reportDate: { gte: since } }, orderBy: { reportDate: 'asc' } })
      .catch(() => []);

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

    const [rows, total] = await Promise.all([
      this.prisma.openemrSyncQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledFor: 'asc' },
        include: {
          patient: {
            select: {
              hhaPatientId: true,
              firstName: true,
              lastName: true,
              openemrPatientUuid: true,
              user: { select: { email: true } },
            },
          },
        },
      }),
      this.prisma.openemrSyncQueue.count({ where }),
    ]);

    // Flatten so the UI gets patientName / patientEmail / openemrPatientId
    // / lastAttemptAt directly. Sync queue items previously rendered the
    // raw patient UUID because the UI's getter chain hit undefined.
    const data = rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patient
        ? `${r.patient.firstName} ${r.patient.lastName}`.trim()
        : undefined,
      patientEmail: r.patient?.user?.email ?? undefined,
      hhaPatientId: r.patient?.hhaPatientId ?? undefined,
      openemrPatientId: r.patient?.openemrPatientUuid ?? null,
      operation: r.operation,
      payload: r.payload,
      status: r.status,
      attempts: r.attempts,
      maxAttempts: r.maxAttempts,
      lastAttemptAt: r.lastAttemptedAt,
      lastAttemptedAt: r.lastAttemptedAt,
      errorMessage: r.errorMessage ?? undefined,
      scheduledFor: r.scheduledFor,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    }));

    return { data, meta: { total, page, limit } };
  }

  async getIntegrationErrors(page = 1, limit = 20, resolved?: boolean) {
    const skip = (page - 1) * limit;
    const where: any =
      resolved !== undefined
        ? { resolvedAt: resolved ? { not: null } : null }
        : {};

    const [rows, total] = await Promise.all([
      this.prisma.integrationError.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: {
          patient: {
            select: { firstName: true, lastName: true, hhaPatientId: true },
          },
        },
      }),
      this.prisma.integrationError.count({ where }),
    ]);

    // Map the IntegrationError schema (errorMessage, occurredAt, method+endpoint)
    // onto the shape the UI renders (message, createdAt, operation, severity,
    // resolved boolean). Severity is derived from errorCode — 4xx warn, 5xx critical.
    const severityFor = (code: string | null | undefined): 'info' | 'warning' | 'critical' => {
      if (!code) return 'info';
      const n = parseInt(code, 10);
      if (Number.isNaN(n)) return 'info';
      if (n >= 500) return 'critical';
      if (n >= 400) return 'warning';
      return 'info';
    };

    const data = rows.map((r) => ({
      id: r.id,
      service: r.service,
      operation: `${r.method} ${r.endpoint}`,
      endpoint: r.endpoint,
      method: r.method,
      errorCode: r.errorCode ?? undefined,
      message: r.errorMessage ?? '',
      errorMessage: r.errorMessage ?? undefined,
      severity: severityFor(r.errorCode),
      resolved: r.resolvedAt !== null,
      resolvedAt: r.resolvedAt,
      resolutionNotes: r.resolutionNotes ?? undefined,
      retryCount: r.retryCount,
      patientId: r.patientId ?? undefined,
      patientName: r.patient
        ? `${r.patient.firstName} ${r.patient.lastName}`.trim()
        : undefined,
      hhaPatientId: r.patient?.hhaPatientId ?? undefined,
      createdAt: r.occurredAt,
      occurredAt: r.occurredAt,
    }));

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
    if (status && !Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      throw new BadRequestException(`Invalid appointment status: ${status}`);
    }

    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [rows, total] = await Promise.all([
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
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
          provider: {
            select: { id: true, firstName: true, lastName: true, title: true },
          },
          facility: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    // Flatten to what the admin Appointments table renders directly so the
    // page doesn't have to walk nested relations (which it currently doesn't,
    // leading to the empty patient/provider cells).
    const data = rows.map((r) => ({
      id: r.id,
      hhaRef: r.hhaRef,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      patientEmail: r.patient.user?.email ?? undefined,
      providerName: r.provider
        ? `${r.provider.title ?? ''} ${r.provider.firstName} ${r.provider.lastName}`.trim()
        : undefined,
      facilityId: r.facility?.id ?? undefined,
      facilityName: r.facility?.name ?? undefined,
      type: r.serviceType,
      status: r.status,
      scheduledAt: r.scheduledAt,
      durationMinutes: r.durationMinutes,
      isTelecare: r.isTelecare,
      createdAt: r.createdAt,
    }));

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

  async createFacility(_dto: CreateFacilityDto) {
    // OpenEMR is the source of truth for facilities — encounters, dispatch,
    // and triage all reference facility_id back to OpenEMR's facility table.
    // Creating facilities only in HHA would silently desync the two systems
    // (encounter sync hardcodes a fallback, dispatch can't route to clinics
    // OpenEMR doesn't know about). Use POST /admin/facilities/import-from-openemr
    // instead, which pulls the canonical roster + UUIDs.
    throw new BadRequestException(
      'Facilities must be created in OpenEMR. Use the "Import from OpenEMR" action on the Facilities page to pull the latest roster.',
    );
  }

  // Pulls every facility from OpenEMR and upserts into healthcare_facilities,
  // keyed on openemr_facility_id. Idempotent — re-running picks up renames
  // and address changes but does not delete locally-known facilities that
  // OpenEMR has dropped (those need manual review).
  async importFacilitiesFromOpenemr() {
    const facilities = await this.openemrService.fetchFacilities();
    let imported = 0;
    let updated = 0;
    const results: Array<{
      name: string;
      openemrId: string;
      status: 'imported' | 'updated' | 'skipped';
      reason?: string;
    }> = [];

    for (const f of facilities) {
      try {
        const existing = await this.prisma.healthcareFacility.findUnique({
          where: { openemrFacilityId: f.openemrId },
        });

        if (existing) {
          await this.prisma.healthcareFacility.update({
            where: { id: existing.id },
            data: {
              name: f.name,
              address: f.address,
              city: f.city,
              state: f.state,
            },
          });
          updated++;
          results.push({ name: f.name, openemrId: f.openemrId, status: 'updated' });
        } else {
          await this.prisma.healthcareFacility.create({
            data: {
              name: f.name,
              facilityType: 'clinic',
              address: f.address,
              city: f.city,
              state: f.state,
              openemrFacilityId: f.openemrId,
            },
          });
          imported++;
          results.push({ name: f.name, openemrId: f.openemrId, status: 'imported' });
        }
      } catch (err: unknown) {
        results.push({
          name: f.name,
          openemrId: f.openemrId,
          status: 'skipped',
          reason: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    this.logger.log(
      `Facility import: ${imported} new, ${updated} updated, ${results.filter((r) => r.status === 'skipped').length} skipped`,
    );
    return { imported, updated, skipped: results.filter((r) => r.status === 'skipped').length, results };
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

  // ── Patients ──────────────────────────────────────────────────────────────

  async listPatients(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { hhaPatientId: { contains: search, mode: 'insensitive' } },
            { openemrPatientUuid: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, phone: true } },
          subscriptions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { plan: { select: { name: true, storageQuotaBytes: true } } },
          },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const patientIds = rows.map((r) => r.id);
    const clinicalAggs = patientIds.length
      ? await this.prisma.clinicalRecord.groupBy({
          by: ['patientId'],
          where: { patientId: { in: patientIds }, fileSizeBytes: { not: null }, deletedAt: null },
          _sum: { fileSizeBytes: true },
        })
      : [];
    const clinicalBytesMap = new Map(clinicalAggs.map((a) => [a.patientId, Number(a._sum.fileSizeBytes ?? 0)]));

    const data = rows.map((r) => {
      const clinicalBytes = clinicalBytesMap.get(r.id) ?? 0;
      const photoBytes = r.profilePhotoSizeBytes ?? 0;
      const usedBytes = clinicalBytes + photoBytes;

      const override = r.storageQuotaOverrideBytes;
      const planQuota = r.subscriptions[0]?.plan?.storageQuotaBytes ?? null;
      const quotaBytes =
        override != null ? Number(override) : planQuota != null ? Number(planQuota) : null;

      return {
        id: r.id,
        hhaPatientId: r.hhaPatientId,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.user.email,
        phone: r.user.phone,
        openemrSyncStatus: r.openemrSyncStatus,
        openemrPatientUuid: r.openemrPatientUuid,
        subscriptionPlan: r.subscriptions[0]?.plan.name ?? null,
        subscriptionStatus: r.subscriptions[0]?.status ?? null,
        storageUsedBytes: usedBytes,
        storageQuotaBytes: quotaBytes,
        storageQuotaOverrideBytes: override != null ? Number(override) : null,
        createdAt: r.createdAt,
      };
    });

    return { data, meta: { total, page, limit } };
  }

  async setPatientStorageOverride(
    patientId: string,
    dto: { storageQuotaOverrideMb?: number },
    currentUser: JwtPayload,
  ) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const overrideBytes =
      dto.storageQuotaOverrideMb != null
        ? BigInt(dto.storageQuotaOverrideMb) * BigInt(1024 * 1024)
        : null;

    await this.prisma.patient.update({
      where: { id: patientId },
      data: { storageQuotaOverrideBytes: overrideBytes },
    });

    this.logger.log(
      `Admin ${currentUser.sub} set storage override for patient ${patientId} to ${dto.storageQuotaOverrideMb ?? 'null (plan default)'}`,
    );

    return { message: 'Storage quota override updated', patientId, storageQuotaOverrideMb: dto.storageQuotaOverrideMb ?? null };
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async listSubscriptions(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [rows, total] = await Promise.all([
      this.prisma.patientSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { firstName: true, lastName: true, hhaPatientId: true } },
          plan: { select: { name: true, tier: true } },
        },
      }),
      this.prisma.patientSubscription.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      hhaPatientId: r.patient.hhaPatientId,
      planName: r.plan.name,
      tier: String(r.plan.tier),
      status: String(r.status),
      startedAt: r.startedAt,
      expiresAt: r.expiresAt,
      autoRenew: r.autoRenew,
      cancelledAt: r.cancelledAt,
    }));

    return { data, meta: { total } };
  }

  async cancelSubscription(id: string) {
    return this.prisma.patientSubscription.update({
      where: { id },
      data: { status: 'cancelled' as any, cancelledAt: new Date(), autoRenew: false },
    });
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async listPayments(page = 1, limit = 20, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const conditions: any[] = [];
    if (status) conditions.push({ status });
    if (search) {
      conditions.push({
        OR: [
          { hhaRef: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: any = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      hhaRef: r.hhaRef,
      patientId: r.patientId,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      amountKobo: r.amountKobo,
      currency: r.currency,
      status: String(r.status),
      gateway: String(r.gateway),
      description: r.description,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
    }));

    return { data, meta: { total, page, limit } };
  }

  async confirmManualPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, gateway: true, patientId: true, metadata: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.gateway !== 'manual') {
      throw new BadRequestException('Only manual (bank transfer) payments can be confirmed this way');
    }
    if (payment.status === 'paid') return { already: true };

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'paid', paidAt: new Date() },
    });

    // Activate subscription if this payment carries subscription metadata
    const meta = payment.metadata as { kind?: string; planId?: string; billingCycle?: string } | null;
    if (meta?.kind === 'subscription_upgrade' && meta.planId) {
      const cycle = meta.billingCycle === 'annually' ? 'annually'
        : meta.billingCycle === 'quarterly' ? 'quarterly'
        : 'monthly';
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (cycle === 'annually') endDate.setFullYear(endDate.getFullYear() + 1);
      else if (cycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
      else endDate.setMonth(endDate.getMonth() + 1);

      await this.prisma.$transaction(async (tx) => {
        await tx.patientSubscription.updateMany({
          where: { patientId: payment.patientId, status: { in: ['active', 'trial'] } },
          data: { status: 'cancelled' as any, cancelledAt: new Date(), cancellationReason: 'Upgraded via bank transfer confirmation' },
        });
        await tx.patientSubscription.create({
          data: {
            patientId: payment.patientId,
            planId: meta.planId!,
            startedAt: startDate,
            expiresAt: endDate,
            paymentId: payment.id,
          },
        });
      });
    }

    return { confirmed: true };
  }

  async overridePatientSubscription(patientId: string, planId: string, billingCycle: 'monthly' | 'annually') {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient not found');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true, tier: true } });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan.tier === 'Free') {
      await this.prisma.patientSubscription.updateMany({
        where: { patientId, status: { in: ['active', 'trial'] } },
        data: { status: 'cancelled' as any, cancelledAt: new Date(), cancellationReason: 'Admin override — downgraded to Free' },
      });
      return { done: true };
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'annually') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    await this.prisma.$transaction(async (tx) => {
      await tx.patientSubscription.updateMany({
        where: { patientId, status: { in: ['active', 'trial'] } },
        data: { status: 'cancelled' as any, cancelledAt: new Date(), cancellationReason: 'Admin override — plan change' },
      });
      await tx.patientSubscription.create({
        data: { patientId, planId, startedAt: startDate, expiresAt: endDate },
      });
    });

    return { done: true };
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  async listProviders(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { specialty: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.provider.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      title: r.title,
      specialty: r.specialty,
      email: r.user.email,
      isAvailable: r.isAvailable,
      totalPatients: r.totalPatients,
      rating: r.rating ? Number(r.rating) : null,
      licenseNumber: r.licenseNumber,
      createdAt: r.createdAt,
    }));

    return { data, meta: { total, page, limit } };
  }

  async importProvidersFromOpenemr() {
    const practitioners = await this.openemrService.fetchPractitioners();
    let imported = 0;
    let skipped = 0;
    const results: Array<{
      email: string;
      tempPassword?: string;
      firstName: string;
      lastName: string;
      status: 'imported' | 'skipped';
      reason?: string;
    }> = [];

    for (const p of practitioners) {
      const email = p.email ?? `provider.${p.openemrId.slice(0, 8)}@hha.internal`;

      // Skip if already linked to an OpenEMR practitioner
      const existingByOemr = await this.prisma.provider.findUnique({
        where: { openemrProviderUuid: p.openemrId },
      });
      if (existingByOemr) {
        skipped++;
        results.push({ email, firstName: p.firstName, lastName: p.lastName, status: 'skipped', reason: 'already_linked' });
        continue;
      }

      // Reject silently binding an existing HHA account — surface the conflict
      // to the admin instead. An existing account may belong to a patient or
      // coordinator who shares the same email address; auto-linking would grant
      // them provider access without any explicit consent or verification step.
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        skipped++;
        results.push({ email, firstName: p.firstName, lastName: p.lastName, status: 'skipped', reason: 'email_conflict' });
        continue;
      }

      // Use 18 bytes of CSPRNG output (~144 bits of entropy)
      const tempPassword = randomBytes(18).toString('base64url');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      try {
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email, passwordHash, role: UserRole.provider, isVerified: true },
          });

          await tx.provider.create({
            data: {
              userId: user.id,
              firstName: p.firstName,
              lastName: p.lastName,
              title: p.title,
              specialty: p.specialty,
              openemrProviderUuid: p.openemrId,
            },
          });

          imported++;
          results.push({ email, tempPassword, firstName: p.firstName, lastName: p.lastName, status: 'imported' });
        });
      } catch {
        skipped++;
        results.push({ email, firstName: p.firstName, lastName: p.lastName, status: 'skipped', reason: 'db_error' });
      }
    }

    return { imported, skipped, total: practitioners.length, providers: results };
  }

  async toggleProviderAvailability(id: string, available: boolean) {
    return this.prisma.provider.update({
      where: { id },
      data: { isAvailable: available },
    });
  }

  // ── Clinical Queue ────────────────────────────────────────────────────────

  async getClinicalQueue() {
    const [rawTeleconsults, rawExpertReviews] = await Promise.all([
      this.prisma.telecareSession
        .findMany({
          where: { status: { in: ['waiting', 'active', 'in_progress'] as any[] } },
          include: {
            patient: { select: { firstName: true, lastName: true } },
            provider: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
        .catch(() => []),
      this.prisma.expertReviewCase
        .findMany({
          where: { status: { in: ['submitted', 'under_review', 'in_review'] as any[] } },
          include: {
            patient: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
        .catch(() => []),
    ]);

    const teleconsults = rawTeleconsults.map((r) => ({
      id: r.id,
      type: 'teleconsult' as const,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      providerName: r.provider
        ? `${r.provider.firstName} ${r.provider.lastName}`.trim()
        : null,
      status: String(r.status),
      createdAt: r.createdAt,
      waitMinutes: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000),
    }));

    const expertReviews = rawExpertReviews.map((r) => ({
      id: r.id,
      type: 'expert_review' as const,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      providerName: null,
      status: String(r.status),
      createdAt: r.createdAt,
      waitMinutes: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000),
    }));

    return {
      teleconsults,
      expertReviews,
      total: teleconsults.length + expertReviews.length,
    };
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────

  async getFeatureFlags() {
    const raw = await this.redis.get(FLAGS_REDIS_KEY).catch(() => null);
    const overrides: Record<string, boolean> = raw ? JSON.parse(raw) : {};

    return Object.entries(DEFAULT_FLAGS).map(([key, def]) => ({
      key,
      label: def.label,
      description: def.description,
      enabled: overrides[key] ?? def.defaultValue,
    }));
  }

  async setFeatureFlag(key: string, enabled: boolean) {
    if (!(key in DEFAULT_FLAGS)) {
      throw new BadRequestException(`Unknown feature flag: ${key}`);
    }

    const raw = await this.redis.get(FLAGS_REDIS_KEY).catch(() => null);
    const overrides: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    overrides[key] = enabled;
    await this.redis.set(FLAGS_REDIS_KEY, JSON.stringify(overrides));

    return Object.entries(DEFAULT_FLAGS).map(([k, def]) => ({
      key: k,
      label: def.label,
      description: def.description,
      enabled: overrides[k] ?? def.defaultValue,
    }));
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async listNotifications(page = 1, limit = 20, channel?: string, status?: string) {
    const skip = (page - 1) * limit;
    const conditions: any[] = [];
    if (channel) conditions.push({ channel });
    if (status) conditions.push({ status });
    const where: any = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      recipient: r.recipient,
      subject: r.subject,
      status: r.status,
      sentAt: r.sentAt,
      failedAt: r.failedAt,
      failureReason: r.failureReason,
      createdAt: r.createdAt,
    }));

    return { data, meta: { total, page, limit } };
  }

  async resendNotification(id: string) {
    try {
      await this.prisma.notificationDelivery.update({
        where: { id },
        data: { status: 'queued', failedAt: null, failureReason: null },
      });
      return { message: 'Requeued for delivery' };
    } catch {
      throw new NotFoundException('Notification delivery record not found');
    }
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
