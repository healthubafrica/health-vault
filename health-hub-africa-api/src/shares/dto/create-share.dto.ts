import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateShareDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsEnum(['public', 'email_list', 'password'])
  accessMode: 'public' | 'email_list' | 'password';

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  allowedEmails?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsIn(
    ['visit', 'prescription', 'lab', 'imaging', 'document', 'referral', 'expert_review'],
    { each: true },
  )
  recordTypes?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  detectForwarding?: boolean;
}
