import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SessionStatus, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AccessToken, WebhookReceiver } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  CreateTelecareSessionDto,
  UpdateSessionDto,
  CreateSessionNoteDto,
  CreateOnDemandSessionDto,
  TransferSessionDto,
  CreateShiftDto,
} from './dto/create-session.dto';

export const TELECARE_QUEUE = 'telecare-maintenance';

// Sessions stuck in 'active' for longer than this are assumed dead and the
// sweep cron auto-closes them. Picked well above any reasonable consult
// length (a long teleconsult is ~45 min) so we never close a live call.
const STALE_ACTIVE_THRESHOLD_MIN = 120;
// Best-effort endedAt for swept sessions: assume the call ran ~30 min after
// startedAt rather than stamping "now", so analytics aren't skewed by the
// gap between the real disconnect and the sweep firing.
const SWEEP_DEFAULT_DURATION_MIN = 30;

@Injectable()
export class TelecareService implements OnModuleInit {
  private readonly logger = new Logger(TelecareService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(TELECARE_QUEUE) private readonly maintenanceQueue: Queue,
    private readonly s3: S3Service,
  ) {}

  async onModuleInit() {
    // Repeatables accumulate across deploys if left in place — clear ours
    // first so changes to the cron expression actually take effect.
    const repeatables = await this.maintenanceQueue.getRepeatableJobs();
    for (const r of repeatables.filter((j) => j.name === 'sweep-stale-active')) {
      await this.maintenanceQueue.removeRepeatableByKey(r.key);
    }

    await this.maintenanceQueue.add(
      'sweep-stale-active',
      {},
      { repeat: { cron: '*/30 * * * *' }, removeOnComplete: 10 },
    );
  }

  async getLivekitToken(sessionId: string, currentUser: JwtPayload) {
    const session = await this.prisma.telecareSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: { select: { firstName: true, lastName: true, userId: true } },
        provider: { select: { firstName: true, lastName: true, title: true, userId: true } },
      },
    });

    if (!session) throw new NotFoundException('Telecare session not found');
    this.assertAccess(session, currentUser);

    let participantName = 'Participant';
    if (currentUser.patientId && session.patient) {
      participantName = `${session.patient.firstName} ${session.patient.lastName}`;
    } else if (currentUser.providerId && session.provider) {
      participantName = `${session.provider.title} ${session.provider.firstName} ${session.provider.lastName}`;
    } else {
      participantName = currentUser.email || 'Admin/Coordinator';
    }

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const serverUrl = this.config.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !serverUrl) {
      throw new Error('LiveKit credentials are not fully configured on the server');
    }

    const roomName = `telecare-${session.id}`;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: currentUser.sub,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return {
      token,
      serverUrl,
      roomName,
    };
  }

  async createSession(dto: CreateTelecareSessionDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, patientId: true, providerId: true, scheduledAt: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (!appointment.providerId) {
      throw new BadRequestException('Appointment must have an assigned provider before creating a telecare session');
    }

    return this.prisma.telecareSession.create({
      data: {
        hhaRef: await this.generateSessionRef(),
        appointmentId: dto.appointmentId,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        scheduledAt: appointment.scheduledAt,
        meetingUrl: dto.videoRoomSid,
        platform: dto.videoProvider ?? 'HHA Native',
      },
    });
  }

  // TLC-YYYY-0001 sequential session reference
  private async generateSessionRef(): Promise<string> {
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

  async findSessions(currentUser: JwtPayload, status?: SessionStatus) {
    const where: any = {};

    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    if (currentUser.role === UserRole.provider && currentUser.providerId) {
      where.providerId = currentUser.providerId;
    } else if (currentUser.role === UserRole.patient && currentUser.patientId) {
      where.patientId = currentUser.patientId;
    } else if (adminRoles.includes(currentUser.role as UserRole)) {
      // Admin: no scope filter — returns all sessions
    } else {
      this.requireProviderOrAdmin(currentUser);
    }

    if (status) where.status = status;

    const sessions = await this.prisma.telecareSession.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        notes: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            openemrPatientUuid: true,
            profilePhotoUrl: true,
            subscriptions: {
              where: { status: 'active' },
              orderBy: { startedAt: 'desc' },
              take: 1,
              select: { plan: { select: { name: true, tier: true } } },
            },
          },
        },
        provider: { select: { firstName: true, lastName: true, title: true, profilePhotoUrl: true } },
      },
    });

    // Photos are private S3 objects — swap stored URLs for short-lived
    // signed ones so session cards can render them directly.
    return Promise.all(
      sessions.map(async (s) => ({
        ...s,
        patient: s.patient
          ? { ...s.patient, profilePhotoUrl: await this.s3.signStoredUrl(s.patient.profilePhotoUrl) }
          : s.patient,
        provider: s.provider
          ? { ...s.provider, profilePhotoUrl: await this.s3.signStoredUrl(s.provider.profilePhotoUrl) }
          : s.provider,
      })),
    );
  }

  async createOnDemandSession(dto: CreateOnDemandSessionDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);
    return this.prisma.telecareSession.create({
      data: {
        hhaRef: await this.generateSessionRef(),
        patientId: dto.patientId,
        providerId: dto.providerId,
        scheduledAt: new Date(),
        status: SessionStatus.waiting,
        platform: 'HHA Native',
      },
    });
  }

  async acceptSession(id: string, currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const session = await this.prisma.telecareSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Telecare session not found');
    if (session.providerId !== currentUser.providerId)
      throw new ForbiddenException('Session not assigned to you');
    if (session.status !== SessionStatus.waiting)
      throw new BadRequestException('Session is not in waiting state');

    return this.prisma.telecareSession.update({
      where: { id },
      data: { status: SessionStatus.active, startedAt: new Date() },
    });
  }

  async declineSession(id: string, currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const session = await this.prisma.telecareSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Telecare session not found');
    if (session.providerId !== currentUser.providerId)
      throw new ForbiddenException('Session not assigned to you');
    if (session.status !== SessionStatus.waiting)
      throw new BadRequestException('Session is not in waiting state');

    return this.prisma.telecareSession.update({
      where: { id },
      data: { status: SessionStatus.cancelled },
    });
  }

  async transferSession(id: string, dto: TransferSessionDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);
    const session = await this.prisma.telecareSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Telecare session not found');

    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    if (!isAdmin && session.providerId !== currentUser.providerId) {
      throw new ForbiddenException('Session not assigned to you');
    }

    if (!['active', 'in_progress'].includes(session.status))
      throw new BadRequestException('Only active sessions can be transferred');

    const targetProvider = await this.prisma.provider.findUnique({
      where: { id: dto.toProviderId },
      select: { id: true },
    });
    if (!targetProvider) throw new NotFoundException('Target provider not found');

    return this.prisma.telecareSession.update({
      where: { id },
      data: {
        providerId: dto.toProviderId,
        status: SessionStatus.waiting,
        startedAt: null,
      },
    });
  }

  async listShifts(currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    return this.prisma.providerAvailability.findMany({
      where: { providerId: currentUser.providerId, isTelecare: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createShift(dto: CreateShiftDto, currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const toTime = (t: string) => new Date(`1970-01-01T${t}:00.000Z`);
    return this.prisma.providerAvailability.create({
      data: {
        providerId: currentUser.providerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: toTime(dto.startTime),
        endTime: toTime(dto.endTime),
        isTelecare: dto.isTelecare ?? true,
      },
    });
  }

  async deleteShift(id: string, currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const shift = await this.prisma.providerAvailability.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.providerId !== currentUser.providerId)
      throw new ForbiddenException('Not your shift');
    return this.prisma.providerAvailability.delete({ where: { id } });
  }

  async getAvailableProviders() {
    return this.prisma.provider.findMany({
      where: { isAvailable: true, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, title: true, specialty: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const session = await this.prisma.telecareSession.findUnique({
      where: { id },
      include: {
        notes: true,
        patient: { select: { userId: true } },
      },
    });

    if (!session) throw new NotFoundException('Telecare session not found');
    this.assertAccess(session, currentUser);

    return session;
  }

  async updateSession(id: string, dto: UpdateSessionDto, currentUser: JwtPayload) {
    const session = await this.prisma.telecareSession.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });
    if (!session) throw new NotFoundException('Telecare session not found');

    // Patients may end *their own* session (so a tab close / hang up advances
    // state without a provider needing to act), but cannot rewrite arbitrary
    // fields. Provider, admin, super_admin, coordinator keep full update
    // rights as before.
    const adminRoles: UserRole[] = [
      UserRole.provider,
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    const isOwningPatient =
      currentUser.role === UserRole.patient && session.patient?.userId === currentUser.sub;

    if (!isAdmin && !isOwningPatient) {
      throw new ForbiddenException('Access denied');
    }

    if (isOwningPatient) {
      // Whitelist for patient-initiated updates: only the disconnect signal.
      const onlyCompletion =
        dto.status === SessionStatus.completed &&
        !dto.startedAt &&
        !dto.recordingUrl;
      if (!onlyCompletion) {
        throw new ForbiddenException('Patients may only mark a session completed');
      }
      // A hang-up only completes a call that actually started. If the patient
      // joined the room early (provider not there yet) and left again, the
      // session must stay scheduled/waiting — otherwise peeking into the room
      // silently kills the booking.
      if (session.status !== SessionStatus.active) {
        return session;
      }
    }

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.startedAt) data.startedAt = new Date(dto.startedAt);
    if (dto.endedAt) {
      data.endedAt = new Date(dto.endedAt);
      if (session.startedAt) {
        data.durationSeconds = Math.floor(
          (new Date(dto.endedAt).getTime() - session.startedAt.getTime()) / 1000,
        );
      }
    }
    if (dto.recordingUrl) data.recordingUrl = dto.recordingUrl;

    return this.prisma.telecareSession.update({ where: { id }, data });
  }

  // ── LiveKit webhook ──────────────────────────────────────────────────────
  //
  // LiveKit POSTs JSON events signed with our API key/secret. The SDK's
  // WebhookReceiver verifies the JWT Authorization header against the body
  // (anything tampered with rejects). On `room_finished` we mark the
  // session completed so disconnects/crashes/tab closes all converge to the
  // same end state without a client-side PATCH.

  async handleLivekitWebhook(rawBody: Buffer, authHeader: string | undefined) {
    if (!authHeader) {
      throw new ForbiddenException('Missing LiveKit signature');
    }

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit credentials are not fully configured on the server');
    }

    const receiver = new WebhookReceiver(apiKey, apiSecret);
    let event: Awaited<ReturnType<typeof receiver.receive>>;
    try {
      event = await receiver.receive(rawBody.toString('utf8'), authHeader);
    } catch (err) {
      this.logger.warn(`LiveKit webhook signature rejected: ${(err as Error).message}`);
      throw new ForbiddenException('Invalid LiveKit signature');
    }

    if (event.event !== 'room_finished' || !event.room?.name) {
      // We only care about end-of-call. Other events (participant_joined,
      // egress_*, etc.) are no-ops for state.
      return { received: true, handled: false };
    }

    const sessionId = this.parseSessionIdFromRoom(event.room.name);
    if (!sessionId) return { received: true, handled: false };

    const session = await this.prisma.telecareSession.findUnique({ where: { id: sessionId } });
    if (!session) return { received: true, handled: false };

    // Idempotency: webhook may retry; if we've already moved past active, no-op.
    if (session.status !== SessionStatus.active && session.status !== SessionStatus.waiting) {
      return { received: true, handled: false };
    }

    const endedAt = new Date();
    const durationSeconds = session.startedAt
      ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : undefined;

    await this.prisma.telecareSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.completed,
        endedAt,
        ...(durationSeconds !== undefined && { durationSeconds }),
      },
    });

    this.logger.log(`LiveKit closed session ${sessionId} (room ${event.room.name})`);
    return { received: true, handled: true };
  }

  // Room names are minted in getLivekitToken as `telecare-{sessionId}`.
  private parseSessionIdFromRoom(roomName: string): string | null {
    const match = roomName.match(/^telecare-([0-9a-f-]{36})$/i);
    return match ? match[1] : null;
  }

  // ── Stale-session sweeper (called from BullProcessor every 30 min) ───────
  //
  // Safety net for the cases the webhook misses (e.g. LiveKit downtime, dev
  // environments without webhook configured, a participant_left storm with
  // no room_finished). Any session still 'active' more than 2 hours after
  // startedAt is marked completed with a best-effort duration.

  async sweepStaleActiveSessions() {
    const cutoff = new Date(Date.now() - STALE_ACTIVE_THRESHOLD_MIN * 60_000);
    const stale = await this.prisma.telecareSession.findMany({
      where: { status: SessionStatus.active, startedAt: { lt: cutoff } },
      select: { id: true, startedAt: true },
      take: 100,
    });

    if (stale.length === 0) {
      return { closed: 0 };
    }

    let closed = 0;
    for (const s of stale) {
      const startedAt = s.startedAt ?? cutoff;
      const endedAt = new Date(startedAt.getTime() + SWEEP_DEFAULT_DURATION_MIN * 60_000);
      try {
        await this.prisma.telecareSession.update({
          where: { id: s.id },
          data: {
            status: SessionStatus.completed,
            endedAt,
            durationSeconds: SWEEP_DEFAULT_DURATION_MIN * 60,
          },
        });
        closed++;
      } catch (err) {
        this.logger.error(
          `Sweep failed to close session ${s.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Sweep closed ${closed}/${stale.length} stale active session(s)`);
    return { closed };
  }

  async createNote(dto: CreateSessionNoteDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const session = await this.prisma.telecareSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Telecare session not found');

    // Schema note model is SOAP-lite: chiefComplaint / assessment / plan.
    // Objective findings and follow-up instructions are folded into the
    // nearest matching field so no clinical text is dropped.
    const assessment =
      [dto.objectiveNotes, dto.assessment].filter(Boolean).join('\n\n') || undefined;
    const plan =
      [dto.plan, dto.followUpInstructions].filter(Boolean).join('\n\n') || undefined;

    return this.prisma.telecareSessionNote.create({
      data: {
        sessionId: dto.sessionId,
        chiefComplaint: dto.subjectiveNotes,
        assessment,
        plan,
      },
    });
  }

  async setAvailability(isAvailable: boolean, currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    return this.prisma.provider.update({
      where: { id: currentUser.providerId },
      data: { isAvailable },
      select: { id: true, isAvailable: true },
    });
  }

  async getAvailability(currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const provider = await this.prisma.provider.findUnique({
      where: { id: currentUser.providerId },
      select: { id: true, isAvailable: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider;
  }

  async getProviderMetrics(currentUser: JwtPayload) {
    if (!currentUser.providerId) throw new ForbiddenException('Provider access required');
    const providerId = currentUser.providerId;

    const [total, completed, missed, cancelled] = await Promise.all([
      this.prisma.telecareSession.count({ where: { providerId } }),
      this.prisma.telecareSession.count({ where: { providerId, status: SessionStatus.completed } }),
      this.prisma.telecareSession.count({ where: { providerId, status: SessionStatus.missed } }),
      this.prisma.telecareSession.count({ where: { providerId, status: SessionStatus.cancelled } }),
    ]);

    const durations = await this.prisma.telecareSession.findMany({
      where: { providerId, status: SessionStatus.completed, durationSeconds: { not: null } },
      select: { durationSeconds: true },
    });
    const avgDurationSeconds = durations.length
      ? Math.round(durations.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / durations.length)
      : null;

    return { total, completed, missed, cancelled, avgDurationSeconds };
  }

  private assertAccess(
    session: { patient?: { userId?: string } | null; providerId?: string },
    currentUser: JwtPayload,
  ) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    if (adminRoles.includes(currentUser.role as UserRole)) return;

    const isPatient = session.patient?.userId === currentUser.sub;
    const isProvider = session.providerId === currentUser.providerId;
    if (!isPatient && !isProvider) throw new ForbiddenException('Access denied');
  }

  private requireProviderOrAdmin(user: JwtPayload) {
    const allowed: UserRole[] = [
      UserRole.provider,
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Provider or admin access required');
    }
  }
}
