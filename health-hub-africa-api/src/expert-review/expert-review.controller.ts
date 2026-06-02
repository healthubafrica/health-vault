import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ExpertReviewService } from './expert-review.service';
import {
  CreateExpertReviewCaseDto,
  AssignSpecialistDto,
  UpdateCaseStatusDto,
  AddCaseDocumentDto,
  AddSpecialistNoteDto,
  CreateFinalReportDto,
} from './dto/create-case.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Expert Review')
@ApiBearerAuth()
@Controller('expert-review')
export class ExpertReviewController {
  constructor(private readonly expertReviewService: ExpertReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Submit an Expert Review™ case' })
  createCase(@Body() dto: CreateExpertReviewCaseDto, @CurrentUser() user: JwtPayload) {
    return this.expertReviewService.createCase(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List Expert Review cases (scoped to role)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.expertReviewService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case details (report gated behind disclaimer for patients)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.expertReviewService.findOne(id, user);
  }

  @Patch(':id/assign-specialist')
  @Roles(UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'Assign a specialist to a case' })
  assignSpecialist(
    @Param('id') id: string,
    @Body() dto: AssignSpecialistDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.expertReviewService.assignSpecialist(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance case status through FSM' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.expertReviewService.updateStatus(id, dto, user);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Attach a document to a case' })
  addDocument(
    @Param('id') caseId: string,
    @Body() dto: AddCaseDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.expertReviewService.addDocument(caseId, dto, user);
  }

  @Post('notes')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'Add a specialist note to a case' })
  addNote(@Body() dto: AddSpecialistNoteDto, @CurrentUser() user: JwtPayload) {
    return this.expertReviewService.addNote(dto, user);
  }

  @Post('reports')
  @Roles(UserRole.provider, UserRole.admin, UserRole.super_admin, UserRole.coordinator)
  @ApiOperation({ summary: 'Submit the final report for a case' })
  createFinalReport(
    @Body() dto: CreateFinalReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.expertReviewService.createFinalReport(dto, user);
  }

  @Post(':id/acknowledge-disclaimer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge medical disclaimer before viewing final report' })
  acknowledgeDisclaimer(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.expertReviewService.acknowledgeDisclaimer(id, user);
  }
}
