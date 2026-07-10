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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';
import { CreateProviderNotificationEmailDto } from './dto/provider-notification-email.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Providers')
@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({
    summary: 'Create a provider profile for a target user (admin only)',
    description:
      'Admin supplies the target user UUID; the user is promoted to role=provider ' +
      'if not already, and a Provider row is created in the unverified state. ' +
      'Hit PATCH /providers/:id/verify to mark the credentials reviewed and ' +
      'trigger OpenEMR sync.',
  })
  create(@Body() dto: CreateProviderDto, @CurrentUser() user: JwtPayload) {
    return this.providersService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List providers (public-facing filtered directory)' })
  findAll(@Query() query: QueryProvidersDto) {
    return this.providersService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "Get the authenticated user's provider profile" })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.providersService.findMyProfile(user);
  }

  @Get('me/notification-emails')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "List the authenticated provider's extra notification emails" })
  listMyNotificationEmails(@CurrentUser() user: JwtPayload) {
    return this.providersService.listMyNotificationEmails(user);
  }

  @Post('me/notification-emails')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Add an extra notification email for the authenticated provider' })
  addMyNotificationEmail(@Body() dto: CreateProviderNotificationEmailDto, @CurrentUser() user: JwtPayload) {
    return this.providersService.addMyNotificationEmail(dto, user);
  }

  @Delete('me/notification-emails/:emailId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "Remove one of the authenticated provider's extra notification emails" })
  removeMyNotificationEmail(@Param('emailId') emailId: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.removeMyNotificationEmail(emailId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a provider by ID' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.providersService.update(id, dto, user);
  }

  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Verify a provider account (admin only)' })
  verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.verify(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Deactivate a provider account (admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.remove(id, user);
  }
}
