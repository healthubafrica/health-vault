import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';
import { BillingCycle } from '../../common/enums';

export class UpgradeSubscriptionDto {
  @ApiProperty({ description: 'Target subscription plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({
    enum: PaymentGateway,
    description: 'Gateway to charge with. Defaults to Paystack.',
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}
