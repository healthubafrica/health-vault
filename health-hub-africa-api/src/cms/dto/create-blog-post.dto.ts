import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Auto-generated from title when omitted' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(400)
  excerpt: string;

  @ApiProperty({ description: 'Rich text HTML from the admin WYSIWYG editor' })
  @IsString()
  bodyHtml: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

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
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  readMinutes?: number;
}
