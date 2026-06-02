import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  CreateTelecareSessionDto,
  UpdateSessionDto,
  CreateSessionNoteDto,
} from './dto/create-session.dto';

@Injectable()
export class TelecareService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreateTelecareSessionDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, patientId: true, providerId: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return this.prisma.telecareSession.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        videoRoomSid: dto.videoRoomSid,
        videoProvider: dto.videoProvider ?? 'daily',
      },
    });
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
      orderBy: { createdAt: 'desc' },
      include: { notes: true },
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

    return this.prisma.telecareNote.create({
      data: {
        sessionId: dto.sessionId,
        providerId: currentUser.providerId!,
        subjectiveNotes: dto.subjectiveNotes,
        objectiveNotes: dto.objectiveNotes,
        assessment: dto.assessment,
        plan: dto.plan,
        followUpInstructions: dto.followUpInstructions,
      },
    });
  }

  private assertAccess(
    session: { patient?: { userId?: string } | null; providerId?: string },
    currentUser: JwtPayload,
  ) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (isAdmin) return;

    const isPatient = session.patient?.userId === currentUser.sub;
    const isProvider = session.providerId === currentUser.providerId;
    if (!isPatient && !isProvider) throw new ForbiddenException('Access denied');
  }

  private requireProviderOrAdmin(user: JwtPayload) {
    const allowed = [
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
