import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TelecareService } from './telecare.service';
import {
  CreateTelecareSessionDto,
  UpdateSessionDto,
  CreateSessionNoteDto,
} from './dto/create-session.dto';
import { Roles } from '../common/decorators/roles.decorator';
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
  findSessions(@CurrentUser() user: JwtPayload) {
    return this.telecareService.findSessions(user);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a telecare session with notes' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.telecareService.findOne(id, user);
  }

  @Patch('sessions/:id')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
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
}
