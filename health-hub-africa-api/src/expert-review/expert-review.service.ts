import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpertReviewStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  CreateExpertReviewCaseDto,
  AssignSpecialistDto,
  UpdateCaseStatusDto,
  AddCaseDocumentDto,
  AddSpecialistNoteDto,
  CreateFinalReportDto,
} from './dto/create-case.dto';

// ER-YYYY-000001 sequential case ID
async function generateCaseId(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ER-${year}-`;
  const last = await prisma.expertReviewCase.findFirst({
    where: { caseId: { startsWith: prefix } },
    orderBy: { caseId: 'desc' },
    select: { caseId: true },
  });
  const seq = last ? parseInt(last.caseId.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

// 7-state FSM allowed transitions
const TRANSITIONS: Record<ExpertReviewStatus, ExpertReviewStatus[]> = {
  [ExpertReviewStatus.submitted]: [
    ExpertReviewStatus.under_review,
    ExpertReviewStatus.cancelled,
  ],
  [ExpertReviewStatus.under_review]: [
    ExpertReviewStatus.specialist_assigned,
    ExpertReviewStatus.cancelled,
  ],
  [ExpertReviewStatus.specialist_assigned]: [
    ExpertReviewStatus.report_in_progress,
    ExpertReviewStatus.cancelled,
  ],
  [ExpertReviewStatus.report_in_progress]: [ExpertReviewStatus.report_ready],
  [ExpertReviewStatus.report_ready]: [ExpertReviewStatus.delivered],
  [ExpertReviewStatus.delivered]: [],
  [ExpertReviewStatus.cancelled]: [],
};

@Injectable()
export class ExpertReviewService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create Case ────────────────────────────────────────────────────────────

  async createCase(dto: CreateExpertReviewCaseDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    } else {
      this.requireAdminOrCoordinator(currentUser);
    }

    const caseId = await generateCaseId(this.prisma);

    return this.prisma.expertReviewCase.create({
      data: {
        caseId,
        patientId,
        requestedById: currentUser.sub,
        reviewType: dto.reviewType,
        urgency: dto.urgency,
        clinicalSummary: dto.clinicalSummary,
        specificQuestions: dto.specificQuestions,
        requestedSpecialization: dto.requestedSpecialization,
      },
    });
  }

  // ── List Cases ─────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload) {
    const isAdmin = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ].includes(currentUser.role as UserRole);

    const where: any = {};
    if (!isAdmin) {
      if (currentUser.patientId) {
        where.patientId = currentUser.patientId;
      } else if (currentUser.providerId) {
        where.OR = [
          { leadPhysicianId: currentUser.providerId },
          { specialistId: currentUser.providerId },
        ];
      }
    }

    return this.prisma.expertReviewCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        statusEvents: { orderBy: { createdAt: 'desc' }, take: 3 },
        finalReport: { select: { id: true, createdAt: true } },
      },
    });
  }

  // ── Get Case ───────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload) {
    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id },
      include: {
        documents: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
        notes: { where: { isInternal: false } },
        finalReport: true,
        patient: { select: { userId: true } },
      },
    });

    if (!erCase) throw new NotFoundException('Expert review case not found');
    this.assertReadAccess(erCase, currentUser);

    // Hide report if disclaimer not yet acknowledged (patients only)
    if (
      currentUser.role === UserRole.patient &&
      erCase.finalReport &&
      !erCase.reportDisclaimerAcknowledgedAt
    ) {
      return { ...erCase, finalReport: null, reportRequiresDisclaimer: true };
    }

    return erCase;
  }

  // ── Assign Specialist ──────────────────────────────────────────────────────

  async assignSpecialist(id: string, dto: AssignSpecialistDto, currentUser: JwtPayload) {
    this.requireAdminOrCoordinator(currentUser);

    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!erCase) throw new NotFoundException('Case not found');

    const allowed = TRANSITIONS[erCase.status];
    if (!allowed.includes(ExpertReviewStatus.specialist_assigned)) {
      throw new BadRequestException(`Cannot assign specialist at status: ${erCase.status}`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.expertReviewCase.update({
        where: { id },
        data: {
          specialistId: dto.specialistProviderId,
          status: ExpertReviewStatus.specialist_assigned,
        },
      }),
      this.prisma.expertReviewStatusEvent.create({
        data: {
          caseId: id,
          status: ExpertReviewStatus.specialist_assigned,
          notes: dto.assignmentNotes,
          updatedById: currentUser.sub,
        },
      }),
    ]);

    return updated;
  }

  // ── Update Status ──────────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateCaseStatusDto, currentUser: JwtPayload) {
    this.requireAdminOrCoordinatorOrProvider(currentUser);

    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!erCase) throw new NotFoundException('Case not found');

    const allowed = TRANSITIONS[erCase.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${erCase.status} to ${dto.status}`,
      );
    }

    const data: any = { status: dto.status };
    if (dto.status === ExpertReviewStatus.delivered) data.deliveredAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.expertReviewCase.update({ where: { id }, data }),
      this.prisma.expertReviewStatusEvent.create({
        data: { caseId: id, status: dto.status, notes: dto.notes, updatedById: currentUser.sub },
      }),
    ]);

    return updated;
  }

  // ── Add Document ───────────────────────────────────────────────────────────

  async addDocument(caseId: string, dto: AddCaseDocumentDto, currentUser: JwtPayload) {
    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id: caseId },
      select: { patient: { select: { userId: true } } },
    });
    if (!erCase) throw new NotFoundException('Case not found');

    const isOwner = erCase.patient.userId === currentUser.sub;
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator, UserRole.provider]
      .includes(currentUser.role as UserRole);
    if (!isOwner && !isAdmin) throw new ForbiddenException('Access denied');

    return this.prisma.expertReviewDocument.create({
      data: {
        caseId,
        uploadedById: currentUser.sub,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        description: dto.description,
      },
    });
  }

  // ── Add Specialist Note ────────────────────────────────────────────────────

  async addNote(dto: AddSpecialistNoteDto, currentUser: JwtPayload) {
    this.requireAdminOrCoordinatorOrProvider(currentUser);

    return this.prisma.expertReviewSpecialistNote.create({
      data: {
        caseId: dto.caseId,
        specialistId: currentUser.providerId!,
        noteContent: dto.noteContent,
        isInternal: dto.isInternal ?? false,
      },
    });
  }

  // ── Submit Final Report ────────────────────────────────────────────────────

  async createFinalReport(dto: CreateFinalReportDto, currentUser: JwtPayload) {
    this.requireAdminOrCoordinatorOrProvider(currentUser);

    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id: dto.caseId },
      select: { id: true, status: true },
    });
    if (!erCase) throw new NotFoundException('Case not found');

    const report = await this.prisma.expertReviewFinalReport.create({
      data: {
        caseId: dto.caseId,
        reviewedById: currentUser.providerId!,
        clinicalFindings: dto.clinicalFindings,
        diagnosis: dto.diagnosis,
        recommendations: dto.recommendations,
        treatmentPlan: dto.treatmentPlan,
        followUpInstructions: dto.followUpInstructions,
        followUpAppointmentId: dto.followUpAppointmentId,
        reportFileUrls: dto.reportFileKeys ?? [],
      },
    });

    await this.prisma.$transaction([
      this.prisma.expertReviewCase.update({
        where: { id: dto.caseId },
        data: { status: ExpertReviewStatus.report_ready },
      }),
      this.prisma.expertReviewStatusEvent.create({
        data: {
          caseId: dto.caseId,
          status: ExpertReviewStatus.report_ready,
          updatedById: currentUser.sub,
        },
      }),
    ]);

    return report;
  }

  // ── Acknowledge Disclaimer ─────────────────────────────────────────────────

  async acknowledgeDisclaimer(id: string, currentUser: JwtPayload) {
    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id },
      select: { patient: { select: { userId: true } } },
    });
    if (!erCase) throw new NotFoundException('Case not found');
    if (erCase.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Only the patient can acknowledge the disclaimer');
    }

    return this.prisma.expertReviewCase.update({
      where: { id },
      data: { reportDisclaimerAcknowledgedAt: new Date() },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertReadAccess(
    erCase: { patient?: { userId?: string } | null; leadPhysicianId?: string | null; specialistId?: string | null },
    currentUser: JwtPayload,
  ) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (isAdmin) return;

    const isPatient = erCase.patient?.userId === currentUser.sub;
    const isProvider =
      erCase.leadPhysicianId === currentUser.providerId ||
      erCase.specialistId === currentUser.providerId;

    if (!isPatient && !isProvider) throw new ForbiddenException('Access denied');
  }

  private requireAdminOrCoordinator(user: JwtPayload) {
    if (![UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(user.role as UserRole)) {
      throw new ForbiddenException('Admin or coordinator access required');
    }
  }

  private requireAdminOrCoordinatorOrProvider(user: JwtPayload) {
    const allowed = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
      UserRole.provider,
    ];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
