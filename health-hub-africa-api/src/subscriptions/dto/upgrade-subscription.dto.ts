import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';
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
    description: 'Gateway to charge with. Defaults to Flutterwave.',
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;

  @ApiPropertyOptional({
    enum: ['web', 'mobile'],
    description: "Calling client. 'mobile' returns to the app via deep link after checkout. Defaults to web.",
  })
  @IsOptional()
  @IsIn(['web', 'mobile'])
  client?: 'web' | 'mobile';
}
