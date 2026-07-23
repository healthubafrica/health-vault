import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateGuestInviteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guestName: string;

  @IsEmail()
  guestEmail: string;
}

export class VerifyGuestOtpDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
