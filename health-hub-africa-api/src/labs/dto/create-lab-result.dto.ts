import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LabResultItemDto {
  @ApiProperty()
  @IsString()
  labOrderItemId: string;

  @ApiProperty()
  @IsString()
  resultValue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flag?: string;
}

export class CreateLabResultDto {
  @ApiProperty()
  @IsString()
  labOrderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interpretation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ type: [String], description: 'S3 object keys for result files' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileKeys?: string[];

  @ApiProperty({ type: [LabResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  items: LabResultItemDto[];
}
