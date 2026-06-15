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
import { DeactivateAccountDto } from './dto/self-service.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { RequestProfilePhotoUrlDto } from './dto/profile-photo-upload.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create patient profile for the authenticated user' })
  async create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.patientsService.create(dto, user) };
  }

  @Get()
  @Roles(UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'List all patients (admin/coordinator only)' })
  findAll(@Query() query: QueryPatientsDto, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findAll(query, user);
  }

  @Get('me')
  @ApiOperation({ summary: "Get the authenticated user's patient profile" })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return { data: await this.patientsService.findMyProfile(user) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a patient by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a patient profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.patientsService.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Deactivate a patient account (admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.remove(id, user);
  }

  @Post('me/request-export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a full data export — emailed within 24 hours' })
  requestExport(@CurrentUser() user: JwtPayload) {
    return this.patientsService.requestExport(user);
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-service account deactivation (requires password confirmation)' })
  selfDeactivate(@Body() dto: DeactivateAccountDto, @CurrentUser() user: JwtPayload) {
    return this.patientsService.selfDeactivate(user, dto.password);
  }

  @Post('me/profile-photo-upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a pre-signed S3 upload URL for a profile picture' })
  requestProfilePhotoUploadUrl(
    @Body() dto: RequestProfilePhotoUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.requestProfilePhotoUploadUrl(dto, user);
  }
}
