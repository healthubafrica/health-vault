import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LabOrderStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Orders ─────────────────────────────────────────────────────────────────

  async createOrder(dto: CreateLabOrderDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.labOrder.create({
      data: {
        patientId: dto.patientId,
        providerId: currentUser.providerId!,
        appointmentId: dto.appointmentId,
        facilityId: dto.facilityId,
        clinicalNotes: dto.clinicalNotes,
        priority: dto.priority ?? 'routine',
        items: {
          create: dto.items.map((item) => ({
            testCode: item.testCode,
            testName: item.testName,
            specimenType: item.specimenType,
            instructions: item.instructions,
          })),
        },
      },
      include: { items: true },
    });
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
      include: { items: true, results: { include: { items: true } } },
    });
  }

  async findOrder(id: string, currentUser: JwtPayload) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        items: true,
        results: { include: { items: true } },
        patient: { select: { userId: true } },
      },
    });

    if (!order) throw new NotFoundException('Lab order not found');
    this.assertReadAccess(order.patient, currentUser);

    return order;
  }

  async updateOrderStatus(id: string, status: LabOrderStatus, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    return this.prisma.labOrder.update({
      where: { id },
      data: { status },
      include: { items: true },
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

    const result = await this.prisma.labResult.create({
      data: {
        labOrderId: dto.labOrderId,
        reportedById: currentUser.sub,
        interpretation: dto.interpretation,
        comments: dto.comments,
        fileUrls: dto.fileKeys ?? [],
        items: {
          create: dto.items.map((item) => ({
            labOrderItemId: item.labOrderItemId,
            resultValue: item.resultValue,
            unit: item.unit,
            referenceRange: item.referenceRange,
            isAbnormal: item.isAbnormal ?? false,
            flag: item.flag,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.labOrder.update({
      where: { id: dto.labOrderId },
      data: { status: LabOrderStatus.resulted },
    });

    return result;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertReadAccess(patient: { userId: string } | null, currentUser: JwtPayload) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin && patient?.userId !== currentUser.sub &&
        currentUser.role !== UserRole.provider) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireProviderOrAdmin(user: JwtPayload) {
    const allowed = [
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
