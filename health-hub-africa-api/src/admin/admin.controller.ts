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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ServiceType, UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto, UpdateUserStatusDto, CreateFacilityDto } from './dto/admin.dto';
import { SetStorageOverrideDto } from './dto/set-storage-override.dto';
import { UpdateSchedulingPolicyDto } from './dto/update-scheduling-policy.dto';
import { ImportProviderManuallyDto } from './dto/import-provider-manually.dto';
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
    @Query('status') status?: 'active' | 'inactive',
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      status,
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

  @Post('users/:id/resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP to an unverified user' })
  resendVerificationEmail(@Param('id') id: string) {
    return this.adminService.resendVerificationEmail(id);
  }

  @Post('users/:id/resend-onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send onboarding completion email to a verified user with no patient profile' })
  sendOnboardingEmail(@Param('id') id: string) {
    return this.adminService.sendOnboardingEmail(id);
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

  @Patch('payments/:id/confirm')
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({ summary: 'Confirm a manual (bank transfer) payment and activate subscription' })
  confirmManualPayment(@Param('id') id: string) {
    return this.adminService.confirmManualPayment(id);
  }

  @Post('patients/:patientId/subscription/override')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override a patient subscription plan (super_admin only)' })
  overridePatientSubscription(
    @Param('patientId') patientId: string,
    @Body() body: { planId: string; billingCycle: 'monthly' | 'annually' },
  ) {
    return this.adminService.overridePatientSubscription(patientId, body.planId, body.billingCycle);
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

  @Post('providers/manual-import')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually create a provider account when OpenEMR FHIR returns no practitioners (super_admin only)',
    description:
      'Use this when GET /admin/providers/openemr-status shows fhirPractitionerCount=0. ' +
      'Creates a User (role=provider) + Provider record directly. ' +
      'If openemrProviderUuid is omitted, the verify flow will push the provider to OpenEMR via FHIR.',
  })
  importProviderManually(@Body() dto: ImportProviderManuallyDto) {
    return this.adminService.importProviderManually(dto);
  }

  @Get('providers/openemr-status')
  @Roles(UserRole.super_admin)
  @ApiOperation({
    summary: 'Diagnostic: check OpenEMR OAuth token and FHIR Practitioner endpoint (super_admin only)',
    description:
      'Returns token health, raw FHIR Practitioner count, local provider count, ' +
      'and a dry-run preview of which practitioners would be imported vs skipped.',
  })
  openemrProviderStatus() {
    return this.adminService.openemrProviderStatus();
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

  // Kept so existing UIs that call this surface the friendly "use import"
  // error from the service layer rather than a 404. The service itself
  // refuses to create — OpenEMR is the source of truth for facilities.
  @Post('facilities')
  @ApiOperation({ summary: 'Create a facility (disabled — use import-from-openemr)' })
  createFacility(@Body() dto: CreateFacilityDto) {
    return this.adminService.createFacility(dto);
  }

  @Post('facilities/import-from-openemr')
  @Roles(UserRole.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import facilities from OpenEMR (super_admin only)' })
  importFacilitiesFromOpenemr() {
    return this.adminService.importFacilitiesFromOpenemr();
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

  // ── Storage ───────────────────────────────────────────────────────────────

  @Patch('patients/:id/storage-override')
  @ApiOperation({ summary: 'Override storage quota for a patient (admin only)' })
  setPatientStorageOverride(
    @Param('id') patientId: string,
    @Body() dto: SetStorageOverrideDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.setPatientStorageOverride(patientId, dto, user);
  }

  // ── Scheduling ────────────────────────────────────────────────────────────

  @Get('scheduling/service-groups')
  @ApiOperation({ summary: 'List provider service group assignments' })
  @ApiQuery({ name: 'serviceType', enum: ServiceType, required: false })
  listServiceGroups(@Query('serviceType') serviceType?: ServiceType) {
    return this.adminService.listServiceGroups(serviceType);
  }

  @Post('scheduling/service-groups')
  @ApiOperation({ summary: 'Assign a provider to a service type with priority' })
  createServiceGroup(@Body() dto: { providerId: string; serviceType: ServiceType; priority: number }) {
    return this.adminService.createServiceGroup(dto);
  }

  @Patch('scheduling/service-groups/:id')
  @ApiOperation({ summary: 'Update priority or active status of a service group' })
  updateServiceGroup(
    @Param('id') id: string,
    @Body() dto: { priority?: number; isActive?: boolean },
  ) {
    return this.adminService.updateServiceGroup(id, dto);
  }

  @Delete('scheduling/service-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a provider from a service group' })
  deleteServiceGroup(@Param('id') id: string) {
    return this.adminService.deleteServiceGroup(id);
  }

  @Get('scheduling/shift-templates')
  @ApiOperation({ summary: 'List shift templates' })
  @ApiQuery({ name: 'serviceType', enum: ServiceType, required: false })
  listShiftTemplates(@Query('serviceType') serviceType?: ServiceType) {
    return this.adminService.listShiftTemplates(serviceType);
  }

  @Post('scheduling/shift-templates')
  @ApiOperation({ summary: 'Create a shift template' })
  createShiftTemplate(
    @Body() dto: { name: string; serviceType: ServiceType; dayOfWeek: number; startTime: string; endTime: string },
  ) {
    return this.adminService.createShiftTemplate(dto);
  }

  @Delete('scheduling/shift-templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift template' })
  deleteShiftTemplate(@Param('id') id: string) {
    return this.adminService.deleteShiftTemplate(id);
  }

  @Post('scheduling/shift-assignments')
  @ApiOperation({ summary: 'Assign a provider service group to a shift template' })
  createShiftAssignment(
    @Body() dto: { providerServiceGroupId: string; shiftTemplateId: string; effectiveFrom: string; effectiveTo?: string },
  ) {
    return this.adminService.createShiftAssignment(dto);
  }

  @Delete('scheduling/shift-assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a shift assignment' })
  deleteShiftAssignment(@Param('id') id: string) {
    return this.adminService.deleteShiftAssignment(id);
  }

  @Get('scheduling/policy')
  @ApiOperation({ summary: 'Get the patient self-service scheduling policy' })
  getSchedulingPolicy() {
    return this.adminService.getSchedulingPolicy();
  }

  @Patch('scheduling/policy')
  @ApiOperation({ summary: 'Update the patient self-service scheduling policy' })
  updateSchedulingPolicy(
    @Body() dto: UpdateSchedulingPolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.updateSchedulingPolicy(dto, user.sub);
  }
}
