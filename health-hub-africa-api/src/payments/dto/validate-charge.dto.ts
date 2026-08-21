import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Flutterwave's tokenized-charge endpoint sometimes responds with
// status: 'pending' and a flw_ref requiring a one-time OTP (bank-issued
// 3DS/OTP step) before the charge completes — this DTO carries that OTP
// back to /v3/validate-charge.
export class ValidateChargeDto {
  @ApiProperty({ description: 'The paymentId returned by the initial paymentMethodId charge attempt' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'flw_ref returned alongside the pending charge' })
  @IsString()
  flwRef: string;

  @ApiProperty({ description: 'One-time code the cardholder received from their bank' })
  @IsString()
  otp: string;
}
