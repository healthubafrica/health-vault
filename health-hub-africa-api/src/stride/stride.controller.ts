import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StrideService } from './stride.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('STRIDE Admin')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin, UserRole.coordinator)
@Controller('stride')
export class StrideController {
  constructor(private readonly strideService: StrideService) {}

  @Get('overview')
  @ApiOperation({ summary: 'STRIDE™ — Dispatch triage overview' })
  getStrideOverview() {
    return this.strideService.getStrideOverview();
  }

  @Get('hpacs')
  @ApiOperation({ summary: 'HPACS™ — Provider access & coordination overview' })
  getHpacsOverview() {
    return this.strideService.getHpacsOverview();
  }

  @Get('efce')
  @ApiOperation({ summary: 'EFCE™ — Active field care execution cases' })
  getEfceActiveCases() {
    return this.strideService.getEfceActiveCases();
  }

  @Get('expert-review-funnel')
  @ApiOperation({ summary: 'Expert Review™ case funnel breakdown' })
  getExpertReviewFunnel() {
    return this.strideService.getExpertReviewFunnel();
  }
}
