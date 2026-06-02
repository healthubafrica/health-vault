import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/create-ticket.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Open a support ticket' })
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.supportService.createTicket(dto, user);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List tickets (own for patients, all for admin/coordinator)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.supportService.findAll(user);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket with full message thread' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.supportService.findOne(id, user);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message to a ticket' })
  addMessage(
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.supportService.addMessage(id, dto, user);
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status (admin/coordinator only)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.supportService.updateStatus(id, dto, user);
  }
}
