import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';
import { ReportForwardDto } from './dto/access-share.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('shares')
@Roles('patient' as any)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  async create(@Body() dto: CreateShareDto, @CurrentUser() user: JwtPayload) {
    return this.sharesService.createShare(dto, user);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.sharesService.listMyShares(user);
  }

  @Get(':id/audit')
  async audit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sharesService.getShareAudit(id, user);
  }

  @Delete(':id')
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sharesService.revokeShare(id, user);
  }

  @Post(':id/report-forward')
  async reportForward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportForwardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sharesService.reportForwarding(id, dto.suspectedRecipientEmail, user);
  }
}
