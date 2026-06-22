import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ContentStatus, ServiceType } from '@prisma/client';

export class CreateTestimonialDto {
  @ApiProperty()
  @IsString()
  authorName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorCompany?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorPhotoUrl?: string;

  @ApiProperty()
  @IsString()
  quote: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;
}
