import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SharesService } from './shares.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  VerifyPasswordDto,
} from './dto/access-share.dto';
import { Public } from '../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

// Generous throttle on public endpoints so brute-force is not feasible but
// legitimate recipients are never blocked by normal use.
@Controller('s')
@Public()
@Throttle({ default: { ttl: 60_000, limit: 20 } })
export class PublicShareController {
  constructor(private readonly sharesService: SharesService) {}

  private ipFromRequest(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }

  @Get(':token')
  async resolveShare(@Param('token') token: string, @Req() req: Request) {
    return this.sharesService.resolvePublicShare(
      token,
      this.ipFromRequest(req),
      req.headers['user-agent'] ?? '',
    );
  }

  @Post(':token/otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async requestOtp(
    @Param('token') token: string,
    @Body() dto: RequestOtpDto,
    @Req() req: Request,
  ) {
    return this.sharesService.requestOtp(
      token,
      dto.email,
      this.ipFromRequest(req),
      req.headers['user-agent'] ?? '',
    );
  }

  @Post(':token/verify-otp')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async verifyOtp(
    @Param('token') token: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
  ) {
    return this.sharesService.verifyOtp(
      token,
      dto.email,
      dto.code,
      this.ipFromRequest(req),
      req.headers['user-agent'] ?? '',
    );
  }

  @Post(':token/verify-password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async verifyPassword(
    @Param('token') token: string,
    @Body() dto: VerifyPasswordDto,
    @Req() req: Request,
  ) {
    return this.sharesService.verifyPassword(
      token,
      dto.password,
      this.ipFromRequest(req),
      req.headers['user-agent'] ?? '',
    );
  }
}
