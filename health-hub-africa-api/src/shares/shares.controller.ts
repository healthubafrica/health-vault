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

// No controller-level @Roles gate: every method below scopes by the
// caller's patient profile (currentUser.sub) in SharesService, not by
// raw role. A blanket 'patient' role check would 403 dual-role accounts
// (e.g. provider+patient) that legitimately have a patient profile —
// the same class of bug fixed in appointments/telecare scoping.
@Controller('shares')
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
