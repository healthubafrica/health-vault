import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpertReviewUrgency, ExpertReviewType, ExpertReviewStatus } from '@prisma/client';

export class CreateExpertReviewCaseDto {
  @ApiProperty({ enum: ExpertReviewType })
  @IsEnum(ExpertReviewType)
  reviewType: ExpertReviewType;

  @ApiProperty({ enum: ExpertReviewUrgency })
  @IsEnum(ExpertReviewUrgency)
  urgency: ExpertReviewUrgency;

  @ApiProperty()
  @IsString()
  clinicalSummary: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specificQuestions?: string;

  @ApiPropertyOptional({ description: 'Patient ID (admin/coordinator; omit to use own)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestedSpecialization?: string;
}

export class AssignSpecialistDto {
  @ApiProperty({ description: 'Provider ID of the specialist to assign' })
  @IsString()
  specialistProviderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentNotes?: string;
}

export class UpdateCaseStatusDto {
  @ApiProperty({ enum: ExpertReviewStatus })
  @IsEnum(ExpertReviewStatus)
  status: ExpertReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddCaseDocumentDto {
  @ApiProperty({ description: 'S3 object key' })
  @IsString()
  fileKey: string;

  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddSpecialistNoteDto {
  @ApiProperty()
  @IsString()
  caseId: string;

  @ApiProperty()
  @IsString()
  noteContent: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class CreateFinalReportDto {
  @ApiProperty()
  @IsString()
  caseId: string;

  @ApiProperty()
  @IsString()
  clinicalFindings: string;

  @ApiProperty()
  @IsString()
  diagnosis: string;

  @ApiProperty()
  @IsString()
  recommendations: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpInstructions?: string;

  @ApiPropertyOptional({ description: 'Appointment ID for follow-up' })
  @IsOptional()
  @IsString()
  followUpAppointmentId?: string;

  @ApiPropertyOptional({ type: [String], description: 'S3 keys for report files' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportFileKeys?: string[];
}
