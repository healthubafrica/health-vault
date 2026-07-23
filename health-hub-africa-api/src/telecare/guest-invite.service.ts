import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { SessionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createRedisClient } from '../common/redis/redis.factory';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateGuestInviteDto } from './dto/guest-invite.dto';
import { getLivekitCredentials, mintLivekitToken } from './livekit-token.util';
import { buildProviderDisplayName } from '../common/utils/provider-name.util';

// notification_deliveries.userId is a non-nullable @db.Uuid with no FK
// constraint — a guest has no User row, so attribute the delivery to the
// inviting patient's account (mirrors SharesService's fallback for the
// unreachable case where even that lookup fails).
const SYSTEM_USER_ID_FALLBACK = '00000000-0000-0000-0000-000000000000';

const JOINABLE_STATUSES: SessionStatus[] = [
  SessionStatus.scheduled,
  SessionStatus.waiting,
  SessionStatus.active,
];
// Guests can join up to 15 minutes before the scheduled time — same early
// window a patient/provider would reasonably show up in.
const JOIN_WINDOW_EARLY_MS = 15 * 60 * 1000;
const OTP_TTL_SECONDS = 600;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class GuestInviteService {
  private readonly logger = new Logger(GuestInviteService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.redis = createRedisClient(config);
  }

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  private otpKey(inviteId: string): string {
    return `telecare-guest:otp:${inviteId}`;
  }

  private isJoinWindowOpen(session: { status: SessionStatus; scheduledAt: Date }): boolean {
    if (!JOINABLE_STATUSES.includes(session.status)) return false;
    return Date.now() >= session.scheduledAt.getTime() - JOIN_WINDOW_EARLY_MS;
  }

  // ── Patient-facing management (owning patient only) ────────────────────────

  private async requireOwningPatientSession(sessionId: string, currentUser: JwtPayload) {
    const session = await this.prisma.telecareSession.findUnique({
      where: { id: sessionId },
      include: { patient: { select: { userId: true, firstName: true } } },
    });
    if (!session) throw new NotFoundException('Telecare session not found');

    const isOwningPatient =
      currentUser.role === UserRole.patient && session.patient?.userId === currentUser.sub;
    if (!isOwningPatient) throw new ForbiddenException('Access denied');

    return session;
  }

  async createInvite(sessionId: string, dto: CreateGuestInviteDto, currentUser: JwtPayload) {
    const session = await this.requireOwningPatientSession(sessionId, currentUser);

    if (!JOINABLE_STATUSES.includes(session.status)) {
      throw new BadRequestException('This session can no longer receive guest invites');
    }

    const guestEmail = dto.guestEmail.toLowerCase().trim();
    const guestName = dto.guestName.trim();
    const { raw, hash } = this.generateToken();

    const invite = await this.prisma.telecareGuestInvite.create({
      data: { sessionId, guestName, guestEmail, tokenHash: hash },
    });

    const portalUrl = (this.config.get<string>('FRONTEND_URL') ?? 'https://portal.myvaultplus.com').replace(/\/$/, '');
    const joinUrl = `${portalUrl}/telecare-guest/${raw}`;

    await this.notifications.sendGuestCallInviteEmail(
      guestEmail,
      session.patient?.userId ?? SYSTEM_USER_ID_FALLBACK,
      {
        guestName,
        patientName: session.patient?.firstName ?? 'A Health Hub Africa patient',
        scheduledAt: session.scheduledAt,
        joinUrl,
      },
    );

    return {
      id: invite.id,
      guestName: invite.guestName,
      guestEmail: invite.guestEmail,
      isRevoked: invite.isRevoked,
      verifiedAt: invite.verifiedAt,
      createdAt: invite.createdAt,
    };
  }

  async listInvites(sessionId: string, currentUser: JwtPayload) {
    await this.requireOwningPatientSession(sessionId, currentUser);
    return this.prisma.telecareGuestInvite.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        isRevoked: true,
        verifiedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeInvite(sessionId: string, inviteId: string, currentUser: JwtPayload) {
    await this.requireOwningPatientSession(sessionId, currentUser);
    const invite = await this.prisma.telecareGuestInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.sessionId !== sessionId) throw new NotFoundException('Guest invite not found');

    return this.prisma.telecareGuestInvite.update({
      where: { id: inviteId },
      data: { isRevoked: true },
    });
  }

  // ── Public guest flow (unauthenticated — token in URL) ──────────────────────

  private async resolveInvite(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invite = await this.prisma.telecareGuestInvite.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            patient: { select: { firstName: true, userId: true } },
            provider: { select: { firstName: true, lastName: true, title: true } },
          },
        },
      },
    });
    if (!invite) throw new NotFoundException('Invite link not found');
    if (invite.isRevoked) throw new ForbiddenException('This invite has been revoked');
    return invite;
  }

  async getPublicInfo(rawToken: string) {
    const invite = await this.resolveInvite(rawToken);
    return {
      guestName: invite.guestName,
      patientFirstName: invite.session.patient?.firstName ?? 'the patient',
      providerName: invite.session.provider ? buildProviderDisplayName(invite.session.provider) : null,
      scheduledAt: invite.session.scheduledAt,
      sessionStatus: invite.session.status,
      canJoin: this.isJoinWindowOpen(invite.session),
    };
  }

  async requestOtp(rawToken: string) {
    const invite = await this.resolveInvite(rawToken);
    if (!this.isJoinWindowOpen(invite.session)) {
      throw new BadRequestException('This call is not open for guests yet');
    }

    const key = this.otpKey(invite.id);
    const existing = await this.redis.get(key);
    if (existing) {
      const data = JSON.parse(existing) as { attempts: number };
      if (data.attempts >= MAX_OTP_ATTEMPTS) {
        throw new ForbiddenException('Too many attempts. Try again later.');
      }
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    await this.redis.setex(key, OTP_TTL_SECONDS, JSON.stringify({ codeHash, attempts: 0 }));

    await this.notifications.sendGuestOtpEmail(
      invite.guestEmail,
      invite.session.patient?.userId ?? SYSTEM_USER_ID_FALLBACK,
      invite.guestName,
      code,
    );

    return { ok: true };
  }

  async verifyOtp(rawToken: string, code: string) {
    const invite = await this.resolveInvite(rawToken);
    if (!this.isJoinWindowOpen(invite.session)) {
      throw new BadRequestException('This call is not open for guests yet');
    }

    const key = this.otpKey(invite.id);
    const raw = await this.redis.get(key);
    if (!raw) throw new UnauthorizedException('Code expired. Please request a new one.');

    const data = JSON.parse(raw) as { codeHash: string; attempts: number };
    if (data.attempts >= MAX_OTP_ATTEMPTS) {
      await this.redis.del(key);
      throw new ForbiddenException('Too many failed attempts. Request a new code.');
    }

    const valid = await bcrypt.compare(code, data.codeHash);
    if (!valid) {
      await this.redis.set(key, JSON.stringify({ ...data, attempts: data.attempts + 1 }), 'KEEPTTL');
      throw new UnauthorizedException('Invalid code');
    }

    await this.redis.del(key);
    await this.prisma.telecareGuestInvite.update({
      where: { id: invite.id },
      data: { verifiedAt: new Date() },
    });

    const creds = getLivekitCredentials(this.config);
    const livekit = await mintLivekitToken(creds, {
      identity: `guest-${invite.id}`,
      name: invite.guestName,
      roomName: `telecare-${invite.sessionId}`,
      metadata: JSON.stringify({ role: 'guest' }),
    });

    return { ...livekit, guestName: invite.guestName };
  }
}
