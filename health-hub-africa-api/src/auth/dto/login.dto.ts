import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MarketingAttributionDto } from './marketing-attribution.dto';

export class LoginDto extends MarketingAttributionDto {
  @ApiProperty({ description: 'Registered email address.' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
