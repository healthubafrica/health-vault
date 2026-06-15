import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpenemrService } from '../openemr/openemr.service';
import { LabStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';

// LAB-YYYY-000001 sequential order reference
async function generateOrderRef(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LAB-${year}-`;
  const last = await prisma.labOrder.findFirst({
    where: { hhaRef: { startsWith: prefix } },
    orderBy: { hhaRef: 'desc' },
    select: { hhaRef: true },
  });
  const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(dto: CreateLabOrderDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const notes =
      [dto.clinicalNotes, dto.priority ? `Priority: ${dto.priority}` : null]
        .filter(Boolean)
        .join(' | ') || undefined;

    // Each ordered test becomes a pending LabResult row; values are filled in
    // when results are submitted.
    const labOrder = await this.prisma.labOrder.create({
      data: {
        hhaRef: await generateOrderRef(this.prisma),
        patientId: dto.patientId,
        orderedBy: currentUser.providerId!,
        appointmentId: dto.appointmentId,
        labFacility: dto.facilityId,
        notes,
        results: {
          create: dto.items.map((item) => ({
            patientId: dto.patientId,
            testCode: item.testCode,
            testName: item.testName,
            interpretationNote:
              [item.specimenType ? `Specimen: ${item.specimenType}` : null, item.instructions]
                .filter(Boolean)
                .join(' | ') || undefined,
          })),
        },
      },
      include: { results: true },
    });

    await this.openemrService.enqueueLabOrderSync(labOrder.patientId, labOrder.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR lab order sync: ${err.message}`),
    );

    return labOrder;
  }

  async findOrders(patientId: string | undefined, currentUser: JwtPayload) {
    let resolvedPatientId = patientId;

    if (!resolvedPatientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      resolvedPatientId = patient.id;
    } else {
      this.requireProviderOrAdmin(currentUser);
    }

    return this.prisma.labOrder.findMany({
      where: { patientId: resolvedPatientId },
      orderBy: { orderedAt: 'desc' },
      include: { results: { include: { items: true } } },
    });
  }

  async findOrder(id: string, currentUser: JwtPayload) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        results: { include: { items: true } },
        patient: { select: { userId: true } },
      },
    });

    if (!order) throw new NotFoundException('Lab order not found');
    this.assertReadAccess(order.patient, currentUser);

    return order;
  }

  async updateOrderStatus(id: string, status: LabStatus, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    return this.prisma.labOrder.update({
      where: { id },
      data: {
        overallStatus: status,
        collectedAt: order.collectedAt ?? (status !== LabStatus.pending ? new Date() : undefined),
      },
      include: { results: true },
    });
  }

  // ── Results ────────────────────────────────────────────────────────────────

  async createResult(dto: CreateLabResultDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const order = await this.prisma.labOrder.findUnique({
      where: { id: dto.labOrderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Lab order not found');

    const interpretationNote =
      [dto.interpretation, dto.comments].filter(Boolean).join(' | ') || undefined;

    // Each item targets the pending LabResult row created with the order
    // (labOrderItemId = LabResult id).
    await this.prisma.$transaction(
      dto.items.map((item, index) =>
        this.prisma.labResult.update({
          where: { id: item.labOrderItemId },
          data: {
            valueDisplay: item.resultValue,
            unit: item.unit,
            referenceRange: item.referenceRange,
            isFlagged: item.isAbnormal ?? false,
            status: item.isAbnormal ? LabStatus.review : LabStatus.normal,
            interpretationNote,
            fileUrl: dto.fileKeys?.[index] ?? dto.fileKeys?.[0],
          },
        }),
      ),
    );

    const anyFlagged = dto.items.some((item) => item.isAbnormal);
    return this.prisma.labOrder.update({
      where: { id: dto.labOrderId },
      data: {
        reportedAt: new Date(),
        overallStatus: anyFlagged ? LabStatus.review : LabStatus.normal,
      },
      include: { results: { include: { items: true } } },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertReadAccess(patient: { userId: string } | null, currentUser: JwtPayload) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    if (!isAdmin && patient?.userId !== currentUser.sub &&
        currentUser.role !== UserRole.provider) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireProviderOrAdmin(user: JwtPayload) {
    const allowed: UserRole[] = [
      UserRole.provider,
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Provider or admin access required');
    }
  }
}
