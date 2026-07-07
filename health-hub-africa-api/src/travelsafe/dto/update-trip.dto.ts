import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTravelSafeTripDto } from './create-trip.dto';

export class UpdateTravelSafeTripDto extends PartialType(CreateTravelSafeTripDto) {
  @ApiPropertyOptional({ enum: ['preparing', 'active', 'completed', 'cancelled'] })
  @IsOptional()
  @IsIn(['preparing', 'active', 'completed', 'cancelled'])
  status?: string;
}
