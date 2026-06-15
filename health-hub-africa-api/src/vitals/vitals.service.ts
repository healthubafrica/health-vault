import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpenemrService } from '../openemr/openemr.service';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateVitalsDto } from './dto/create-vitals.dto';

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

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

    // recordedBy references a Provider profile, not a User — resolve it when
    // the recorder is a provider, otherwise leave null (self-recorded).
    const providerProfile =
      currentUser.role === UserRole.provider
        ? await this.prisma.provider.findUnique({
            where: { userId: currentUser.sub },
            select: { id: true },
          })
        : null;

    // Fields without dedicated columns are preserved in the notes text.
    const extraNotes = [
      dto.respiratoryRate != null ? `Respiratory rate: ${dto.respiratoryRate}` : null,
      dto.bloodGlucoseContext ? `Glucose context: ${dto.bloodGlucoseContext}` : null,
    ].filter(Boolean);
    const notes = [dto.notes, ...extraNotes].filter(Boolean).join(' | ') || undefined;

    const created = await this.prisma.vitalsReading.create({
      data: {
        patientId,
        recordedBy: providerProfile?.id,
        source: providerProfile ? 'provider' : 'manual',
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        systolicBp: dto.bloodPressureSystolic,
        diastolicBp: dto.bloodPressureDiastolic,
        heartRate: dto.heartRate,
        temperatureC: dto.temperatureCelsius,
        spo2: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bloodGlucose: dto.bloodGlucose,
        notes,
      },
    });

    await this.openemrService.enqueueVitalsSync(created.patientId, created.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR vitals sync: ${err.message}`),
    );

    return created;
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

    return this.prisma.vitalsReading.findMany({
      where: { patientId: resolvedPatientId },
      orderBy: { recordedAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const vitals = await this.prisma.vitalsReading.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });

    if (!vitals) throw new NotFoundException('Vitals record not found');

    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    const isOwner = vitals.patient.userId === currentUser.sub;
    const isProvider = currentUser.role === UserRole.provider;

    if (!isAdmin && !isOwner && !isProvider) {
      throw new ForbiddenException('Access denied');
    }

    return vitals;
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
