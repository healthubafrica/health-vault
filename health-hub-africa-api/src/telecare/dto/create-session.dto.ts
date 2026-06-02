import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelecareSessionStatus } from '@prisma/client';

export class CreateTelecareSessionDto {
  @ApiProperty()
  @IsString()
  appointmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoRoomSid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoProvider?: string;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ enum: TelecareSessionStatus })
  @IsOptional()
  @IsEnum(TelecareSessionStatus)
  status?: TelecareSessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingUrl?: string;
}

export class CreateSessionNoteDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  subjectiveNotes: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectiveNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpInstructions?: string;
}
