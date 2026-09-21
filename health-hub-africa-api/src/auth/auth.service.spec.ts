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

// Started narrow (only the registration_complete/otp_verify_success server
// events, spec §23) and grew into the first real coverage of AuthService's
// security-sensitive paths: login + account lockout, 2FA, password reset/
// change, session revocation, profile-photo precedence. Deliberately still
// not "every branch of every method" — getSessions/getNotificationPrefs/
// updateNotificationPrefs are simple upsert/list pass-throughs with no
// conditional logic worth a dedicated test.

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  verificationToken: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }), update: jest.fn() },
  notificationPreference: { upsert: jest.fn() },
  userSession: {
    create: jest.fn().mockResolvedValue({ id: 'session-1' }),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  patient: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  provider: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
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

  describe('login', () => {
    const baseUser = {
      id: 'user-5',
      email: 'login@test.com',
      passwordHash: 'hashed',
      isActive: true,
      deletedAt: null,
      lockedUntil: null,
      isVerified: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      role: UserRole.patient,
      patient: { id: 'patient-5' },
      provider: null,
    };

    it('issues tokens, resets the failed-login counter, and records login_success on a correct password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser });

      const result = await service.login({ email: baseUser.email, password: 'correct' }, {});

      expect(result).toEqual(expect.objectContaining({ accessToken: expect.any(String), refreshToken: expect.any(String) }));
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }) }),
      );
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith('login_success', expect.objectContaining({ userId: baseUser.id }));
    });

    it('rejects an unknown email with the generic message (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@test.com', password: 'x' }, {})).rejects.toThrow('Invalid credentials');
    });

    it('rejects a deactivated or soft-deleted account with the same generic message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });
      await expect(service.login({ email: baseUser.email, password: 'x' }, {})).rejects.toThrow('Invalid credentials');
    });

    it('rejects silently while locked, without even attempting a password compare', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, lockedUntil: new Date(Date.now() + 60_000) });

      await expect(service.login({ email: baseUser.email, password: 'anything' }, {})).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('increments the failed-login counter and records login_failure on a wrong password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 3 });

      await expect(service.login({ email: baseUser.email, password: 'wrong' }, {})).rejects.toThrow('Invalid credentials');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 4, lockedUntil: undefined }) }),
      );
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith('login_failure', expect.objectContaining({ userId: baseUser.id }));
    });

    it('locks the account once the failure count reaches the threshold', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, failedLoginAttempts: 9 }); // MAX_FAILED_LOGINS = 10

      await expect(service.login({ email: baseUser.email, password: 'wrong' }, {})).rejects.toThrow();

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 10, lockedUntil: expect.any(Date) }) }),
      );
    });

    it('rejects an unverified account with a distinct, actionable message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isVerified: false });
      await expect(service.login({ email: baseUser.email, password: 'correct' }, {})).rejects.toThrow('Email not verified');
    });

    it('sends a 2FA code and defers token issuance instead of logging in directly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, twoFactorEnabled: true });

      const result = await service.login({ email: baseUser.email, password: 'correct' }, {});

      expect(result).toEqual({ requiresTwoFactor: true, userId: baseUser.id });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
      expect(mockPrisma.userSession.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('revokes the presented session and issues a fresh token pair (rotation)', async () => {
      const payload = { sub: 'user-6', email: 'r@test.com', role: UserRole.patient, sessionId: 'old-session', refreshToken: 'rt' } as any;

      await service.refresh(payload, '1.2.3.4', 'UA');

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'old-session' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrisma.userSession.create).toHaveBeenCalled(); // the new session from issueTokens
    });
  });

  describe('logout / logoutAll', () => {
    it('logout revokes exactly the presented session', async () => {
      await service.logout('session-7');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 'session-7' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('logoutAll revokes every still-active session for the user, not a specific one', async () => {
      await service.logoutAll('user-7');
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-7', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('requestPasswordReset (email enumeration protection)', () => {
    it('sends an OTP and still returns the generic message when the account exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-8', email: 'exists@test.com', role: UserRole.patient });

      const result = await service.requestPasswordReset('exists@test.com');

      expect(result.message).toBe('If the email exists, a reset OTP has been sent.');
      expect(mockNotifications.sendEmail).toHaveBeenCalled();
    });

    it('returns the exact same message and sends nothing when the account does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@test.com');

      expect(result.message).toBe('If the email exists, a reset OTP has been sent.');
      expect(mockNotifications.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates the password, clears any lockout, and revokes every active session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-9', email: 'x@test.com' });
      mockPrisma.verificationToken.findFirst.mockResolvedValue({ id: 'tok-9', token: 'hashed', expiresAt: new Date(Date.now() + 60_000) });

      const result = await service.resetPassword('x@test.com', '123456', 'NewPass1!');

      expect(result.message).toBe('Password reset successful');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null }) }),
      );
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-9', revokedAt: null } }),
      );
    });

    it('rejects an expired/invalid OTP without touching the password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-10', email: 'y@test.com' });
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('y@test.com', '000000', 'NewPass1!')).rejects.toThrow('Invalid or expired OTP');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects for an unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('nobody@test.com', '123456', 'NewPass1!')).rejects.toThrow('Invalid request');
    });
  });

  describe('changePassword (authenticated)', () => {
    it('updates the password and revokes every other active session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-11', passwordHash: 'hashed' });

      const result = await service.changePassword('user-11', 'OldPass1!', 'NewPass1!');

      expect(result.message).toContain('signed out');
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-11', revokedAt: null } }),
      );
    });

    it('rejects when the current password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-12', passwordHash: 'hashed' });

      await expect(service.changePassword('user-12', 'wrong', 'NewPass1!')).rejects.toThrow('Current password is incorrect');
    });

    it('rejects when the new password is identical to the current one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-13', passwordHash: 'hashed' });
      await expect(service.changePassword('user-13', 'SamePass1!', 'SamePass1!')).rejects.toThrow('must differ');
    });

    it('rejects for a user that no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.changePassword('ghost', 'a', 'b')).rejects.toThrow('User not found');
    });
  });

  describe('2FA toggle + status', () => {
    it('toggle2fa persists the flag and echoes it back', async () => {
      const result = await service.toggle2fa('user-14', true);
      expect(result).toEqual({ twoFactorEnabled: true, message: '2FA enabled.' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-14' }, data: { twoFactorEnabled: true } });
    });

    it('get2faStatus reports the current flag', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ twoFactorEnabled: true });
      await expect(service.get2faStatus('user-15')).resolves.toEqual({ twoFactorEnabled: true });
    });

    it('get2faStatus rejects for a user that no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.get2faStatus('ghost')).rejects.toThrow('User not found');
    });
  });

  describe('verify2fa', () => {
    it('issues tokens and records login_success on a correct code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-16', email: 'v@test.com', role: UserRole.patient, isActive: true, twoFactorEnabled: true,
        patient: { id: 'patient-16' }, provider: null,
      });
      mockPrisma.verificationToken.findFirst.mockResolvedValue({ id: 'tok-16', token: 'hashed', expiresAt: new Date(Date.now() + 60_000) });

      const result = await service.verify2fa('user-16', '123456', {});

      expect(result).toEqual(expect.objectContaining({ accessToken: expect.any(String) }));
      expect(mockAnalyticsService.emitServerEvent).toHaveBeenCalledWith('login_success', expect.objectContaining({ userId: 'user-16' }));
    });

    it('rejects an expired/invalid code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-17', isActive: true, twoFactorEnabled: true });
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verify2fa('user-17', '000000', {})).rejects.toThrow('Invalid or expired code');
    });

    it('rejects when 2FA is not actually enabled on the account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-18', isActive: true, twoFactorEnabled: false });
      await expect(service.verify2fa('user-18', '123456', {})).rejects.toThrow('Invalid request');
    });

    it('rejects for a deactivated account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-19', isActive: false, twoFactorEnabled: true });
      await expect(service.verify2fa('user-19', '123456', {})).rejects.toThrow('Invalid request');
    });
  });

  describe('revokeSession', () => {
    it('revokes a session the caller owns', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 'session-20', userId: 'user-20', revokedAt: null });

      const result = await service.revokeSession('session-20', 'user-20');

      expect(result.message).toBe('Session revoked');
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({ where: { id: 'session-20' }, data: { revokedAt: expect.any(Date) } });
    });

    it("rejects revoking another user's session as not-found, not forbidden (no ownership leak)", async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 'session-21', userId: 'someone-else', revokedAt: null });
      await expect(service.revokeSession('session-21', 'user-21')).rejects.toThrow('Session not found');
    });

    it('rejects revoking a session twice', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({ id: 'session-22', userId: 'user-22', revokedAt: new Date() });
      await expect(service.revokeSession('session-22', 'user-22')).rejects.toThrow('already revoked');
    });

    it('rejects for a session id that does not exist at all', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.revokeSession('nope', 'user-23')).rejects.toThrow('Session not found');
    });
  });

  describe('getUserById (profile photo precedence)', () => {
    it("prefers the patient row's photo over the provider's and the user's own", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-24', email: 'p@test.com', role: UserRole.patient,
        profilePhotoUrl: 'user-level.jpg',
        patient: { profilePhotoUrl: 'patient-level.jpg' },
        provider: { profilePhotoUrl: 'provider-level.jpg' },
      });

      const result = await service.getUserById('user-24');
      expect(result.profilePhotoUrl).toBe('patient-level.jpg');
    });

    it('falls back to the user-level photo when neither role profile has one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-25', email: 'p2@test.com', role: UserRole.patient,
        profilePhotoUrl: 'user-level.jpg', patient: null, provider: null,
      });

      const result = await service.getUserById('user-25');
      expect(result.profilePhotoUrl).toBe('user-level.jpg');
    });

    it('rejects for a user that does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserById('ghost')).rejects.toThrow('User not found');
    });
  });

  describe('setProfilePhoto', () => {
    it('mirrors the photo onto both the patient and provider rows (harmless no-op for whichever role does not apply)', async () => {
      const result = await service.setProfilePhoto('user-26', 'profile-photos/user-26/pic.jpg');

      expect(result).toEqual({ profilePhotoUrl: 'profile-photos/user-26/pic.jpg' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-26' }, data: { profilePhotoUrl: 'profile-photos/user-26/pic.jpg' } });
      expect(mockPrisma.patient.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-26' }, data: { profilePhotoUrl: 'profile-photos/user-26/pic.jpg' } });
      expect(mockPrisma.provider.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-26' }, data: { profilePhotoUrl: 'profile-photos/user-26/pic.jpg' } });
    });
  });
});
