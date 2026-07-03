import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  RequestOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
  RequestSmsOtpDto,
} from './dto/verify-otp.dto';
import { ChangePasswordDto, Toggle2faDto } from './dto/account-settings.dto';
import { UpdateNotificationPrefsDto } from './dto/notification-prefs.dto';
import { RequestProfilePhotoUploadDto, SetProfilePhotoDto } from './dto/profile-photo.dto';
import { Public } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { S3Service } from '../storage/s3.service';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly s3: S3Service,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token, get new access token' })
  refresh(@CurrentUser() user: JwtPayload & { sessionId: string; refreshToken: string }, @Req() req: Request) {
    return this.authService.refresh(user, req.ip, req.headers['user-agent']);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke current session' })
  logout(@CurrentUser() user: JwtPayload & { sessionId: string }) {
    return this.authService.logout(user.sessionId);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for current user' })
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.authService.logoutAll(user.sub);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 5 } }) // SEC-005: prevent OTP brute-force
  @ApiOperation({ summary: 'Verify email OTP to activate account' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Complete 2FA login by verifying the emailed OTP' })
  verify2fa(
    @Body() body: { userId: string; otp: string },
    @Req() req: Request,
  ) {
    return this.authService.verify2fa(body.userId, body.otp, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Re-send email verification OTP' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('request-sms-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Request / Resend registration verification OTP via SMS' })
  requestSmsOtp(@Body() dto: RequestSmsOtpDto) {
    return this.authService.requestSmsOtp(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: RequestOtpDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60_000, limit: 5 } }) // SEC-005: prevent OTP brute-force
  @ApiOperation({ summary: 'Reset password using OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password while authenticated (requires current password)' })
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: JwtPayload) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @ApiBearerAuth()
  @Patch('2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable or disable Two-Factor Authentication' })
  toggle2fa(@Body() dto: Toggle2faDto, @CurrentUser() user: JwtPayload) {
    return this.authService.toggle2fa(user.sub, dto.enabled);
  }

  @ApiBearerAuth()
  @Get('2fa')
  @ApiOperation({ summary: 'Get current 2FA status' })
  get2faStatus(@CurrentUser() user: JwtPayload) {
    return this.authService.get2faStatus(user.sub);
  }

  @ApiBearerAuth()
  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  getNotificationPrefs(@CurrentUser() user: JwtPayload) {
    return this.authService.getNotificationPrefs(user.sub);
  }

  @ApiBearerAuth()
  @Patch('notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPrefs(@Body() dto: UpdateNotificationPrefsDto, @CurrentUser() user: JwtPayload) {
    return this.authService.updateNotificationPrefs(user.sub, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user details' })
  async getMe(@CurrentUser() user: JwtPayload) {
    const dbUser = await this.authService.getUserById(user.sub);
    return {
      data: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        profilePhotoUrl: await this.s3.signStoredUrl(dbUser.profilePhotoUrl),
      },
    };
  }

  // Unified profile-photo flow for every role (admins and coordinators have
  // no patient/provider profile to hang a photo on; providers had no upload
  // path at all). Patients keep their portal flow — both write the same
  // canonical URL shape.
  @ApiBearerAuth()
  @Post('me/profile-photo-upload-url')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Request a pre-signed S3 upload URL for my profile photo (any role)' })
  async requestProfilePhotoUploadUrl(
    @Body() dto: RequestProfilePhotoUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ext =
      dto.contentType === 'image/png' ? 'png' : dto.contentType === 'image/webp' ? 'webp' : 'jpg';
    const objectKey = `profile-photos/${user.sub}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.s3.presignPut(objectKey, dto.contentType, dto.sizeBytes, {
      uploadedBy: user.sub,
    });
    return { uploadUrl, objectKey, publicUrl: this.s3.publicUrlFor(objectKey) };
  }

  @ApiBearerAuth()
  @Patch('me/profile-photo')
  @ApiOperation({ summary: 'Set my profile photo after uploading (any role)' })
  async setProfilePhoto(
    @Body() dto: SetProfilePhotoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Only accept objects this user uploaded through the presign flow —
    // an arbitrary URL here would let one user point their avatar at
    // another user's private object (or an external tracker).
    const requiredPrefix = this.s3.publicUrlFor(`profile-photos/${user.sub}/`);
    if (!dto.profilePhotoUrl.startsWith(requiredPrefix)) {
      throw new BadRequestException(
        'profilePhotoUrl must be the publicUrl returned by profile-photo-upload-url',
      );
    }
    const saved = await this.authService.setProfilePhoto(user.sub, dto.profilePhotoUrl);
    return { profilePhotoUrl: await this.s3.signStoredUrl(saved.profilePhotoUrl) };
  }

  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for the current user' })
  async getSessions(@CurrentUser() user: JwtPayload) {
    return { data: await this.authService.getSessions(user.sub) };
  }

  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session by ID' })
  revokeSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.authService.revokeSession(id, user.sub);
  }
}
