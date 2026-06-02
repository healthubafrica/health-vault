import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: '6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class RequestOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: '6-digit OTP from email' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  newPassword: string;
}
