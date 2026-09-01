import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarketingAttributionDto {
  @ApiPropertyOptional({ example: 'facebook' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @ApiPropertyOptional({ example: 'paid_social' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'healthy-families-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmCampaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmTerm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmContent?: string;

  @ApiPropertyOptional({ description: 'The external page that referred the browser.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referrer?: string;

  @ApiPropertyOptional({ description: 'The first Health-Hub Africa page visited.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  landingPage?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
