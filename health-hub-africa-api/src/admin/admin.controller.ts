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

  @Patch('users/:id/role')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Change a user\'s role (super_admin only)' })
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
