import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AnalyticsService, ActivityEventDto, VisitGeoContext } from './analytics.service';
import { RecordVisitDto } from './dto/record-visit.dto';
import { Roles, Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Mirrors auth.controller.ts's headerValue()/loginContext() helpers exactly
// (same trusted header names forwarded by the frontend BFF routes) — kept
// local rather than shared since both call sites are small and the trust
// boundary (only ever fed by a same-origin BFF route, never a raw client)
// is easiest to audit when it lives next to the code that reads it.
function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return undefined;
  try {
    return decodeURIComponent(first).slice(0, 1000);
  } catch {
    return first.slice(0, 1000);
  }
}

function visitGeoContext(req: Request): VisitGeoContext {
  return {
    ipAddress: headerValue(req, 'x-hha-client-ip') ?? req.ip,
    userAgent: req.headers['user-agent'],
    countryCode:
      headerValue(req, 'x-vercel-ip-country') ??
      headerValue(req, 'cf-ipcountry') ??
      headerValue(req, 'cloudfront-viewer-country'),
    region:
      headerValue(req, 'x-vercel-ip-country-region') ??
      headerValue(req, 'x-vercel-ip-region') ??
      headerValue(req, 'cloudfront-viewer-country-region'),
    city:
      headerValue(req, 'x-vercel-ip-city') ??
      headerValue(req, 'cloudfront-viewer-city'),
  };
}

class RevenueQuery {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsString()
  fromDate: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsString()
  toDate: string;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Public so pre-login clickstream (registration/OTP funnel, landing pages)
  // can be captured too — trackEvent() keys anonymous rows off
  // dto.anonymousVisitorId instead when no access token is attached.
  @Public()
  @Roles()
  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Track a patient or anonymous-visitor activity event' })
  trackEvent(@Body() dto: ActivityEventDto, @CurrentUser() user?: JwtPayload) {
    return this.analyticsService.trackEvent(dto, user);
  }

  @Get('kpis')
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Get operational KPIs dashboard (admin only)' })
  getKpis() {
    return this.analyticsService.getOperationalKpis();
  }

  @Get('revenue')
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Get revenue breakdown (admin only)' })
  getRevenue(@Query() query: RevenueQuery) {
    return this.analyticsService.getRevenueReport(query.fromDate, query.toDate);
  }

  @Get('service-usage')
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Get service usage stats (admin only)' })
  getServiceUsage(@Query('days') days?: string) {
    return this.analyticsService.getServiceUsageStats(days ? parseInt(days, 10) : 30);
  }
}

// ── Public: consumed by the marketing site (myvaultplus-web) ────────────────
//
// Anonymous pageview beacon. Geo is resolved server-side from trusted edge
// headers forwarded by the marketing site's same-origin BFF route — never
// trusted from a client-supplied body field.

@ApiTags('Analytics — Public')
@Public()
@Roles()
@Controller('analytics')
export class AnalyticsPublicController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('visit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record an anonymous marketing site pageview' })
  recordVisit(@Body() dto: RecordVisitDto, @Req() req: Request) {
    return this.analyticsService.recordVisit(dto, visitGeoContext(req));
  }
}
