import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetStorageOverrideDto {
  @ApiPropertyOptional({
    description: 'Override quota in MB. Omit or null to revert to plan default.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  storageQuotaOverrideMb?: number;
}
