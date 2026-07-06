import { IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchedulingPolicyDto {
  @ApiPropertyOptional({ description: 'Hours before an appointment that a patient may still self-cancel' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationWindowHours?: number;

  @ApiPropertyOptional({ description: 'Hours before an appointment that a patient may still self-reschedule' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleWindowHours?: number;

  @ApiPropertyOptional({ description: 'Master switch for patient self-service cancel/reschedule' })
  @IsOptional()
  @IsBoolean()
  selfServiceEnabled?: boolean;
}
