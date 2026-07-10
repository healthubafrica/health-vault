import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Amount in kobo to refund. Omit for a full refund.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountKobo?: number;

  @ApiPropertyOptional({ description: 'Reason for the refund, shown to the patient and stored on the payment record' })
  @IsOptional()
  @IsString()
  reason?: string;
}
