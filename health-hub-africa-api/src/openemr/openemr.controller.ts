import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OpenemrService } from './openemr.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('OpenEMR Sync')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin)
@Controller('openemr')
export class OpenemrController {
  constructor(private readonly openemrService: OpenemrService) {}

  @Get('queue')
  @ApiOperation({ summary: 'View pending/failed sync queue items (admin only)' })
  findQueueItems(@CurrentUser() user: JwtPayload) {
    return this.openemrService.findQueueItems(user);
  }

  @Post('queue/:id/retry')
  @ApiOperation({ summary: 'Retry a failed sync queue item' })
  retry(@Param('id') id: string) {
    return this.openemrService.retryFailed(id);
  }
}
