import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// SEC-003: same policy as RegisterDto
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character';

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: '6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class RequestOtpDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ description: '6-digit OTP from email' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ minLength: 12, description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class RequestSmsOtpDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email: string;
}
