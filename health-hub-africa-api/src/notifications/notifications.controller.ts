import { BadRequestException, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IsBooleanString, IsOptional, IsNumberString } from 'class-validator';
import { Request } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class ListNotificationsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // ── In-app patient alerts ──────────────────────────────────────────────
  // Backs the patient portal's Topbar bell / NotificationsPanel.

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List my in-app notifications' })
  list(@Query() query: ListNotificationsQuery, @CurrentUser() user: JwtPayload) {
    if (!user.patientId) throw new BadRequestException('Not a patient account');
    return this.notifications.listPatientAlerts(user.patientId, {
      unreadOnly: query.unreadOnly === 'true',
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  @ApiBearerAuth()
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (!user.patientId) throw new BadRequestException('Not a patient account');
    return this.notifications.markPatientAlertRead(user.patientId, id);
  }

  @ApiBearerAuth()
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllRead(@CurrentUser() user: JwtPayload) {
    if (!user.patientId) throw new BadRequestException('Not a patient account');
    return this.notifications.markAllPatientAlertsRead(user.patientId);
  }

  // Configure this URL (https://{api-host}/api/notifications/webhooks/resend)
  // in the Resend dashboard under Webhooks, subscribed to at least
  // email.delivered and email.bounced.
  @Public()
  @SkipThrottle()
  @Post('webhooks/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend delivery webhook receiver (public — invoked by Resend)' })
  resendWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string | undefined,
    @Headers('svix-timestamp') svixTimestamp: string | undefined,
    @Headers('svix-signature') svixSignature: string | undefined,
  ) {
    return this.notifications.handleResendWebhook(req.rawBody!, svixId, svixTimestamp, svixSignature);
  }
}
