import { Body, Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { OpenemrService } from './openemr.service';
import { Public, Roles } from '../common/decorators/roles.decorator';

const BACKEND_CALLBACK_URI = 'https://api.myvaultplus.com/api/v1/openemr/auth/callback';

@ApiTags('OpenEMR Sync')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin)
@Controller('openemr')
export class OpenemrController {
  constructor(private readonly openemrService: OpenemrService) {}

  @Get('queue')
  @ApiOperation({ summary: 'View pending/failed sync queue items (admin only)' })
  findQueueItems() {
    return this.openemrService.findQueueItems();
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
      'Returns the OpenEMR authorization URL and a one-time state token (10-minute TTL). ' +
      'Open the URL in a browser while logged in to OpenEMR and approve the permissions. ' +
      'The backend callback route exchanges the code automatically — no manual copy-paste needed.',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: false,
    description: `Must be an allowlisted URI (default: ${BACKEND_CALLBACK_URI})`,
  })
  async initAuth(@Query('redirect_uri') redirectUri?: string) {
    const uri = redirectUri ?? BACKEND_CALLBACK_URI;
    const { authorizationUrl, state } = await this.openemrService.buildAuthorizationUrl(uri);
    return {
      authorizationUrl,
      state,
      instructions: [
        '1. Open authorizationUrl in a browser where you are logged in to OpenEMR.',
        '2. Approve the requested permissions.',
        '3. OpenEMR will redirect to the backend callback which auto-exchanges the code.',
        '4. You will see a success page in the browser when setup is complete.',
      ],
      isAuthenticated: this.openemrService.isAuthenticated,
    };
  }

  @Get('auth/callback')
  @Public()
  @Roles()
  @ApiOperation({
    summary: 'OpenEMR OAuth2 callback (public – invoked by OpenEMR redirect)',
    description:
      'Receives the authorization code and state from OpenEMR after the admin approves permissions, ' +
      'then automatically exchanges them for tokens. No authentication required.',
  })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from OpenEMR' })
  @ApiQuery({ name: 'state', required: true, description: 'CSRF state token issued by /auth/init' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.openemrService.exchangeCodeForTokens(code, BACKEND_CALLBACK_URI, state);
      res.status(HttpStatus.OK).send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>Clinical Platform Connected – MyHealth Vault+</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4">
    <h1 style="color:#16a34a">&#10003; Clinical Platform OAuth2 Setup Complete</h1>
    <p style="color:#166534">MyHealth Vault+ is now connected to the Clinical Platform. You can close this tab.</p>
  </body>
</html>`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      res.status(HttpStatus.BAD_REQUEST).send(`<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>OAuth Error – MyHealth Vault+</title></head>
  <body style="font-family:sans-serif;text-align:center;padding:60px;background:#fef2f2">
    <h1 style="color:#dc2626">&#10007; OAuth Setup Failed</h1>
    <p style="color:#991b1b">${safe}</p>
    <p>Please retry from the admin panel (GET /api/v1/openemr/auth/init).</p>
  </body>
</html>`);
    }
  }

  @Post('auth/exchange')
  @ApiOperation({
    summary: 'Manually exchange OpenEMR authorization code for tokens (admin only)',
    description:
      'Fallback endpoint if the automatic callback failed. The state value must match ' +
      'the one returned by /auth/init and is verified server-side to prevent CSRF. ' +
      'The refresh token is stored in Redis and survives server restarts.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'state'],
      properties: {
        code: { type: 'string', description: 'Authorization code from the OpenEMR redirect URL' },
        state: { type: 'string', description: 'State token returned by /auth/init' },
        redirect_uri: {
          type: 'string',
          description: `Must match the redirect_uri used in /auth/init (default: ${BACKEND_CALLBACK_URI})`,
        },
      },
    },
  })
  exchangeCode(
    @Body('code') code: string,
    @Body('state') state: string,
    @Body('redirect_uri') redirectUri?: string,
  ) {
    const uri = redirectUri ?? BACKEND_CALLBACK_URI;
    return this.openemrService.exchangeCodeForTokens(code, uri, state);
  }
}
