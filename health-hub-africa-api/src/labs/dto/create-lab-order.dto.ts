import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LabOrderStatus } from '@prisma/client';

export class LabTestItemDto {
  @ApiProperty()
  @IsString()
  testCode: string;

  @ApiProperty()
  @IsString()
  testName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specimenType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ type: [LabTestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabTestItemDto)
  items: LabTestItemDto[];
}
