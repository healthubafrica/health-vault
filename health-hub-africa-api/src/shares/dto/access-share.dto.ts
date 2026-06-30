import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyPasswordDto {
  @IsString()
  password: string;
}

export class ReportForwardDto {
  @IsOptional()
  @IsString()
  suspectedRecipientEmail?: string;
}
