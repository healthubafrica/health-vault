import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateAccountDto {
  @ApiProperty({ description: 'Current password for confirmation' })
  @IsString()
  password: string;
}
