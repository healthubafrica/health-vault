import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreateDispatchCaseDto, UpdateDispatchStatusDto } from './dto/create-dispatch.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('DispatchCare')
@ApiBearerAuth()
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @ApiOperation({ summary: 'Report a dispatch emergency case' })
  createCase(@Body() dto: CreateDispatchCaseDto, @CurrentUser() user: JwtPayload) {
    return this.dispatchService.createCase(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List dispatch cases (scoped to role)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.dispatchService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispatch case with full status timeline' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.dispatchService.findOne(id, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance dispatch case status (coordinator/admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dispatchService.updateStatus(id, dto, user);
  }
}
