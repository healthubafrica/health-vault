import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../common/enums';

export class SubscribeDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ description: 'Number of family members (2–10, annual only, Silver/Gold/Concierge)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  familySize?: number;

  @ApiPropertyOptional({ description: 'Patient ID (admin only; omit for own)' })
  @IsOptional()
  @IsString()
  patientId?: string;
}
