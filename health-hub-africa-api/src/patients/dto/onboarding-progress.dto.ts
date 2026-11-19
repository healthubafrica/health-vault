import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOnboardingProgressDto {
  @ApiProperty({ description: 'Current onboarding step, 1-indexed.', minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  step: number;

  @ApiProperty({ description: "Human-readable step name, e.g. 'Vitals'." })
  @IsString()
  @MaxLength(50)
  stepName: string;
}

export class UpdateGettingStartedDto {
  @ApiPropertyOptional({ description: 'Mark the portal welcome tour as finished or skipped.' })
  @IsOptional()
  @IsBoolean()
  tourCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Hide the dashboard getting-started checklist.' })
  @IsOptional()
  @IsBoolean()
  dismissed?: boolean;
}
