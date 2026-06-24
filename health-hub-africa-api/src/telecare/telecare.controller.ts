import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { SessionStatus, UserRole } from '@prisma/client';
import { TelecareService } from './telecare.service';
import {
  CreateTelecareSessionDto,
  UpdateSessionDto,
  CreateSessionNoteDto,
  CreateOnDemandSessionDto,
  TransferSessionDto,
  CreateShiftDto,
} from './dto/create-session.dto';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('TeleCare')
@ApiBearerAuth()
@Controller('telecare')
export class TelecareController {
  constructor(private readonly telecareService: TelecareService) {}

  @Post('sessions')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Create a telecare session for an appointment' })
  createSession(
    @Body() dto: CreateTelecareSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.telecareService.createSession(dto, user);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List telecare sessions (scoped to current user)' })
  async findSessions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: SessionStatus,
  ) {
    return { data: await this.telecareService.findSessions(user, status) };
  }

  @Post('on-demand')
  @Roles(UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'Create an on-demand waiting session' })
  createOnDemandSession(
    @Body() dto: CreateOnDemandSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.telecareService.createOnDemandSession(dto, user);
  }

  @Get('metrics')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Get provider performance metrics' })
  getProviderMetrics(@CurrentUser() user: JwtPayload) {
    return this.telecareService.getProviderMetrics(user);
  }

  @Patch('availability')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Set provider online/offline availability' })
  setAvailability(@Body() body: { isAvailable: boolean }, @CurrentUser() user: JwtPayload) {
    return this.telecareService.setAvailability(body.isAvailable, user);
  }

  @Post('sessions/:id/accept')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Provider accepts a waiting session' })
  acceptSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.telecareService.acceptSession(id, user);
  }

  @Post('sessions/:id/decline')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Provider declines a waiting session' })
  declineSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.telecareService.declineSession(id, user);
  }

  @Post('sessions/:id/transfer')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Transfer an active session to another provider' })
  transferSession(
    @Param('id') id: string,
    @Body() dto: TransferSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.telecareService.transferSession(id, dto, user);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a telecare session with notes' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.telecareService.findOne(id, user) };
  }

  // No @Roles here: the service decides authorisation per-actor — admins and
  // assigned providers get full update rights; the owning patient is allowed
  // to mark *their* session completed (and only that), so a hang-up advances
  // state without requiring provider action.
  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Update session status / timestamps / recording' })
  updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.telecareService.updateSession(id, dto, user);
  }

  @Post('notes')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Add SOAP note to a telecare session' })
  createNote(@Body() dto: CreateSessionNoteDto, @CurrentUser() user: JwtPayload) {
    return this.telecareService.createNote(dto, user);
  }

  @Post('sessions/:id/token')
  @ApiOperation({ summary: 'Generate a LiveKit token for the session' })
  getLivekitToken(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.telecareService.getLivekitToken(id, user);
  }

  @Get('shifts')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'List my telecare availability shifts' })
  listShifts(@CurrentUser() user: JwtPayload) {
    return this.telecareService.listShifts(user);
  }

  @Post('shifts')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Add a telecare availability shift' })
  createShift(@Body() dto: CreateShiftDto, @CurrentUser() user: JwtPayload) {
    return this.telecareService.createShift(dto, user);
  }

  @Delete('shifts/:id')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Remove a telecare availability shift' })
  deleteShift(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.telecareService.deleteShift(id, user);
  }

  @Get('available-providers')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'List currently available providers (for transfer)' })
  getAvailableProviders() {
    return this.telecareService.getAvailableProviders();
  }

  // LiveKit POSTs here when room lifecycle events fire (room_started,
  // room_finished, participant_joined, etc.). Signature is verified against
  // the JWT in Authorization using our LIVEKIT_API_KEY / LIVEKIT_API_SECRET.
  // Configure the URL in the LiveKit dashboard:
  //   https://{api-host}/api/v1/telecare/webhooks/livekit
  @Public()
  @SkipThrottle()
  @Post('webhooks/livekit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LiveKit webhook receiver (public — invoked by LiveKit)' })
  handleLivekitWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authorization: string,
  ) {
    return this.telecareService.handleLivekitWebhook(req.rawBody!, authorization);
  }
}
