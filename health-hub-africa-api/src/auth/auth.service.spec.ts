import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenemrService } from '../openemr/openemr.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AcquisitionSource, RegisterDto } from './dto/register.dto';

// No AuthService spec existed before this file — scope here is intentionally
// narrow: only the authoritative registration_complete/otp_verify_success
// server events (spec §23) added alongside the analytics event-schema work.
// This is not comprehensive AuthService coverage (lockout, 2FA, password
// reset, etc. are untested); a full spec is a separate, larger undertaking.

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  verificationToken: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }), update: jest.fn() },
  notificationPreference: { upsert: jest.fn() },
  userSession: { create: jest.fn().mockResolvedValue({ id: 'session-1' }) },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  $executeRaw: jest.fn().mockResolvedValue(undefined),
};

const mockJwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
const mockConfig = { get: jest.fn(), getOrThrow: jest.fn().mockReturnValue('secret') };
const mockNotifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
const mockOpenemrService = {};
const mockAnalyticsService = { emitServerEvent: jest.fn().mockResolvedValue(undefined) };

const registerDto: RegisterDto = {
  email: 'new@test.com',
  password: 'Sup3r$ecretPass!',
  acquisitionSource: AcquisitionSource.social_media,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: OpenemrService, useValue: mockOpenemrService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockPrisma.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  describe('register — new account', () => {
    it('emits registration_complete with the client-supplied anonymousVisitorId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no existing email/phone
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: registerDto.email, role: UserRole.patient });

      await service.register(registerDto, { anonymousVisitorId: 'anon-1' });

      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'registration_complete',
        expect.objectContaining({
          anonymousVisitorId: 'anon-1',
          properties: expect.objectContaining({ acquisitionSource: registerDto.acquisitionSource }),
        }),
      );
    });

    it('does not throw when no anonymousVisitorId is supplied (older client build)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: registerDto.email, role: UserRole.patient });

      await expect(service.register(registerDto, {})).resolves.toBeDefined();
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'registration_complete',
        expect.objectContaining({ anonymousVisitorId: undefined }),
      );
    });
  });

  describe('register — resend to an existing unverified account', () => {
    it('also emits registration_complete, matching what the client-side event already counts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: registerDto.email, isVerified: false });

      await service.register(registerDto, { anonymousVisitorId: 'anon-2' });

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'registration_complete',
        expect.objectContaining({ anonymousVisitorId: 'anon-2' }),
      );
    });
  });

  describe('verifyEmailOtp', () => {
    it('emits otp_verify_success alongside the existing login_success event', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', email: 'a@test.com', role: UserRole.patient });
      mockPrisma.verificationToken.findFirst.mockResolvedValue({ id: 'tok-1', token: 'hashed', expiresAt: new Date(Date.now() + 60_000) });

      await service.verifyEmailOtp('a@test.com', '123456', { anonymousVisitorId: 'anon-3' });

      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'otp_verify_success',
        expect.objectContaining({ userId: 'user-3', anonymousVisitorId: 'anon-3' }),
      );
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith(
        'login_success',
        expect.objectContaining({ userId: 'user-3' }),
      );
    });

    it('emits nothing when the OTP is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-4', email: 'b@test.com' });
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmailOtp('b@test.com', '000000', {})).rejects.toThrow();
      expect(mockAnalyticsService.emitServerEvent).not.toHaveBeenCalled();
    });
  });
});
