import { IsString, IsInt, Min, Max, IsIn, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

// 10 MB default; override via PROFILE_PHOTO_MAX_BYTES env var
export const DEFAULT_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export class RequestProfilePhotoUrlDto {
  @ApiProperty({ description: 'MIME type of the photo to upload', enum: ALLOWED_PHOTO_MIME_TYPES })
  @IsString()
  @IsIn(ALLOWED_PHOTO_MIME_TYPES)
  contentType: string;

  @ApiProperty({ description: 'File size in bytes (max 10 MB by default)' })
  @IsInt()
  @Min(1)
  @Max(DEFAULT_PHOTO_MAX_BYTES)
  sizeBytes: number;
}

export class ProcessProfilePhotoDto {
  @ApiProperty({ description: 'S3 object key returned by the upload URL endpoint' })
  @IsString()
  objectKey: string;

  @ApiPropertyOptional({ description: 'Crop: left offset in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cropLeft?: number;

  @ApiPropertyOptional({ description: 'Crop: top offset in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cropTop?: number;

  @ApiPropertyOptional({ description: 'Crop: width in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cropWidth?: number;

  @ApiPropertyOptional({ description: 'Crop: height in pixels' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cropHeight?: number;
}
