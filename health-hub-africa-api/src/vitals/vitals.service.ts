import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateVitalsDto } from './dto/create-vitals.dto';

@Injectable()
export class VitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVitalsDto, currentUser: JwtPayload) {
    let patientId = dto.patientId;

    if (!patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient profile not found');
      patientId = patient.id;
    } else {
      this.requireProviderOrAdmin(currentUser);
    }

    const bmi =
      dto.weightKg && dto.heightCm
        ? parseFloat((dto.weightKg / Math.pow(dto.heightCm / 100, 2)).toFixed(1))
        : undefined;

    return this.prisma.vitals.create({
      data: {
        patientId,
        recordedById: currentUser.sub,
        appointmentId: dto.appointmentId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        bloodPressureSystolic: dto.bloodPressureSystolic,
        bloodPressureDiastolic: dto.bloodPressureDiastolic,
        heartRate: dto.heartRate,
        respiratoryRate: dto.respiratoryRate,
        temperatureCelsius: dto.temperatureCelsius,
        oxygenSaturation: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi,
        bloodGlucose: dto.bloodGlucose,
        bloodGlucoseContext: dto.bloodGlucoseContext,
        notes: dto.notes,
      },
    });
  }

  async findForPatient(
    patientId: string | undefined,
    currentUser: JwtPayload,
    limit = 50,
  ) {
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

    return this.prisma.vitals.findMany({
      where: { patientId: resolvedPatientId },
      orderBy: { recordedAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const vitals = await this.prisma.vitals.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });

    if (!vitals) throw new NotFoundException('Vitals record not found');

    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    const isOwner = vitals.patient.userId === currentUser.sub;
    const isProvider = currentUser.role === UserRole.provider;

    if (!isAdmin && !isOwner && !isProvider) {
      throw new ForbiddenException('Access denied');
    }

    return vitals;
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
