import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateVitalsDto {
  @ApiPropertyOptional({ description: 'Patient ID (provider/admin only; omit to use own)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ description: 'Recorded timestamp; defaults to now' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional({ description: 'Systolic mmHg' })
  @IsOptional()
  @IsNumber()
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ description: 'Diastolic mmHg' })
  @IsOptional()
  @IsNumber()
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ description: 'bpm' })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ description: 'breaths/min' })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Celsius' })
  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @ApiPropertyOptional({ description: 'SpO2 %' })
  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;

  @ApiPropertyOptional({ description: 'kg' })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ description: 'cm' })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiPropertyOptional({ description: 'mg/dL' })
  @IsOptional()
  @IsNumber()
  bloodGlucose?: number;

  @ApiPropertyOptional({ description: 'Fasting, post-meal, random, etc.' })
  @IsOptional()
  @IsString()
  bloodGlucoseContext?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
