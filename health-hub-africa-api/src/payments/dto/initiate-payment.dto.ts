import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';

export enum PaymentPurpose {
  subscription = 'subscription',
  appointment = 'appointment',
  expertReview = 'expertReview',
  labOrder = 'labOrder',
  telecareSession = 'telecareSession',
  other = 'other',
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentGateway, example: 'Paystack' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentPurpose, example: 'subscription' })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @ApiProperty({ description: 'Amount in kobo (smallest unit)', example: 500000 })
  @IsInt()
  @Min(100)
  amountKobo: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'NGN' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Reference ID for the resource being paid for' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Free-text description shown on the payment record and receipt' })
  @IsOptional()
  @IsString()
  description?: string;
}
