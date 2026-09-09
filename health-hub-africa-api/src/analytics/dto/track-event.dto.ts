import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Payload for POST /analytics/events.
//
// Previously an unvalidated `interface`, which meant the global ValidationPipe
// had no metatype and let raw bodies through (spec §23 wants payloads
// validated server-side). It's a class now so `whitelist: true` strips
// unknown keys and the decorators below reject malformed values. Event-name
// *shape* and dedup are enforced in AnalyticsService.trackEvent().
export class TrackEventDto {
  @ApiPropertyOptional({ description: 'lowercase snake_case; describes a completed observation.' })
  @IsString()
  @MaxLength(64)
  eventType!: string;

  @ApiPropertyOptional({ description: 'Client-generated UUID; dedup/idempotency key (spec §20).' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Payload schema version; defaults from the event catalog.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  eventVersion?: number;

  @ApiPropertyOptional({ description: 'Client-reported event time (ISO-8601). Server stamps receivedAt separately.' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional({ enum: ['web', 'mobile'] })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  ingestionSource?: string;

  // ── Interaction context (spec §8.1) ──────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  featureArea?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pageName?: string;

  @ApiPropertyOptional({ description: 'Route path only — never a full URL with query string (PHI/token leak risk).' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  pagePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  elementId?: string;

  @ApiPropertyOptional({ description: 'button | card | link | menu | tab' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  elementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  outcome?: string;

  // ── Legacy fields (kept for the existing call sites) ─────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  entityId?: string;

  @ApiPropertyOptional({ description: 'Extra structured properties. Never PHI, credentials, or free clinical text (spec §22).' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  // ── Identity / session ──────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  anonymousVisitorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  analyticsSessionId?: string;

  @ApiPropertyOptional({ description: 'QA only — honoured for a staging/synthetic marker, ignored in production.' })
  @IsOptional()
  @IsBoolean()
  isTestEvent?: boolean;
}
