import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  CreateTelecareSessionDto,
  UpdateSessionDto,
  CreateSessionNoteDto,
} from './dto/create-session.dto';

@Injectable()
export class TelecareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async findSessions(currentUser: JwtPayload) {
    const where: any = {};

    if (currentUser.patientId) {
      where.patientId = currentUser.patientId;
    } else if (currentUser.providerId) {
      where.providerId = currentUser.providerId;
    } else {
      this.requireProviderOrAdmin(currentUser);
    }

    return this.prisma.telecareSession.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        notes: true,
        patient: { select: { firstName: true, lastName: true } },
        provider: { select: { firstName: true, lastName: true, title: true } },
      },
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
    this.requireProviderOrAdmin(currentUser);

    const session = await this.prisma.telecareSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Telecare session not found');

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
