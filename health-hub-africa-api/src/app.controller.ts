import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/roles.decorator';

@ApiTags('Root')
@Controller({
  version: VERSION_NEUTRAL
})
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Welcome page / status ping' })
  getHello() {
    return { status: 'ok', message: 'HHA API — MyHealth Vault+™ Middleware' };
  }

  @Public()
  @Get('debug-sentry')
  @ApiOperation({ summary: 'Intentional error to test Sentry integration' })
  getError() {
    throw new Error('My first Sentry error!');
  }
}
