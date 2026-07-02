import { IsString, IsInt, Min, Max, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DOCUMENT_MIME_TYPES } from '../documents.constants';

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export class RequestDocumentUploadUrlDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: 'MIME type', enum: DOCUMENT_MIME_TYPES })
  @IsString()
  @IsIn(DOCUMENT_MIME_TYPES)
  contentType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_SIZE_BYTES)
  sizeBytes: number;
}
