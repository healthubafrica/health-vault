import { IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class RequestCmsUploadUrlDto {
  @ApiProperty({ description: 'MIME type', enum: ALLOWED_MIME_TYPES })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  contentType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024) // 10 MB max for cover images / photos
  sizeBytes: number;
}
