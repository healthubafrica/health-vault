import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DispatchStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateDispatchCaseDto, UpdateDispatchStatusDto } from './dto/create-dispatch.dto';

// DSP-YYYY-0001 sequential case ID
async function generateCaseId(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DSP-${year}-`;
  const last = await prisma.dispatchCase.findFirst({
    where: { caseId: { startsWith: prefix } },
    orderBy: { caseId: 'desc' },
    select: { caseId: true },
  });
  const seq = last ? parseInt(last.caseId.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// 8-state FSM allowed transitions
const TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  [DispatchStatus.pending]: [DispatchStatus.acknowledged, DispatchStatus.cancelled],
  [DispatchStatus.acknowledged]: [DispatchStatus.dispatched, DispatchStatus.cancelled],
  [DispatchStatus.dispatched]: [DispatchStatus.en_route, DispatchStatus.cancelled],
  [DispatchStatus.en_route]: [DispatchStatus.on_scene],
  [DispatchStatus.on_scene]: [DispatchStatus.transporting, DispatchStatus.resolved],
  [DispatchStatus.transporting]: [DispatchStatus.at_facility],
  [DispatchStatus.at_facility]: [DispatchStatus.resolved],
  [DispatchStatus.resolved]: [],
  [DispatchStatus.cancelled]: [],
};

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async createCase(dto: CreateDispatchCaseDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    }

    const caseId = await generateCaseId(this.prisma);

    return this.prisma.dispatchCase.create({
      data: {
        caseId,
        patientId,
        reportedById: currentUser.sub,
        emergencyType: dto.emergencyType,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationAddress: dto.locationAddress,
        contactPhone: dto.contactPhone,
      },
    });
  }

  async findAll(currentUser: JwtPayload) {
    const isAdmin = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ].includes(currentUser.role as UserRole);

    const where: any = isAdmin
      ? {}
      : currentUser.patientId
        ? { patientId: currentUser.patientId }
        : { reportedById: currentUser.sub };

    return this.prisma.dispatchCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { statusEvents: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const dispatchCase = await this.prisma.dispatchCase.findUnique({
      where: { id },
      include: {
        statusEvents: { orderBy: { createdAt: 'asc' } },
        patient: { select: { userId: true } },
      },
    });

    if (!dispatchCase) throw new NotFoundException('Dispatch case not found');

    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin && dispatchCase.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return dispatchCase;
  }

  async updateStatus(id: string, dto: UpdateDispatchStatusDto, currentUser: JwtPayload) {
    this.requireCoordinatorOrAdmin(currentUser);

    const dispatchCase = await this.prisma.dispatchCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!dispatchCase) throw new NotFoundException('Dispatch case not found');

    const allowed = TRANSITIONS[dispatchCase.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${dispatchCase.status} to ${dto.status}`,
      );
    }

    const data: any = { status: dto.status };
    if (dto.assignedProviderId) data.assignedProviderId = dto.assignedProviderId;
    if (dto.responseLatitude) data.responseLatitude = dto.responseLatitude;
    if (dto.responseLongitude) data.responseLongitude = dto.responseLongitude;
    if (dto.status === DispatchStatus.resolved) data.resolvedAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.dispatchCase.update({ where: { id }, data }),
      this.prisma.dispatchStatusEvent.create({
        data: {
          dispatchCaseId: id,
          status: dto.status,
          notes: dto.notes,
          updatedById: currentUser.sub,
        },
      }),
    ]);

    return updated;
  }

  private requireCoordinatorOrAdmin(user: JwtPayload) {
    const allowed = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
      UserRole.provider,
    ];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenException('Coordinator or admin access required');
    }
  }
}
