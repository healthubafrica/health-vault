import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateProviderDto } from './create-provider.dto';

export class UpdateProviderDto extends PartialType(CreateProviderDto) {
  // Display title only ("Dr.", "Nurse", "Prof."). Create derives it from
  // providerType; edits may set it directly. Not a credential field, so
  // changing it keeps the provider verified.
  @ApiPropertyOptional({ example: 'Dr.' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  title?: string;
}
