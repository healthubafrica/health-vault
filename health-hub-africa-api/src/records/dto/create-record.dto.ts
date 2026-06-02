import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordType } from '@prisma/client';

export class CreateRecordDto {
  @ApiProperty({ enum: RecordType })
  @IsEnum(RecordType)
  recordType: RecordType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Patient ID (admin/provider only; omit to use own)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Appointment this record is linked to' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String], description: 'S3/R2 object keys' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileKeys?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;
}
