import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  // ── Registration ─────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // SEC-001: role is always forced to 'patient' on self-registration.
    // Admin and provider roles are assigned by existing admins only.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: UserRole.patient,
      },
      select: { id: true, email: true, role: true },
    });

    await this.sendEmailOtp(user.email, user.id, 'email');

    return { message: 'Registration successful. Check your email for OTP.' };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        patient: { select: { id: true } },
        provider: { select: { id: true } },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Email not verified. Request a new OTP.',
      );
    }

    const tokens = await this.issueTokens(
      { sub: user.id, email: user.email, role: user.role, patientId: user.patient?.id, providerId: user.provider?.id },
      ipAddress,
      userAgent,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return tokens;
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(
    payload: JwtPayload & { sessionId: string; refreshToken: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Revoke old session (rotation)
    await this.prisma.userSession.update({
      where: { id: payload.sessionId },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { sub: payload.sub, email: payload.email, role: payload.role, patientId: payload.patientId, providerId: payload.providerId },
      ipAddress,
      userAgent,
    );
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(sessionId: string) {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'All sessions terminated' };
  }

  // ── OTP ───────────────────────────────────────────────────────────────────

  async verifyEmailOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    // SEC-013: tokens are stored as bcrypt hashes; fetch the latest unused one
    // and compare with bcrypt rather than a direct equality check.
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'email',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const valid = token ? await bcrypt.compare(otp, token.token) : false;
    if (!token || !valid) throw new BadRequestException('Invalid or expired OTP');

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    // Issue tokens on successful verification so the client is logged in immediately
    return this.issueTokens({ sub: user.id, email: user.email, role: user.role });
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (user) await this.sendEmailOtp(email, user.id, 'password_reset');
    return { message: 'If the email exists, a reset OTP has been sent.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Invalid request');

    // SEC-013: compare against bcrypt hash stored at OTP creation time
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const valid = token ? await bcrypt.compare(otp, token.token) : false;
    if (!token || !valid) throw new BadRequestException('Invalid or expired OTP');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // Revoke all sessions on password reset
      this.prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  // ── Change Password (authenticated) ──────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke all other sessions on password change
      this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated. All other sessions have been signed out.' };
  }

  // ── Two-Factor Authentication ─────────────────────────────────────────────

  async toggle2fa(userId: string, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });
    return { twoFactorEnabled: enabled, message: enabled ? '2FA enabled.' : '2FA disabled.' };
  }

  async get2faStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { twoFactorEnabled: user.twoFactorEnabled };
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return sessions;
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, revokedAt: true },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    if (session.revokedAt) {
      throw new BadRequestException('Session is already revoked');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Session revoked' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async issueTokens(
    payload: JwtPayload,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get<number>('JWT_EXPIRY', 900),
    });

    const refreshPayload = { sub: payload.sub, email: payload.email };
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<number>('JWT_REFRESH_EXPIRY', 604800),
    });

    const expiresAt = new Date(
      Date.now() +
        (this.config.get<number>('JWT_REFRESH_EXPIRY', 604800) * 1000),
    );

    await this.prisma.userSession.create({
      data: {
        userId: payload.sub,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('JWT_EXPIRY', 900),
    };
  }

  private async sendEmailOtp(
    email: string,
    userId: string,
    type: 'email' | 'password_reset',
  ) {
    await this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const otp = randomInt(100000, 999999).toString();

    // SEC-013: store a bcrypt hash of the OTP so a DB compromise cannot be
    // used to harvest valid codes. Verification uses bcrypt.compare().
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: otpHash,
        type,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    const subject =
      type === 'password_reset'
        ? 'MyHealth Vault+™ — Password Reset OTP'
        : 'MyHealth Vault+™ — Verify Your Email';

    const body =
      type === 'password_reset'
        ? `Your password reset OTP is: ${otp}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`
        : `Your email verification OTP is: ${otp}\n\nIt expires in 10 minutes.`;

    await this.notifications.sendEmail(email, subject, body, userId);
  }
}
