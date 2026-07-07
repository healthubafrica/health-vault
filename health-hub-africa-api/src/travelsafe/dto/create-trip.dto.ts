import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTravelSafeTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partnerName?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  destinationCountry: string;

  @ApiProperty({ description: 'ISO date string YYYY-MM-DD' })
  @IsDateString()
  departureDate: string;

  @ApiPropertyOptional({ description: 'ISO date string YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({
    enum: ['Business', 'Vacation', 'Medical', 'Education', 'Family', 'Pilgrimage', 'Other'],
  })
  @IsOptional()
  @IsIn(['Business', 'Vacation', 'Medical', 'Education', 'Family', 'Pilgrimage', 'Other'])
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
