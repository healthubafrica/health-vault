import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateEmergencyContactDto, UpdateEmergencyContactDto } from './dto/emergency-contact.dto';
import { EmergencyContactsService } from './emergency-contacts.service';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients/me/emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly contacts: EmergencyContactsService) {}

  private patientId(user: JwtPayload): string {
    if (!user.patientId) throw new BadRequestException('Not a patient account');
    return user.patientId;
  }

  @Get()
  @ApiOperation({ summary: 'List my emergency contacts' })
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.contacts.list(this.patientId(user)) };
  }

  @Post()
  @ApiOperation({ summary: 'Add an emergency contact' })
  async create(@Body() dto: CreateEmergencyContactDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.contacts.create(this.patientId(user), dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an emergency contact' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmergencyContactDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.contacts.update(this.patientId(user), id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an emergency contact' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.contacts.remove(this.patientId(user), id) };
  }
}
