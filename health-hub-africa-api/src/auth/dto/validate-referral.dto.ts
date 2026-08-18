import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateReferralDto {
  @ApiProperty({ description: 'Partner/provider referral code to validate (read-only check, no assignment)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  referralCode!: string;
}
