import {
  ArrayMaxSize,
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

  // When true (default), the secure link is delivered automatically:
  // email_list shares notify every allowed email; other modes notify the
  // explicit recipientEmails / recipientPhones below.
  @IsOptional()
  @IsBoolean()
  notifyRecipients?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEmail({}, { each: true })
  recipientEmails?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^\+?[0-9][0-9 ()-]{6,19}$/, {
    each: true,
    message: 'each recipient phone must be a valid phone number',
  })
  recipientPhones?: string[];
}
