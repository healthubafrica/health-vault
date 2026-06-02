import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportTicketStatus } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;
}

export class AddMessageDto {
  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'S3 object keys for attachments' })
  @IsOptional()
  attachmentKeys?: string[];
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
