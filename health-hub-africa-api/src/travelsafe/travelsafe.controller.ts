import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TravelsafeService } from './travelsafe.service';
import { CreateTravelSafeTripDto } from './dto/create-trip.dto';
import { UpdateTravelSafeTripDto } from './dto/update-trip.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('TravelSafe')
@ApiBearerAuth()
@Controller('travelsafe/trips')
export class TravelsafeController {
  constructor(private readonly travelsafeService: TravelsafeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a TravelSafe trip' })
  async create(@Body() dto: CreateTravelSafeTripDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.travelsafeService.create(dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'List TravelSafe trips' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return { data: await this.travelsafeService.findAll(user) };
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get travel health summary for a trip' })
  async getSummary(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.travelsafeService.getSummary(id, user) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a TravelSafe trip' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.travelsafeService.findOne(id, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a TravelSafe trip' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTravelSafeTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.travelsafeService.update(id, dto, user) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a TravelSafe trip' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.travelsafeService.remove(id, user);
  }
}
