import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GuestInviteService } from './guest-invite.service';
import { CreateGuestInviteDto, VerifyGuestOtpDto } from './dto/guest-invite.dto';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

// No @Roles here: the service restricts every route to the session's owning
// patient — only the patient who booked the call may invite/manage guests.
@ApiTags('TeleCare — Guest Invites')
@ApiBearerAuth()
@Controller('telecare/sessions/:sessionId/guest-invites')
export class GuestInviteController {
  constructor(private readonly guestInviteService: GuestInviteService) {}

  @Post()
  @ApiOperation({ summary: 'Invite a caregiver/family guest to a telecare session' })
  createInvite(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateGuestInviteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.guestInviteService.createInvite(sessionId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List guest invites for a telecare session' })
  listInvites(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.guestInviteService.listInvites(sessionId, user);
  }

  @Delete(':inviteId')
  @ApiOperation({ summary: 'Revoke a guest invite' })
  revokeInvite(
    @Param('sessionId') sessionId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.guestInviteService.revokeInvite(sessionId, inviteId, user);
  }
}

// Unauthenticated — the invite token in the URL is the only credential, and
// the guest additionally proves control of the invited email address via
// OTP before a LiveKit token is ever minted. Generous but bounded throttle,
// same shape as PublicShareController.
@ApiTags('TeleCare — Guest Invites (public)')
@Controller('telecare/guest')
@Public()
@Throttle({ default: { ttl: 60_000, limit: 20 } })
export class PublicGuestInviteController {
  constructor(private readonly guestInviteService: GuestInviteService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Resolve guest invite info (no PHI, public)' })
  getPublicInfo(@Param('token') token: string) {
    return this.guestInviteService.getPublicInfo(token);
  }

  @Post(':token/otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Send a one-time code to the invited guest email' })
  requestOtp(@Param('token') token: string) {
    return this.guestInviteService.requestOtp(token);
  }

  @Post(':token/verify-otp')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Verify the code and receive a LiveKit guest token' })
  verifyOtp(@Param('token') token: string, @Body() dto: VerifyGuestOtpDto) {
    return this.guestInviteService.verifyOtp(token, dto.code);
  }
}
