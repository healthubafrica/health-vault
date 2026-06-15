import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '../../common/enums';

export class SubscribeDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ description: 'Patient ID (admin only; omit for own)' })
  @IsOptional()
  @IsString()
  patientId?: string;
}
