import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VitalsService } from './vitals.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class VitalsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

@ApiTags('Vitals')
@ApiBearerAuth()
@Controller('vitals')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post()
  @ApiOperation({ summary: 'Record vitals' })
  async create(@Body() dto: CreateVitalsDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.vitalsService.create(dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'List vitals (own, or specify patientId for providers/admin)' })
  async findAll(@Query() query: VitalsQuery, @CurrentUser() user: JwtPayload) {
    return { data: await this.vitalsService.findForPatient(query.patientId, user, query.limit) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single vitals record' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vitalsService.findOne(id, user);
  }
}
