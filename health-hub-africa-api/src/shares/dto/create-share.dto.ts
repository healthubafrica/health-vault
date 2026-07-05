import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateShareDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  // New shares must always verify the recipient's email with a one-time
  // code — 'public' (no verification) and 'password' (static shared
  // secret) are no longer offered. Existing shares created before this
  // change keep working via their original access mode.
  @IsEnum(['email_list'])
  accessMode: 'email_list';

  @ArrayNotEmpty()
  @IsArray()
  @IsEmail({}, { each: true })
  allowedEmails: string[];

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

  // When true (default), the secure link is delivered automatically to
  // every allowed email, plus any recipientPhones below via SMS.
  @IsOptional()
  @IsBoolean()
  notifyRecipients?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^\+?[0-9][0-9 ()-]{6,19}$/, {
    each: true,
    message: 'each recipient phone must be a valid phone number',
  })
  recipientPhones?: string[];
}
