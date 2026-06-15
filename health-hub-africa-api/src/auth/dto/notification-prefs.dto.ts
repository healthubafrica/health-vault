import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() whatsappEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() appointmentReminders?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() labResultAlerts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() paymentReceipts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dispatchUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() expertReviewUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() marketingComms?: boolean;
}
