import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, BloodGroup } from '@prisma/client';

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

  @ApiPropertyOptional({ description: 'URL of the profile photo' })
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
