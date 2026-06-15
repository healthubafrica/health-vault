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

// DSP-YYYY-0001 sequential case reference
async function generateCaseRef(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DSP-${year}-`;
  const last = await prisma.dispatchRequest.findFirst({
    where: { hhaRef: { startsWith: prefix } },
    orderBy: { hhaRef: 'desc' },
    select: { hhaRef: true },
  });
  const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// 8-state FSM allowed transitions (mirrors the DispatchStatus lifecycle)
const TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  [DispatchStatus.requested]: [DispatchStatus.triaged, DispatchStatus.closed],
  [DispatchStatus.triaged]: [DispatchStatus.unit_assigned, DispatchStatus.closed],
  [DispatchStatus.unit_assigned]: [DispatchStatus.en_route, DispatchStatus.closed],
  [DispatchStatus.en_route]: [DispatchStatus.on_scene],
  [DispatchStatus.on_scene]: [
    DispatchStatus.patient_stabilised,
    DispatchStatus.transported,
    DispatchStatus.closed,
  ],
  [DispatchStatus.patient_stabilised]: [DispatchStatus.transported, DispatchStatus.closed],
  [DispatchStatus.transported]: [DispatchStatus.closed],
  [DispatchStatus.closed]: [],
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

    const hhaRef = await generateCaseRef(this.prisma);

    // No dedicated contact-phone column — keep it with the description so
    // responders still see it.
    const description = dto.contactPhone
      ? [dto.description, `Contact: ${dto.contactPhone}`].filter(Boolean).join(' — ')
      : dto.description;

    return this.prisma.dispatchRequest.create({
      data: {
        hhaRef,
        patientId,
        requestedBy: currentUser.sub,
        emergencyType: dto.emergencyType,
        description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationText: dto.locationAddress,
      },
    });
  }

  async findAll(currentUser: JwtPayload) {
    const adminRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);

    const where: any = isAdmin
      ? {}
      : currentUser.patientId
        ? { patientId: currentUser.patientId }
        : { requestedBy: currentUser.sub };

    return this.prisma.dispatchRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { events: { orderBy: { occurredAt: 'desc' }, take: 5 } },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const dispatchCase = await this.prisma.dispatchRequest.findUnique({
      where: { id },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        patient: { select: { userId: true } },
      },
    });

    if (!dispatchCase) throw new NotFoundException('Dispatch case not found');

    const adminRoles: UserRole[] = [
      UserRole.admin,
      UserRole.super_admin,
      UserRole.coordinator,
    ];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    if (!isAdmin && dispatchCase.patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }

    return dispatchCase;
  }

  async updateStatus(id: string, dto: UpdateDispatchStatusDto, currentUser: JwtPayload) {
    this.requireCoordinatorOrAdmin(currentUser);

    const dispatchCase = await this.prisma.dispatchRequest.findUnique({
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
    if (dto.assignedProviderId) {
      data.unitId = dto.assignedProviderId;
      data.assignedAt = new Date();
    }
    if (dto.status === DispatchStatus.on_scene) data.arrivedAt = new Date();
    if (dto.status === DispatchStatus.closed) data.closedAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.dispatchRequest.update({ where: { id }, data }),
      this.prisma.dispatchEvent.create({
        data: {
          requestId: id,
          status: dto.status,
          notes: dto.notes,
          actorId: currentUser.sub,
          latitude: dto.responseLatitude,
          longitude: dto.responseLongitude,
        },
      }),
    ]);

    return updated;
  }

  private requireCoordinatorOrAdmin(user: JwtPayload) {
    const allowed: UserRole[] = [
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
