import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, BloodGroup } from '@prisma/client';

export class PatientMedicalInfoDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activeMedications?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  immunizations?: string[];

  @ApiPropertyOptional({ example: 172 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(260)
  heightCm?: number;

  @ApiPropertyOptional({ example: 70.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  weightKg?: number;

  @ApiPropertyOptional({ example: 'None' })
  @IsOptional()
  @IsString()
  disabilityStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disabilityDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activeCarePlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  relationship: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'AA' })
  @IsOptional()
  @IsString()
  genotype?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lgaOfOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextOfKinName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextOfKinRelationship?: string;

  @ApiPropertyOptional({ description: 'E.164 format' })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  nextOfKinPhone?: string;

  @ApiPropertyOptional({ description: 'Three-letter region code' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientMedicalInfoDto)
  medicalInfo?: PatientMedicalInfoDto;

  @ApiPropertyOptional({ type: [EmergencyContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gdprConsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional({ description: 'IANA timezone identifier' })
  @IsOptional()
  @IsString()
  preferredTimezone?: string;

  @ApiPropertyOptional({ description: 'ISO 639-1 language code' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({ description: 'Preferred date display format, e.g. dd/mm/yyyy' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ description: 'URL of the profile photo' })
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({
    description:
      'Optional partner/provider referral code (e.g. from a QR code or a partner clinic). ' +
      'Attribution hint only — validated and resolved server-side by the OpenEMR partner routing engine, never trusted as authorization.',
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
