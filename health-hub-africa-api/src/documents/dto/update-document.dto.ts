import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ type: [String], description: 'Up to 10 tags' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Date the document pertains to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @ApiPropertyOptional({ description: 'Whether providers can see this patient-uploaded document' })
  @IsOptional()
  @IsBoolean()
  providerVisibility?: boolean;
}
