import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppointmentStatus, ServiceType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { OpenemrService } from '../openemr/openemr.service';
import { NotificationsService, AppointmentNotificationData } from '../notifications/notifications.service';

export const APPOINTMENT_REMINDERS_QUEUE = 'appointment-reminders';

type AppointmentEmailEvent = 'requested' | 'confirmed' | 'cancelled' | 'rescheduled' | 'no_show' | 'completed';

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

// Map appointment type + optional explicit service type to schema fields.
// The explicit serviceType from the DTO takes precedence when provided;
// appointmentType is used only to set the isTelecare flag.
const TELECARE_SERVICES = new Set<ServiceType>([ServiceType.TeleCare, ServiceType.NeuroFlex]);

function toServiceFields(
  appointmentType: string,
  explicitServiceType?: ServiceType,
): { serviceType: ServiceType; isTelecare: boolean } {
  const isVirtual = appointmentType === 'virtual';

  if (explicitServiceType) {
    return {
      serviceType: explicitServiceType,
      isTelecare: TELECARE_SERVICES.has(explicitServiceType),
    };
  }

  return {
    serviceType: isVirtual ? ServiceType.TeleCare : ServiceType.HealthConsult,
    isTelecare: isVirtual,
  };
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
    private readonly notifications: NotificationsService,
    @InjectQueue(APPOINTMENT_REMINDERS_QUEUE) private readonly reminderQueue: Queue,
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
        select: { id: true, verifiedAt: true, deletedAt: true },
      });
      if (!provider || provider.deletedAt) throw new NotFoundException('Provider not found');
      // Block bookings against unverified providers. Cosmetic profile fields
      // are fine to expose pre-verify (so the provider can prep their bio),
      // but they can't take appointments — and via the auto-spawn flow, they
      // can't be assigned a TelecareSession — until an admin has signed off
      // on the credentials.
      if (!provider.verifiedAt) {
        throw new BadRequestException('Selected provider is not yet verified');
      }
    }

    const { serviceType, isTelecare } = toServiceFields(dto.appointmentType, dto.serviceType);

    // Validate the chosen facility exists when one is supplied. We don't
    // require it on telecare appointments (no physical location) or on
    // home visits (location is "wherever the patient is").
    if (dto.facilityId) {
      const facility = await this.prisma.healthcareFacility.findUnique({
        where: { id: dto.facilityId },
        select: { id: true },
      });
      if (!facility) throw new NotFoundException('Facility not found');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        hhaRef: await this.generateAppointmentRef(),
        patientId,
        providerId: dto.providerId ?? null,
        facilityId: dto.facilityId ?? null,
        serviceType,
        isTelecare,
        location: dto.appointmentType === 'home_visit' ? 'Home visit' : undefined,
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

    void this.notifyAppointmentEvent(appointment.id, 'requested');

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
        select: { id: true, deletedAt: true, verifiedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new NotFoundException('Provider not found');
      }
      if (!target.verifiedAt) {
        throw new BadRequestException('Target provider is not yet verified');
      }
    }

    // Same protection for facility reassignment — admin / coordinator only.
    if (dto.facilityId !== undefined && dto.facilityId !== null) {
      const adminRoles: UserRole[] = [
        UserRole.admin,
        UserRole.super_admin,
        UserRole.coordinator,
      ];
      if (!adminRoles.includes(currentUser.role as UserRole)) {
        throw new ForbiddenException('Only admin or coordinator can reassign the facility');
      }
      const facility = await this.prisma.healthcareFacility.findUnique({
        where: { id: dto.facilityId },
        select: { id: true },
      });
      if (!facility) throw new NotFoundException('Facility not found');
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
    if (dto.facilityId !== undefined) data.facilityId = dto.facilityId;

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

    // Which lifecycle email (if any) this mutation should trigger. Status
    // changes win over a bare time change so a confirm+reschedule in one
    // PATCH sends a single "confirmed" email with the new time in it.
    const emailEvent: AppointmentEmailEvent | null =
      dto.status === AppointmentStatus.confirmed && appt.status !== AppointmentStatus.confirmed
        ? 'confirmed'
        : dto.status === AppointmentStatus.cancelled
          ? 'cancelled'
          : dto.status === AppointmentStatus.no_show
            ? 'no_show'
            : dto.status === AppointmentStatus.completed
              ? 'completed'
              : !dto.status && dto.scheduledAt && new Date(dto.scheduledAt).getTime() !== appt.scheduledAt.getTime()
                ? 'rescheduled'
                : null;

    let updatedAppointment;
    if (shouldSpawnTelecareSession) {
      const hhaRef = await this.generateTelecareRef();
      updatedAppointment = await this.prisma.$transaction(async (tx) => {
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
    } else {
      updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data,
        select: this.safeSelect(),
      });
    }

    if (emailEvent) void this.notifyAppointmentEvent(id, emailEvent);

    // Schedule 24h + 1h reminder jobs when confirmed; cancel them when the
    // appointment reaches a terminal state. Reschedule cancels any existing
    // jobs and re-queues for the new time.
    if (emailEvent === 'confirmed') {
      void this.scheduleReminders(id, updatedAppointment.scheduledAt);
    } else if (emailEvent === 'cancelled' || emailEvent === 'no_show' || emailEvent === 'completed') {
      void this.cancelReminders(id);
    } else if (emailEvent === 'rescheduled') {
      void this.cancelReminders(id).then(() =>
        this.scheduleReminders(id, updatedAppointment.scheduledAt),
      );
    }

    // Mirror the booking onto the OpenEMR calendar so the provider sees it
    // in OpenEMR: confirmed/rescheduled → (re)create the event, cancelled →
    // remove it. Fire-and-forget; failures land in /admin/system/errors.
    const isOnCalendar =
      appt.status === AppointmentStatus.confirmed || appt.status === AppointmentStatus.upcoming;
    if (emailEvent === 'confirmed' || (emailEvent === 'rescheduled' && isOnCalendar)) {
      void this.openemrService
        .enqueueAppointmentCalendarSync(appt.patientId, id, 'upsert')
        .catch((err) => this.logger.error(`Failed to enqueue calendar sync: ${err.message}`));
    } else if (emailEvent === 'cancelled') {
      void this.openemrService
        .enqueueAppointmentCalendarSync(appt.patientId, id, 'cancel')
        .catch((err) => this.logger.error(`Failed to enqueue calendar sync: ${err.message}`));
    }

    return updatedAppointment;
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
      if (currentUser.role === UserRole.provider && currentUser.providerId) {
        where.providerId = currentUser.providerId;
      } else if (currentUser.patientId) {
        where.patientId = currentUser.patientId;
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

  // Returns providers assigned to the given service type, ordered by priority
  // (1=primary → 2=backup → 3=overflow). If scheduledAt is provided, further
  // filters to providers whose active shift template covers that day/time.
  async listAvailableProviders(serviceType: ServiceType, scheduledAt?: string) {
    const requestedAt = scheduledAt ? new Date(scheduledAt) : undefined;
    const dayOfWeek = requestedAt?.getDay(); // 0=Sun…6=Sat
    const timeOfDay = requestedAt
      ? requestedAt.toTimeString().slice(0, 8) // 'HH:MM:SS'
      : undefined;
    const today = requestedAt ? requestedAt.toISOString().slice(0, 10) : undefined;

    const groups = await this.prisma.providerServiceGroup.findMany({
      where: { serviceType, isActive: true },
      orderBy: { priority: 'asc' },
      select: {
        priority: true,
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            specialty: true,
            rating: true,
            isAvailable: true,
            verifiedAt: true,
            deletedAt: true,
          },
        },
        shiftAssignments: requestedAt
          ? {
              where: {
                effectiveFrom: { lte: new Date(today!) },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(today!) } }],
                shiftTemplate: {
                  dayOfWeek,
                  isActive: true,
                  startTime: { lte: new Date(`1970-01-01T${timeOfDay}Z`) },
                  endTime: { gte: new Date(`1970-01-01T${timeOfDay}Z`) },
                },
              },
              select: { id: true },
            }
          : undefined,
      },
    });

    return groups
      .filter(
        (g) =>
          !g.provider.deletedAt &&
          g.provider.verifiedAt &&
          (!requestedAt || g.shiftAssignments!.length > 0),
      )
      .map((g) => ({
        id: g.provider.id,
        firstName: g.provider.firstName,
        lastName: g.provider.lastName,
        title: g.provider.title,
        specialty: g.provider.specialty,
        rating: g.provider.rating,
        isAvailable: g.provider.isAvailable,
        priority: g.priority,
      }));
  }

  // Lightweight facility list for the patient booking screen. Returns only
  // facilities mirrored from OpenEMR (openemr_facility_id != null) so we
  // never let a patient choose a facility encounter sync can't route to.
  async listFacilitiesForBooking() {
    return this.prisma.healthcareFacility.findMany({
      where: { openemrFacilityId: { not: null } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, city: true, state: true },
    });
  }

  // ── Lifecycle notifications ────────────────────────────────────────────────

  private async notifyAppointmentEvent(appointmentId: string, event: AppointmentEmailEvent) {
    try {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          hhaRef: true,
          serviceType: true,
          isTelecare: true,
          location: true,
          scheduledAt: true,
          durationMinutes: true,
          cancellationNote: true,
          facility: { select: { name: true, city: true } },
          patient: {
            select: {
              firstName: true,
              userId: true,
              user: { select: { email: true, phone: true } },
            },
          },
          provider: {
            select: {
              firstName: true,
              lastName: true,
              title: true,
              user: { select: { email: true, id: true } },
            },
          },
        },
      });
      if (!appt?.patient?.user?.email) return;

      const when = appt.scheduledAt.toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
      }) + ' (WAT)';

      const providerName = appt.provider
        ? `${appt.provider.title} ${appt.provider.firstName} ${appt.provider.lastName}`
        : null;

      const locationLine = appt.isTelecare
        ? 'Join from your Health Hub Africa portal a few minutes before the start time.'
        : appt.facility
          ? `${appt.facility.name}${appt.facility.city ? `, ${appt.facility.city}` : ''}`
          : appt.location ?? null;

      const baseData = {
        hhaRef: appt.hhaRef,
        serviceType: appt.serviceType,
        when,
        durationMinutes: appt.durationMinutes,
        isVirtual: appt.isTelecare,
        providerName,
        locationLine,
        cancelReason: appt.cancellationNote ?? null,
      };

      type EventTemplate = { subject: string; intro: string; outro: string; sms: string };
      const templates: Record<AppointmentEmailEvent, EventTemplate> = {
        requested: {
          subject: `Appointment request received — ${appt.hhaRef}`,
          intro: 'We have received your appointment request and it is now pending confirmation.',
          outro: 'You will receive another email as soon as your appointment is confirmed.',
          sms: `Health Hub Africa: appointment request ${appt.hhaRef} received for ${when}. We'll confirm shortly.`,
        },
        confirmed: {
          subject: `Appointment confirmed — ${appt.hhaRef}`,
          intro: 'Great news — your appointment has been confirmed.',
          outro: 'Need to make changes? Manage your appointment in your Health Hub Africa portal.',
          sms: `Health Hub Africa: appointment ${appt.hhaRef} confirmed for ${when}${providerName ? ` with ${providerName}` : ''}.`,
        },
        cancelled: {
          subject: `Appointment cancelled — ${appt.hhaRef}`,
          intro: 'Your appointment has been cancelled.',
          outro: 'You can book a new appointment at any time from your Health Hub Africa portal.',
          sms: `Health Hub Africa: appointment ${appt.hhaRef} (${when}) has been cancelled.`,
        },
        rescheduled: {
          subject: `Appointment rescheduled — ${appt.hhaRef}`,
          intro: 'Your appointment has been moved to a new date and time.',
          outro: 'If the new time does not work for you, you can reschedule or cancel from your portal.',
          sms: `Health Hub Africa: appointment ${appt.hhaRef} rescheduled to ${when}.`,
        },
        no_show: {
          subject: `Missed appointment — ${appt.hhaRef}`,
          intro: 'We noticed you were unable to attend your appointment.',
          outro: 'You can easily rebook at any time from your Health Hub Africa portal.',
          sms: `Health Hub Africa: you missed your appointment ${appt.hhaRef} on ${when}. Book a new one anytime via the portal.`,
        },
        completed: {
          subject: `Appointment complete — ${appt.hhaRef}`,
          intro: 'Your appointment is now complete. We hope it went well!',
          outro: 'If you have follow-up questions, message your provider or book another appointment from the portal.',
          sms: `Health Hub Africa: your appointment ${appt.hhaRef} is complete. Book follow-ups anytime via the portal.`,
        },
      };
      const t = templates[event];

      // Patient notification
      const patientData: AppointmentNotificationData = {
        ...baseData,
        recipientName: appt.patient.firstName,
        intro: t.intro,
        outro: t.outro,
      };
      await this.notifications.sendAppointmentEmail(
        appt.patient.user.email,
        t.subject,
        appt.patient.userId,
        patientData,
      );
      if (appt.patient.user.phone) {
        await this.notifications.sendSms(appt.patient.user.phone, t.sms, appt.patient.userId);
      }

      // Provider notifications:
      //  requested  → new booking alert
      //  confirmed  → schedule confirmed
      //  cancelled  → schedule removed
      //  rescheduled → time changed
      // (no_show and completed do not generate provider emails)
      const providerEvents: AppointmentEmailEvent[] = ['requested', 'confirmed', 'cancelled', 'rescheduled'];
      if (providerEvents.includes(event) && appt.provider?.user?.email) {
        const providerIntros: Record<string, string> = {
          requested: 'A new appointment request is awaiting your confirmation.',
          confirmed: 'An appointment has been confirmed on your schedule.',
          cancelled: 'An appointment on your schedule has been cancelled.',
          rescheduled: 'An appointment on your schedule has been moved to a new time.',
        };
        const providerSubjects: Record<string, string> = {
          requested: `New appointment request — ${appt.hhaRef}`,
          confirmed: `Appointment confirmed on your schedule — ${appt.hhaRef}`,
          cancelled: `Appointment cancelled — ${appt.hhaRef}`,
          rescheduled: `Appointment rescheduled — ${appt.hhaRef}`,
        };
        const providerData: AppointmentNotificationData = {
          ...baseData,
          recipientName: appt.provider.firstName,
          intro: providerIntros[event],
          outro: 'View your full schedule in the Health Hub Africa provider portal.',
        };
        await this.notifications.sendAppointmentEmail(
          appt.provider.user.email,
          providerSubjects[event],
          appt.provider.user.id,
          providerData,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to send ${event} notification for appointment ${appointmentId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ── Reminder scheduling ────────────────────────────────────────────────────

  private async scheduleReminders(appointmentId: string, scheduledAt: Date): Promise<void> {
    const now = Date.now();
    const apptMs = scheduledAt.getTime();
    const slots: Array<{ suffix: string; delay: number }> = [];

    const ms24h = apptMs - 24 * 60 * 60 * 1000 - now;
    const ms1h = apptMs - 60 * 60 * 1000 - now;

    if (ms24h > 0) slots.push({ suffix: '24h', delay: ms24h });
    if (ms1h > 0) slots.push({ suffix: '1h', delay: ms1h });

    for (const { suffix, delay } of slots) {
      const jobId = `appt:${appointmentId}:${suffix}`;
      // Remove any existing delayed job for this slot before re-queuing
      const existing = await this.reminderQueue.getJob(jobId);
      if (existing) await existing.remove().catch(() => undefined);
      await this.reminderQueue.add(
        'send-reminder',
        { appointmentId, type: suffix },
        { delay, jobId, removeOnComplete: true, removeOnFail: false },
      );
      this.logger.log(`Scheduled ${suffix} reminder for appointment ${appointmentId} (delay ${Math.round(delay / 60000)} min)`);
    }
  }

  private async cancelReminders(appointmentId: string): Promise<void> {
    for (const suffix of ['24h', '1h']) {
      try {
        const job = await this.reminderQueue.getJob(`appt:${appointmentId}:${suffix}`);
        if (job) {
          await job.remove();
          this.logger.log(`Cancelled ${suffix} reminder for appointment ${appointmentId}`);
        }
      } catch {
        // Job may have already fired — no action needed
      }
    }
  }

  private safeSelect() {
    return {
      id: true,
      hhaRef: true,
      patientId: true,
      providerId: true,
      facilityId: true,
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
      facility: { select: { id: true, name: true, openemrFacilityId: true } },
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
    appt: { patient?: { userId?: string } | null; providerId?: string | null },
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
