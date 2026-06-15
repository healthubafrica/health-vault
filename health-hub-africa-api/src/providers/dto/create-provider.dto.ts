import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '../../common/enums';

export class CreateProviderDto {
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

  @ApiProperty({ enum: ProviderType })
  @IsEnum(ProviderType)
  providerType: ProviderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subSpecializations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualifications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentHospital?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentDepartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officeCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsVirtualConsults?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptsEmergencies?: boolean;

  @ApiPropertyOptional({ description: 'Consultation fee in kobo (integer)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFeeKobo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredTimezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;
}
