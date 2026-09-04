import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
