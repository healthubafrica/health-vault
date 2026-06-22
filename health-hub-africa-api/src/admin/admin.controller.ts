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
import { Roles, Public } from '../common/decorators/roles.decorator';
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

  @Get('audit-logs/:id')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Get a single audit log entry with full detail including metadata' })
  getAuditLog(@Param('id') id: string) {
    return this.adminService.getAuditLog(id);
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

  // ── Patients ──────────────────────────────────────────────────────────────

  @Get('patients')
  @ApiOperation({ summary: 'List patients with subscription info' })
  listPatients(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listPatients(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'List patient subscriptions' })
  listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listSubscriptions(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Patch('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a patient subscription' })
  cancelSubscription(@Param('id') id: string) {
    return this.adminService.cancelSubscription(id);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List payments' })
  listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listPayments(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
    );
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'List providers' })
  listProviders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listProviders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Post('providers/import-from-openemr')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import providers from OpenEMR Practitioner resources (super_admin only)' })
  importProvidersFromOpenemr() {
    return this.adminService.importProvidersFromOpenemr();
  }

  @Patch('providers/:id/availability')
  @ApiOperation({ summary: "Toggle a provider's availability" })
  toggleProviderAvailability(
    @Param('id') id: string,
    @Body('available') available: boolean,
  ) {
    return this.adminService.toggleProviderAvailability(id, available);
  }

  // ── Clinical Queue ────────────────────────────────────────────────────────

  @Get('clinical-queue')
  @ApiOperation({ summary: 'Get active teleconsults and expert review cases' })
  getClinicalQueue() {
    return this.adminService.getClinicalQueue();
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────

  @Public()
  @Roles()
  @Get('features')
  @ApiOperation({ summary: 'Public: get feature flag states as a simple boolean map' })
  async getPublicFeatures() {
    const flags = await this.adminService.getFeatureFlags();
    return Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
  }

  @Get('feature-flags')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'List all feature flags (super_admin only)' })
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Patch('feature-flags/:key')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Set a feature flag value (super_admin only)' })
  setFeatureFlag(
    @Param('key') key: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.adminService.setFeatureFlag(key, enabled);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'List notification delivery records' })
  listNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listNotifications(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      channel,
      status,
    );
  }

  @Post('notifications/:id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Requeue a failed notification for delivery' })
  resendNotification(@Param('id') id: string) {
    return this.adminService.resendNotification(id);
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
