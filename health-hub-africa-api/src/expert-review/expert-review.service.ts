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

// ER-YYYY-000001 sequential case reference
async function generateCaseRef(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ER-${year}-`;
  const last = await prisma.expertReviewCase.findFirst({
    where: { hhaRef: { startsWith: prefix } },
    orderBy: { hhaRef: 'desc' },
    select: { hhaRef: true },
  });
  const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

// 7-state FSM allowed transitions (mirrors the ExpertReviewStatus lifecycle)
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
    ExpertReviewStatus.in_consultation,
    ExpertReviewStatus.cancelled,
  ],
  [ExpertReviewStatus.in_consultation]: [
    ExpertReviewStatus.report_ready,
    ExpertReviewStatus.cancelled,
  ],
  [ExpertReviewStatus.report_ready]: [ExpertReviewStatus.closed],
  [ExpertReviewStatus.closed]: [],
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

    const hhaRef = await generateCaseRef(this.prisma);

    const referralNotes =
      [
        dto.specificQuestions,
        dto.requestedSpecialization
          ? `Requested specialization: ${dto.requestedSpecialization}`
          : null,
      ]
        .filter(Boolean)
        .join('\n') || undefined;

    return this.prisma.expertReviewCase.create({
      data: {
        hhaRef,
        patientId,
        coordinatorId: currentUser.patientId ? undefined : currentUser.sub,
        reviewType: dto.reviewType,
        urgency: dto.urgency,
        clinicalQuestion: dto.clinicalSummary,
        referralNotes,
      },
    });
  }

  // ── List Cases ─────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload) {
    const adminRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);

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
        statusEvents: { orderBy: { occurredAt: 'desc' }, take: 3 },
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
        statusEvents: { orderBy: { occurredAt: 'asc' } },
        specialistNotes: { where: { isVisibleToPatient: true } },
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
      !erCase.finalReport.disclaimerAcceptedAt
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
          specialistAssignedAt: new Date(),
          status: ExpertReviewStatus.specialist_assigned,
        },
      }),
      this.prisma.expertReviewStatusEvent.create({
        data: {
          caseId: id,
          fromStatus: erCase.status,
          toStatus: ExpertReviewStatus.specialist_assigned,
          notes: dto.assignmentNotes,
          actorId: currentUser.sub,
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
    if (dto.status === ExpertReviewStatus.under_review) data.acceptedAt = new Date();
    if (dto.status === ExpertReviewStatus.closed) data.completedAt = new Date();
    if (dto.status === ExpertReviewStatus.cancelled) {
      data.cancelledAt = new Date();
      data.cancellationReason = dto.notes;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.expertReviewCase.update({ where: { id }, data }),
      this.prisma.expertReviewStatusEvent.create({
        data: {
          caseId: id,
          fromStatus: erCase.status,
          toStatus: dto.status,
          notes: dto.notes,
          actorId: currentUser.sub,
        },
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

    const staffRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
      UserRole.provider,
    ];
    const isOwner = erCase.patient.userId === currentUser.sub;
    const isStaff = staffRoles.includes(currentUser.role as UserRole);
    if (!isOwner && !isStaff) throw new ForbiddenException('Access denied');

    return this.prisma.expertReviewDocument.create({
      data: {
        caseId,
        uploadedBy: currentUser.sub,
        documentType: 'supporting_document',
        title: dto.description ?? dto.fileName,
        fileUrl: dto.fileKey,
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
        noteType: 'general',
        content: dto.noteContent,
        isVisibleToPatient: !(dto.isInternal ?? false),
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

    const recommendations =
      [
        dto.recommendations,
        dto.treatmentPlan ? `Treatment plan:\n${dto.treatmentPlan}` : null,
        dto.followUpInstructions ? `Follow-up:\n${dto.followUpInstructions}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

    const report = await this.prisma.expertReviewFinalReport.create({
      data: {
        caseId: dto.caseId,
        authoredBy: currentUser.providerId!,
        summary: dto.clinicalFindings,
        clinicalOpinion: dto.diagnosis,
        recommendations,
        followUpRequired: Boolean(dto.followUpAppointmentId || dto.followUpInstructions),
        followUpAppointmentId: dto.followUpAppointmentId,
        pdfUrl: dto.reportFileKeys?.[0],
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
          fromStatus: erCase.status,
          toStatus: ExpertReviewStatus.report_ready,
          actorId: currentUser.sub,
        },
      }),
    ]);

    return report;
  }

  // ── Acknowledge Disclaimer ─────────────────────────────────────────────────

  async acknowledgeDisclaimer(id: string, currentUser: JwtPayload) {
    const erCase = await this.prisma.expertReviewCase.findUnique({
      where: { id },
      select: {
        patient: { select: { userId: true } },
        finalReport: { select: { id: true } },
      },
    });
    if (!erCase) throw new NotFoundException('Case not found');
    if (erCase.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Only the patient can acknowledge the disclaimer');
    }
    if (!erCase.finalReport) {
      throw new BadRequestException('No final report to acknowledge');
    }

    return this.prisma.expertReviewFinalReport.update({
      where: { caseId: id },
      data: { disclaimerAccepted: true, disclaimerAcceptedAt: new Date() },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertReadAccess(
    erCase: { patient?: { userId?: string } | null; leadPhysicianId?: string | null; specialistId?: string | null },
    currentUser: JwtPayload,
  ) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    if (adminRoles.includes(currentUser.role as UserRole)) return;

    const isPatient = erCase.patient?.userId === currentUser.sub;
    const isProvider =
      erCase.leadPhysicianId === currentUser.providerId ||
      erCase.specialistId === currentUser.providerId;

    if (!isPatient && !isProvider) throw new ForbiddenException('Access denied');
  }

  private requireAdminOrCoordinator(user: JwtPayload) {
    const allowed: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Admin or coordinator access required');
    }
  }

  private requireAdminOrCoordinatorOrProvider(user: JwtPayload) {
    const allowed: UserRole[] = [
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
