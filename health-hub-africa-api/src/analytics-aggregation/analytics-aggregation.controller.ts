import { BadRequestException, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsAggregationService } from './analytics-aggregation.service';

function parseReportDate(value: string | undefined, paramName: string): Date {
  if (!value) throw new BadRequestException(`${paramName} is required (YYYY-MM-DD)`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${paramName} must be a valid date (YYYY-MM-DD)`);
  return date;
}

// Operational backfill/reprocessing endpoint (spec §25) — lets an admin
// re-run the idempotent daily aggregation across a date range instead of
// writing a one-off script when a gap shows up (a redeploy pause, a
// pipeline bug caught late).
@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin)
@Controller('admin/analytics-aggregation')
export class AnalyticsAggregationController {
  constructor(private readonly aggregation: AnalyticsAggregationService) {}

  @Post('backfill')
  @ApiOperation({
    summary: 'Re-run the daily analytics aggregation (spec §25) across a date range. Idempotent — safe to re-trigger for days that already have rows.',
  })
  @ApiQuery({ name: 'from', description: 'First report date to backfill, YYYY-MM-DD' })
  @ApiQuery({ name: 'to', description: 'Last report date to backfill, YYYY-MM-DD (inclusive)' })
  async backfill(@Query('from') from?: string, @Query('to') to?: string) {
    const fromDate = parseReportDate(from, 'from');
    const toDate = parseReportDate(to, 'to');
    const data = await this.aggregation.runBackfill(fromDate, toDate);
    return { data };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Data-freshness signal for the daily aggregation pipeline (spec §25) — when it last wrote a pre-aggregate row, and whether that is stale.',
  })
  async health() {
    const data = await this.aggregation.getPipelineHealth();
    return { data };
  }
}
