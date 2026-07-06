import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-05-25T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Duration in minutes; defaults to the appointment\'s current duration' })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
