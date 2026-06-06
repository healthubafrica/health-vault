import { IsBoolean, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// SEC-003: same policy as RegisterDto
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(72)
  currentPassword: string;

  @ApiProperty({ minLength: 12, description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class Toggle2faDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
