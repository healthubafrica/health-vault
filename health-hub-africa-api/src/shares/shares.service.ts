import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateShareDto } from './dto/create-share.dto';
import { createRedisClient } from '../common/redis/redis.factory';
import { randomBytes, createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    this.redis = createRedisClient(config);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private fingerprintFromRequest(ip: string, ua: string): string {
    return this.sha256(`${ip}|${ua}`);
  }

  private otpKey(shareId: string, emailHash: string): string {
    return `share:otp:${shareId}:${emailHash}`;
  }

  // ── Patient-facing CRUD ────────────────────────────────────────────────────

  async createShare(dto: CreateShareDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    if (dto.accessMode === 'email_list' && (!dto.allowedEmails?.length)) {
      throw new BadRequestException('allowedEmails is required for email_list mode');
    }
    if (dto.accessMode === 'password' && !dto.password) {
      throw new BadRequestException('password is required for password mode');
    }

    const { raw, hash } = this.generateToken();
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    const share = await this.prisma.recordShare.create({
      data: {
        patientId: patient.id,
        tokenHash: hash,
        label: dto.label,
        accessMode: dto.accessMode as any,
        allowedEmails: dto.allowedEmails ?? [],
        passwordHash,
        recordTypes: dto.recordTypes ?? [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        detectForwarding: dto.detectForwarding ?? false,
      },
    });

    return { id: share.id, token: raw, share };
  }

  async listMyShares(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.recordShare.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        accessMode: true,
        allowedEmails: true,
        recordTypes: true,
        expiresAt: true,
        isRevoked: true,
        revokedAt: true,
        detectForwarding: true,
        createdAt: true,
        _count: { select: { accesses: true } },
      },
    });
  }

  async getShareAudit(shareId: string, currentUser: JwtPayload) {
    const share = await this.assertOwnership(shareId, currentUser);
    const accesses = await this.prisma.recordShareAccess.findMany({
      where: { shareId: share.id },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
    return { share, accesses };
  }

  async revokeShare(shareId: string, currentUser: JwtPayload) {
    const share = await this.assertOwnership(shareId, currentUser);
    if (share.isRevoked) throw new BadRequestException('Already revoked');
    const updated = await this.prisma.recordShare.update({
      where: { id: share.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await this.prisma.recordShareAccess.create({
      data: { shareId: share.id, action: 'revoked' },
    });
    return updated;
  }

  private async assertOwnership(shareId: string, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const share = await this.prisma.recordShare.findUnique({
      where: { id: shareId },
    });
    if (!share || share.patientId !== patient.id)
      throw new NotFoundException('Share not found');
    return share;
  }

  // ── Patient report forwarding (patient-triggered) ─────────────────────────

  async reportForwarding(
    shareId: string,
    suspectedEmail: string | undefined,
    currentUser: JwtPayload,
  ) {
    const share = await this.assertOwnership(shareId, currentUser);
    await this.prisma.recordShareAccess.create({
      data: {
        shareId: share.id,
        action: 'forward_detected',
        visitorEmail: suspectedEmail,
        metadata: { reportedBy: 'patient' },
      },
    });
    return { ok: true };
  }

  // ── Public access (unauthenticated) ───────────────────────────────────────

  private async resolveShare(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const share = await this.prisma.recordShare.findUnique({
      where: { tokenHash },
    });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.isRevoked) throw new ForbiddenException('This link has been revoked');
    if (share.expiresAt && share.expiresAt < new Date())
      throw new ForbiddenException('This link has expired');
    return share;
  }

  async resolvePublicShare(rawToken: string, ip: string, ua: string) {
    const share = await this.resolveShare(rawToken);
    const fingerprint = this.fingerprintFromRequest(ip, ua);

    if (share.accessMode !== 'public') {
      // Return metadata only — caller must complete OTP/password step
      return {
        shareId: share.id,
        accessMode: share.accessMode,
        recordTypes: share.recordTypes,
        requiresAuth: true,
      };
    }

    await this.logAccessAndCheckForwarding(share, 'viewed', undefined, fingerprint, ip, ua);

    return this.buildRecordPayload(share, ip, ua);
  }

  async requestOtp(rawToken: string, email: string, ip: string, ua: string) {
    const share = await this.resolveShare(rawToken);
    if (share.accessMode !== 'email_list')
      throw new BadRequestException('This share does not use email verification');

    const normalEmail = email.toLowerCase().trim();
    if (!share.allowedEmails.map(e => e.toLowerCase()).includes(normalEmail))
      throw new ForbiddenException('Your email is not on the access list for this share');

    const emailHash = this.sha256(normalEmail);
    const key = this.otpKey(share.id, emailHash);
    const existing = await this.redis.get(key);
    if (existing) {
      const data = JSON.parse(existing);
      if (data.attempts >= 5) throw new ForbiddenException('Too many attempts. Try again later.');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.redis.setex(key, 600, JSON.stringify({ code, attempts: 0 }));

    const patient = await this.prisma.patient.findUnique({
      where: { id: share.patientId },
      select: { firstName: true, lastName: true, user: { select: { email: true } } },
    });

    await this.notifications.sendEmail(
      normalEmail,
      'Your Health Hub Africa record access code',
      `Someone shared health records with you via Health Hub Africa.\n\nYour one-time access code is:\n\n${code}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.`,
      patient?.user?.email ?? 'system',
    );

    await this.prisma.recordShareAccess.create({
      data: {
        shareId: share.id,
        action: 'otp_sent',
        visitorEmail: normalEmail,
        ipAddress: ip,
        userAgent: ua,
      },
    });

    return { ok: true };
  }

  async verifyOtp(rawToken: string, email: string, code: string, ip: string, ua: string) {
    const share = await this.resolveShare(rawToken);
    if (share.accessMode !== 'email_list')
      throw new BadRequestException('This share does not use email verification');

    const normalEmail = email.toLowerCase().trim();
    const emailHash = this.sha256(normalEmail);
    const key = this.otpKey(share.id, emailHash);

    const raw = await this.redis.get(key);
    if (!raw) throw new UnauthorizedException('Code expired. Please request a new one.');

    const data = JSON.parse(raw) as { code: string; attempts: number };
    if (data.attempts >= 5) {
      await this.redis.del(key);
      throw new ForbiddenException('Too many failed attempts. Request a new code.');
    }

    if (data.code !== code) {
      await this.redis.set(key, JSON.stringify({ ...data, attempts: data.attempts + 1 }), 'KEEPTTL');
      await this.prisma.recordShareAccess.create({
        data: {
          shareId: share.id,
          action: 'otp_failed',
          visitorEmail: normalEmail,
          ipAddress: ip,
          userAgent: ua,
        },
      });
      throw new UnauthorizedException('Invalid code');
    }

    await this.redis.del(key);
    const fingerprint = this.fingerprintAndScheduleForwardCheck(share, normalEmail, ip, ua);
    await this.logAccessAndCheckForwarding(share, 'otp_verified', normalEmail, fingerprint, ip, ua);

    return this.buildRecordPayload(share, ip, ua);
  }

  async verifyPassword(rawToken: string, password: string, ip: string, ua: string) {
    const share = await this.resolveShare(rawToken);
    if (share.accessMode !== 'password')
      throw new BadRequestException('This share does not use password access');
    if (!share.passwordHash) throw new ForbiddenException('Share misconfigured');

    const valid = await bcrypt.compare(password, share.passwordHash);
    if (!valid) {
      await this.prisma.recordShareAccess.create({
        data: {
          shareId: share.id,
          action: 'otp_failed', // reuse — means "auth failed"
          ipAddress: ip,
          userAgent: ua,
        },
      });
      throw new UnauthorizedException('Incorrect password');
    }

    const fingerprint = this.fingerprintFromRequest(ip, ua);
    await this.logAccessAndCheckForwarding(share, 'viewed', undefined, fingerprint, ip, ua);
    return this.buildRecordPayload(share, ip, ua);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private fingerprintAndScheduleForwardCheck(
    share: any,
    email: string,
    ip: string,
    ua: string,
  ): string {
    const fingerprint = this.fingerprintFromRequest(ip, ua);
    if (share.detectForwarding) {
      void this.checkEmailSessionForwarding(share, email, fingerprint, ip, ua);
    }
    return fingerprint;
  }

  private async checkEmailSessionForwarding(
    share: any,
    email: string,
    fingerprint: string,
    ip: string,
    ua: string,
  ) {
    // Look at previous otp_verified events for this email on this share
    const prev = await this.prisma.recordShareAccess.findFirst({
      where: {
        shareId: share.id,
        action: 'otp_verified',
        visitorEmail: email.toLowerCase(),
        sessionFingerprint: { not: null },
      },
      orderBy: { occurredAt: 'asc' },
    });

    if (prev && prev.sessionFingerprint !== fingerprint) {
      // Different fingerprint — potential forward
      this.logger.warn(
        `forward_detected on share ${share.id} for email ${email}: prev fp ${prev.sessionFingerprint?.slice(0, 8)} → new fp ${fingerprint.slice(0, 8)}`,
      );
      await this.prisma.recordShareAccess.create({
        data: {
          shareId: share.id,
          action: 'forward_detected',
          visitorEmail: email,
          sessionFingerprint: fingerprint,
          ipAddress: ip,
          userAgent: ua,
          metadata: { previousFingerprint: prev.sessionFingerprint },
        },
      });

      // Notify the share owner
      const patient = await this.prisma.patient.findUnique({
        where: { id: share.patientId },
        select: { firstName: true, user: { select: { email: true } } },
      });
      if (patient?.user?.email) {
        await this.notifications.sendEmail(
          patient.user.email,
          'Health Hub Africa: Potential share forwarding detected',
          `Hi ${patient.firstName},\n\nYour shared health record link (${share.label ?? 'Unnamed share'}) was accessed by ${email} from a new device/location — this may indicate the link was forwarded.\n\nIf you did not expect this, you can revoke the link in your Health Hub Africa portal.\n\nThis is an automated security notice.`,
          patient.user.email,
        );
      }
    }
  }

  private async logAccessAndCheckForwarding(
    share: any,
    action: 'viewed' | 'otp_verified',
    email: string | undefined,
    fingerprint: string,
    ip: string,
    ua: string,
  ) {
    await this.prisma.recordShareAccess.create({
      data: {
        shareId: share.id,
        action,
        visitorEmail: email,
        sessionFingerprint: fingerprint,
        ipAddress: ip,
        userAgent: ua,
      },
    });

    if (share.detectForwarding && share.accessMode === 'public') {
      // For public shares: notify if > 10 unique fingerprints in the last hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await this.prisma.recordShareAccess.groupBy({
        by: ['sessionFingerprint'],
        where: {
          shareId: share.id,
          action: 'viewed',
          occurredAt: { gte: hourAgo },
          sessionFingerprint: { not: null },
        },
        _count: true,
      });
      if (recentCount.length > 10) {
        void this.notifyHighViralReach(share, recentCount.length);
      }
    }
  }

  private async notifyHighViralReach(share: any, uniqueCount: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: share.patientId },
      select: { firstName: true, user: { select: { email: true } } },
    });
    if (!patient?.user?.email) return;
    await this.notifications.sendEmail(
      patient.user.email,
      'Health Hub Africa: Your shared link is getting wide reach',
      `Hi ${patient.firstName},\n\nYour shared health record link (${share.label ?? 'Unnamed share'}) has been accessed from ${uniqueCount} different devices in the past hour. If this is unexpected, you can revoke the link in your portal.\n\nThis is an automated security notice.`,
      patient.user.email,
    );
  }

  private async buildRecordPayload(share: any, _ip: string, _ua: string) {
    const where: any = { patientId: share.patientId, deletedAt: null };
    if (share.recordTypes.length > 0) {
      where.recordType = { in: share.recordTypes };
    }

    const records = await this.prisma.clinicalRecord.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      select: {
        id: true,
        hhaRef: true,
        recordType: true,
        title: true,
        description: true,
        recordedAt: true,
        fileUrl: true,
        fileMimeType: true,
        isDownloadable: true,
        provider: {
          select: { firstName: true, lastName: true, title: true, specialty: true },
        },
      },
    });

    const patient = await this.prisma.patient.findUnique({
      where: { id: share.patientId },
      select: { firstName: true, lastName: true },
    });

    return {
      shareId: share.id,
      patientName: `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim(),
      recordTypes: share.recordTypes,
      expiresAt: share.expiresAt,
      records,
    };
  }
}
