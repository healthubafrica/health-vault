import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationRecipientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}

export class UpdateNotificationRecipientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
