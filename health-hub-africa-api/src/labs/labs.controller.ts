import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabStatus, UserRole } from '@prisma/client';
import { LabsService } from './labs.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PatientIdQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;
}

class UpdateStatusDto {
  @ApiPropertyOptional({ enum: LabStatus })
  @IsEnum(LabStatus)
  status: LabStatus;
}

@ApiTags('Labs')
@ApiBearerAuth()
@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post('orders')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Create a lab order (provider only)' })
  createOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() user: JwtPayload) {
    return this.labsService.createOrder(dto, user);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List lab orders (own, or specify patientId)' })
  findOrders(@Query() query: PatientIdQuery, @CurrentUser() user: JwtPayload) {
    return this.labsService.findOrders(query.patientId, user);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a lab order with results' })
  findOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.labsService.findOrder(id, user);
  }

  @Patch('orders/:id/status')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'Update lab order status' })
  updateOrderStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.labsService.updateOrderStatus(id, body.status, user);
  }

  @Post('results')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Submit lab results for an order' })
  createResult(@Body() dto: CreateLabResultDto, @CurrentUser() user: JwtPayload) {
    return this.labsService.createResult(dto, user);
  }
}
