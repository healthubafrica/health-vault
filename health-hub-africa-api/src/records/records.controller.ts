import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUploadUrlDto } from './dto/upload-url.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PatientIdQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;
}

class RecordsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Filter by record type (e.g. lab_result, prescription, imaging)' })
  @IsOptional()
  @IsString()
  type?: string;
}

@ApiTags('Records')
@ApiBearerAuth()
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  // Each presign authorises an S3 PUT (egress + storage cost). 30/min lets a
  // patient bulk-upload an album of scans but blocks scripted abuse.
  @Post('upload-url')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Request a pre-signed S3 upload URL' })
  requestUploadUrl(
    @Body() dto: RequestUploadUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.requestUploadUrl(dto, user);
  }

  // Download URL minting itself is cheap, but enumeration of object keys is
  // an info-disclosure risk. 60/min is plenty for normal browsing.
  @Get('download-url/:objectKey(*)')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Request a time-limited download URL for a stored file' })
  async requestDownloadUrl(
    @Param('objectKey') objectKey: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.recordsService.requestDownloadUrl(objectKey, user);
    return { data: { downloadUrl: result.downloadUrl, expiresIn: result.expiresIn } };
  }

  @Post()
  @ApiOperation({ summary: 'Create a clinical record' })
  createRecord(@Body() dto: CreateRecordDto, @CurrentUser() user: JwtPayload) {
    return this.recordsService.createRecord(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical records (own, or specify patientId for providers/admin)' })
  async findRecords(
    @Query() query: RecordsQuery,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.recordsService.findRecords(query.patientId, user, query.type) };
  }

  @Get('storage')
  @ApiOperation({ summary: 'Get storage usage for the current patient' })
  async getStorageUsage(@CurrentUser() user: JwtPayload) {
    return { data: await this.recordsService.getMyStorageUsage(user) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a clinical record by ID' })
  async findRecord(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.recordsService.findRecord(id, user) };
  }

  @Post('prescriptions')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Create a prescription (provider only)' })
  createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.createPrescription(dto, user);
  }

  @Get('prescriptions/list')
  @ApiOperation({ summary: 'List prescriptions (own, or specify patientId)' })
  findPrescriptions(
    @Query() query: PatientIdQuery,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recordsService.findPrescriptions(query.patientId, user);
  }
}
