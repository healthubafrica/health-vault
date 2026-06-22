import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelecareSessionStatus } from '../../common/enums';

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

export class CreateOnDemandSessionDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferSessionDto {
  @ApiProperty()
  @IsString()
  toProviderId: string;
}

export class CreateShiftDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTelecare?: boolean;
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
