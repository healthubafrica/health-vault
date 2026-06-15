import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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

  // ── One-time OAuth2 Setup ──────────────────────────────────────────────────

  @Get('auth/init')
  @ApiOperation({
    summary: 'Begin OpenEMR OAuth2 setup (admin only)',
    description:
      'Returns the OpenEMR authorization URL. Open it in a browser while logged in as an ' +
      'OpenEMR admin. After approving, copy the `code` from the redirect URL and call ' +
      'POST /openemr/auth/exchange to complete setup.',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: false,
    description: 'Redirect URI registered in OpenEMR (default: https://www.myvaultplus.com/auth/callback)',
  })
  initAuth(@Query('redirect_uri') redirectUri?: string) {
    const uri = redirectUri ?? 'https://www.myvaultplus.com/auth/callback';
    const authorizationUrl = this.openemrService.buildAuthorizationUrl(uri);
    return {
      authorizationUrl,
      instructions: [
        '1. Open the authorizationUrl in a browser where you are logged in to OpenEMR.',
        '2. Approve the requested permissions.',
        '3. You will be redirected to the redirect_uri with ?code=XXX in the URL.',
        '4. Copy that code and POST it to /openemr/auth/exchange.',
      ],
      isAuthenticated: this.openemrService.isAuthenticated,
    };
  }

  @Post('auth/exchange')
  @ApiOperation({
    summary: 'Exchange OpenEMR authorization code for tokens (admin only)',
    description:
      'Completes the one-time OAuth2 setup. Submit the code from the OpenEMR redirect URL. ' +
      'The refresh token is stored in Redis and survives server restarts.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code'],
      properties: {
        code: { type: 'string', description: 'Authorization code from OpenEMR redirect' },
        redirect_uri: {
          type: 'string',
          description: 'Must match the redirect_uri used in /auth/init (default: https://www.myvaultplus.com/auth/callback)',
        },
      },
    },
  })
  exchangeCode(
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri?: string,
  ) {
    const uri = redirectUri ?? 'https://www.myvaultplus.com/auth/callback';
    return this.openemrService.exchangeCodeForTokens(code, uri);
  }
}
