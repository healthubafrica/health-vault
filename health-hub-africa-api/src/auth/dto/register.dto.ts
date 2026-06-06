import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// SEC-003: Minimum 12 chars, requires upper, lower, digit, and special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character';

export class RegisterDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be in E.164 format' })
  phone?: string;

  @ApiProperty({ minLength: 12, description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(12)
  @MaxLength(72) // bcrypt silently truncates beyond 72 bytes
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  // SEC-001: role is intentionally omitted. All new accounts are created as
  // 'patient'. Admin/provider roles are assigned by existing admins only.
}
