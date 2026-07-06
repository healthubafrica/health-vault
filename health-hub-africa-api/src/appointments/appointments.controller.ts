import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ServiceType, UserRole } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CancelDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a new appointment' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments (scoped to current user role)' })
  findAll(@Query() query: QueryAppointmentsDto, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findAll(query, user);
  }

  // MUST sit above @Get(':id') so the static path wins the route match.
  @Get('facilities')
  @ApiOperation({ summary: 'List facilities available for in-person booking' })
  listFacilities() {
    return this.appointmentsService.listFacilitiesForBooking();
  }

  @Get('providers')
  @ApiOperation({ summary: 'List providers available for a given service type, ordered by priority' })
  @ApiQuery({ name: 'serviceType', enum: ServiceType, required: true })
  @ApiQuery({ name: 'scheduledAt', required: false, description: 'ISO datetime; filters to providers with a matching shift' })
  listProviders(
    @Query('serviceType') serviceType: string,
    @Query('scheduledAt') scheduledAt?: string,
  ) {
    if (!serviceType || !(serviceType in ServiceType)) {
      throw new BadRequestException(`serviceType must be one of: ${Object.values(ServiceType).join(', ')}`);
    }
    return this.appointmentsService.listAvailableProviders(serviceType as ServiceType, scheduledAt);
  }

  // MUST sit above @Get(':id') so the static path wins the route match.
  @Get('slots')
  @ApiOperation({ summary: 'Get real-time available appointment slots for a service type on a given day' })
  @ApiQuery({ name: 'serviceType', enum: ServiceType, required: true })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'durationMinutes', required: false })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'excludeAppointmentId', required: false, description: 'Exclude this appointment\'s own slot when rescheduling' })
  getSlots(
    @Query('serviceType') serviceType: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: string,
    @Query('providerId') providerId?: string,
    @Query('excludeAppointmentId') excludeAppointmentId?: string,
  ) {
    if (!serviceType || !(serviceType in ServiceType)) {
      throw new BadRequestException(`serviceType must be one of: ${Object.values(ServiceType).join(', ')}`);
    }
    if (!date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }
    return this.appointmentsService.getAvailableSlots({
      serviceType: serviceType as ServiceType,
      date,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      providerId,
      excludeAppointmentId,
    });
  }

  // MUST sit above @Get(':id') so the static path wins the route match.
  @Get('scheduling-policy')
  @ApiOperation({ summary: 'Get the current self-service cancellation/reschedule policy' })
  getSchedulingPolicy() {
    return this.appointmentsService.getSchedulingPolicyForPatient();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment details' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment details or status' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.update(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(
    @Param('id') id: string,
    @Body() body: CancelDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.cancel(id, body.reason, user);
  }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule an appointment to a new date/time' })
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentsService.reschedule(id, dto, user);
  }
}
