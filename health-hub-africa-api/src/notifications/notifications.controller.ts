import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

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
