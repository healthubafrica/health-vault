import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '../../common/enums';

export class CreateAppointmentDto {
  @ApiPropertyOptional({ description: 'Omit for patient self-booking; care team assigns provider' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Required if creating on behalf of a patient (admin/coordinator)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  appointmentType: AppointmentType;

  @ApiProperty({ example: '2026-05-25T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'Duration in minutes', example: 30 })
  @IsInt()
  @Min(5)
  durationMinutes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Facility ID for in-person appointments' })
  @IsOptional()
  @IsString()
  facilityId?: string;
}
