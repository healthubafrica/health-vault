import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, ServiceType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { OpenemrService } from '../openemr/openemr.service';

// Valid FSM transitions: status → allowed next statuses
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.requested]: [
    AppointmentStatus.confirmed,
    AppointmentStatus.cancelled,
  ],
  [AppointmentStatus.confirmed]: [
    AppointmentStatus.upcoming,
    AppointmentStatus.in_progress,
    AppointmentStatus.cancelled,
    AppointmentStatus.no_show,
  ],
  [AppointmentStatus.upcoming]: [
    AppointmentStatus.in_progress,
    AppointmentStatus.cancelled,
    AppointmentStatus.no_show,
  ],
  [AppointmentStatus.in_progress]: [AppointmentStatus.completed],
  [AppointmentStatus.completed]: [],
  [AppointmentStatus.cancelled]: [],
  [AppointmentStatus.no_show]: [],
};

// The booking DTO speaks in appointment types; the schema stores a service
// type plus a telecare flag.
function toServiceFields(appointmentType?: string): {
  serviceType: ServiceType;
  isTelecare: boolean;
} {
  if (appointmentType === 'virtual') {
    return { serviceType: ServiceType.TeleCare, isTelecare: true };
  }
  return { serviceType: ServiceType.HealthConsult, isTelecare: false };
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    } else {
      this.requireAdminOrCoordinator(currentUser);
    }

    if (dto.providerId) {
      const provider = await this.prisma.provider.findUnique({
        where: { id: dto.providerId },
        select: { id: true },
      });
      if (!provider) throw new NotFoundException('Provider not found');
    }

    const { serviceType, isTelecare } = toServiceFields(dto.appointmentType);

    const appointment = await this.prisma.appointment.create({
      data: {
        hhaRef: await this.generateAppointmentRef(),
        patientId,
        providerId: dto.providerId ?? null,
        serviceType,
        isTelecare,
        location:
          dto.facilityId ?? (dto.appointmentType === 'home_visit' ? 'Home visit' : undefined),
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes,
        reason: dto.chiefComplaint,
        patientNotes: dto.notes,
      },
      select: this.safeSelect(),
    });

    await this.openemrService.enqueueEncounterSync(appointment.patientId, appointment.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR encounter sync: ${err.message}`),
    );

    return appointment;
  }

  // APT-YYYY-000001 sequential appointment reference
  private async generateAppointmentRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APT-${year}-`;
    const last = await this.prisma.appointment.findFirst({
      where: { hhaRef: { startsWith: prefix } },
      orderBy: { hhaRef: 'desc' },
      select: { hhaRef: true },
    });
    const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  // ── Find All ──────────────────────────────────────────────────────────────

  async findAll(query: QueryAppointmentsDto, currentUser: JwtPayload) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query, currentUser);

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: query.upcoming ? 'asc' : 'desc' },
        select: this.safeSelect(),
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: this.safeSelect(),
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertAccess(appt, currentUser);

    return appt;
  }

  // ── Update / FSM transition ───────────────────────────────────────────────

  async update(id: string, dto: UpdateAppointmentDto, currentUser: JwtPayload) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        patientId: true,
        providerId: true,
        scheduledAt: true,
        isTelecare: true,
        patient: { select: { userId: true } },
        telecareSession: { select: { id: true } },
      },
    });

    if (!appt) throw new NotFoundException('Appointment not found');
    this.assertAccess(appt, currentUser);

    if (dto.status && dto.status !== appt.status) {
      const allowed = ALLOWED_TRANSITIONS[appt.status];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from ${appt.status} to ${dto.status}`,
        );
      }
    }

    // Provider reassignment is an admin/coordinator-only mutation. Patients
    // and the assigned provider can update everything else but not who
    // delivers the care.
    if (dto.providerId !== undefined) {
      const adminRoles: UserRole[] = [
        UserRole.admin,
        UserRole.super_admin,
        UserRole.coordinator,
      ];
      if (!adminRoles.includes(currentUser.role as UserRole)) {
        throw new ForbiddenException('Only admin or coordinator can reassign a provider');
      }
      const target = await this.prisma.provider.findUnique({
        where: { id: dto.providerId },
        select: { id: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new NotFoundException('Provider not found');
      }
    }

    const data: any = {};
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.chiefComplaint !== undefined) data.reason = dto.chiefComplaint;
    if (dto.notes !== undefined) data.patientNotes = dto.notes;
    if (dto.providerNotes !== undefined) data.providerNotes = dto.providerNotes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.cancellationReason !== undefined) {
      data.cancellationNote = dto.cancellationReason;
      data.cancelledBy = currentUser.sub;
    }
    if (dto.providerId !== undefined) data.providerId = dto.providerId;

    // Effective providerId for downstream logic — if the same PATCH assigns
    // *and* confirms in one shot, use the new value, not the stale row.
    const effectiveProviderId = dto.providerId ?? appt.providerId;

    // Auto-create a TelecareSession the moment a telecare appointment is
    // confirmed so it surfaces in /operations/telecare and the provider
    // waiting queue without an admin separately POSTing /telecare/sessions.
    // Idempotent: skip if a session already exists. Done in the same
    // transaction as the status update so we never confirm without the
    // matching session row landing.
    const shouldSpawnTelecareSession =
      dto.status === AppointmentStatus.confirmed &&
      appt.isTelecare &&
      !appt.telecareSession;

    if (shouldSpawnTelecareSession && !effectiveProviderId) {
      throw new BadRequestException(
        'Assign a provider before confirming a teleconsult appointment',
      );
    }

    if (shouldSpawnTelecareSession) {
      const hhaRef = await this.generateTelecareRef();
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id },
          data,
          select: this.safeSelect(),
        });
        await tx.telecareSession.create({
          data: {
            hhaRef,
            appointmentId: appt.id,
            patientId: appt.patientId,
            providerId: effectiveProviderId!,
            scheduledAt: appt.scheduledAt,
            platform: 'HHA Native',
          },
        });
        return updated;
      });
    }

    return this.prisma.appointment.update({
      where: { id },
      data,
      select: this.safeSelect(),
    });
  }

  // TLC-YYYY-0001 sequential session reference. Duplicates the helper in
  // TelecareService so we don't need a circular import for the auto-spawn case.
  private async generateTelecareRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TLC-${year}-`;
    const last = await this.prisma.telecareSession.findFirst({
      where: { hhaRef: { startsWith: prefix } },
      orderBy: { hhaRef: 'desc' },
      select: { hhaRef: true },
    });
    const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(id: string, reason: string, currentUser: JwtPayload) {
    return this.update(
      id,
      { status: AppointmentStatus.cancelled, cancellationReason: reason },
      currentUser,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildWhere(query: QueryAppointmentsDto, currentUser: JwtPayload) {
    const where: any = {};

    const adminRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);

    if (!isAdmin) {
      if (currentUser.patientId) {
        where.patientId = currentUser.patientId;
      } else if (currentUser.providerId) {
        where.providerId = currentUser.providerId;
      }
    } else {
      if (query.patientId) where.patientId = query.patientId;
      if (query.providerId) where.providerId = query.providerId;
    }

    if (query.status) where.status = query.status;
    if (query.appointmentType) {
      where.isTelecare = query.appointmentType === 'virtual';
    }
    if (query.fromDate || query.toDate) {
      where.scheduledAt = {};
      if (query.fromDate) where.scheduledAt.gte = new Date(query.fromDate);
      if (query.toDate) where.scheduledAt.lte = new Date(query.toDate);
    }

    if (query.upcoming) {
      where.scheduledAt = { ...where.scheduledAt, gte: new Date() };
      if (!query.status) {
        where.status = {
          notIn: [
            AppointmentStatus.cancelled,
            AppointmentStatus.completed,
            AppointmentStatus.no_show,
          ],
        };
      }
    }

    return where;
  }

  private safeSelect() {
    return {
      id: true,
      hhaRef: true,
      patientId: true,
      providerId: true,
      serviceType: true,
      isTelecare: true,
      location: true,
      status: true,
      scheduledAt: true,
      durationMinutes: true,
      reason: true,
      patientNotes: true,
      providerNotes: true,
      cancellationNote: true,
      createdAt: true,
      updatedAt: true,
      patient: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          hhaPatientId: true,
        },
      },
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          specialty: true,
        },
      },
    };
  }

  private assertAccess(
    appt: { patient?: { userId?: string } | null; providerId?: string },
    currentUser: JwtPayload,
  ) {
    const adminRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    if (adminRoles.includes(currentUser.role as UserRole)) return;

    const isPatient = appt.patient?.userId === currentUser.sub;
    const isProvider = appt.providerId === currentUser.providerId;

    if (!isPatient && !isProvider) throw new ForbiddenException('Access denied');
  }

  private requireAdminOrCoordinator(user: JwtPayload) {
    const allowed: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
