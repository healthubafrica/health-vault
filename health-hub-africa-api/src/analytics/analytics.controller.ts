import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnalyticsService, ActivityEventDto } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track a patient activity event' })
  trackEvent(@Body() dto: ActivityEventDto, @CurrentUser() user: JwtPayload) {
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
