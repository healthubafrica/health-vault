import { IsOptional, IsString, IsEnum, IsIn, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';

const SORT_FIELDS = ['title', 'createdAt', 'fileSizeBytes'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export class QueryDocumentsDto {
  @ApiPropertyOptional({ description: 'Search title, description, or tags' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORT_FIELDS)
  sort?: (typeof SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: (typeof SORT_ORDERS)[number] = 'desc';

  @ApiPropertyOptional({ description: 'Filter recordedAt >= dateFrom (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter recordedAt <= dateTo (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}
