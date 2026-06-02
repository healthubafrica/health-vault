import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Consents')
@ApiBearerAuth()
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @ApiOperation({ summary: 'Grant or revoke a consent' })
  upsert(@Body() dto: CreateConsentDto, @CurrentUser() user: JwtPayload) {
    return this.consentsService.upsertConsent(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List my consents' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.consentsService.findMyConsents(user);
  }
}
