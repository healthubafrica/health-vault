import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto, UpdateUserStatusDto, CreateFacilityDto } from './dto/admin.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a single user with full profile' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: "Change a user's role (super_admin only)" })
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateUserRole(id, dto, user);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateUserStatus(id, dto, user);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs' })
  getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      userId,
    );
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get operational KPI summary' })
  getAnalyticsSummary() {
    return this.adminService.getAnalyticsSummary();
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue data for a period (e.g. ?period=30d)' })
  getAnalyticsRevenue(@Query('period') period?: string) {
    return this.adminService.getAnalyticsRevenue(period);
  }

  @Get('analytics/usage')
  @ApiOperation({ summary: 'Get service usage data for a period' })
  getAnalyticsUsage(@Query('period') period?: string) {
    return this.adminService.getAnalyticsUsage(period);
  }

  // ── System ────────────────────────────────────────────────────────────────

  @Get('system/health')
  @ApiOperation({ summary: 'Check system and integration health' })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('system/sync-queue')
  @ApiOperation({ summary: 'List OpenEMR sync queue items' })
  getSyncQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSyncQueue(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('system/errors')
  @ApiOperation({ summary: 'List integration errors' })
  getIntegrationErrors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resolved') resolved?: string,
  ) {
    return this.adminService.getIntegrationErrors(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      resolved !== undefined ? resolved === 'true' : undefined,
    );
  }

  @Post('system/errors/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment retry count on an integration error' })
  retryIntegrationError(@Param('id') id: string) {
    return this.adminService.retryIntegrationError(id);
  }

  @Post('system/sync-queue/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enqueue a failed OpenEMR sync queue item' })
  retrySyncQueueItem(@Param('id') id: string) {
    return this.adminService.retrySyncQueueItem(id);
  }

  // ── Operations ────────────────────────────────────────────────────────────

  @Get('operations/appointments')
  @ApiOperation({ summary: 'List appointments' })
  listAppointments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listAppointments(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('operations/telecare')
  @ApiOperation({ summary: 'List telecare sessions' })
  listTelecareSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listTelecareSessions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('operations/dispatch')
  @ApiOperation({ summary: 'List emergency dispatch requests' })
  listDispatchRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listDispatchRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('operations/labs')
  @ApiOperation({ summary: 'List lab orders' })
  listLabOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listLabOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Get('operations/expert-review')
  @ApiOperation({ summary: 'List expert review cases' })
  listExpertReviewCases(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listExpertReviewCases(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  // ── Facilities ─────────────────────────────────────────────────────────────

  @Get('facilities')
  @ApiOperation({ summary: 'List facilities' })
  listFacilities(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('country') country?: string,
  ) {
    return this.adminService.listFacilities(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      country,
    );
  }

  @Post('facilities')
  @ApiOperation({ summary: 'Create a facility' })
  createFacility(@Body() dto: CreateFacilityDto) {
    return this.adminService.createFacility(dto);
  }

  @Patch('facilities/:id')
  @ApiOperation({ summary: 'Update a facility' })
  updateFacility(@Param('id') id: string, @Body() dto: Partial<CreateFacilityDto>) {
    return this.adminService.updateFacility(id, dto);
  }

  @Delete('facilities/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a facility' })
  deleteFacility(@Param('id') id: string) {
    return this.adminService.deleteFacility(id);
  }
}
