import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Object key returned by POST /documents/upload-url' })
  @IsString()
  objectKey: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({ description: 'Display title — defaults to fileName' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ enum: DocumentCategory })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiPropertyOptional({ type: [String], description: 'Up to 10 tags' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Date the document pertains to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;
}
