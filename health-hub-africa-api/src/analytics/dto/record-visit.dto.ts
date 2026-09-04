import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Everything here is self-reported by the visitor's browser (path, referrer,
// UTM params, timezone) — geo/IP/user-agent are resolved server-side from
// trusted edge headers instead, never trusted from the client.
export class RecordVisitDto {
  @ApiPropertyOptional({ description: 'Page path the visit started on.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @ApiPropertyOptional({ description: 'document.referrer at first touch.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referrer?: string;

  @ApiPropertyOptional({ description: 'Full URL of the first page visited this session.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  landingPage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
