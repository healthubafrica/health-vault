import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway, PaymentPurpose } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentPurpose })
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @ApiProperty({ description: 'Amount in kobo (smallest unit)' })
  @IsInt()
  @Min(100)
  amountKobo: number;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'NGN' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Subscription ID if purpose = subscription' })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: 'Appointment ID if purpose = appointment' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;
}
