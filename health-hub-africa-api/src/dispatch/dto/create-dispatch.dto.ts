import { IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchStatus, EmergencyType } from '@prisma/client';

export class CreateDispatchCaseDto {
  @ApiPropertyOptional({ description: 'Patient ID (omit to use own profile)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ enum: EmergencyType })
  @IsEnum(EmergencyType)
  emergencyType: EmergencyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateDispatchStatusDto {
  @ApiProperty({ enum: DispatchStatus })
  @IsEnum(DispatchStatus)
  status: DispatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Provider/unit assigned' })
  @IsOptional()
  @IsString()
  assignedProviderId?: string;

  @ApiPropertyOptional({ description: 'Response latitude' })
  @IsOptional()
  @IsNumber()
  responseLatitude?: number;

  @ApiPropertyOptional({ description: 'Response longitude' })
  @IsOptional()
  @IsNumber()
  responseLongitude?: number;
}
