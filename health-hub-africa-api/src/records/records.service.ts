import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateRecordDto } from './dto/create-record.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { RequestUploadUrlDto } from './dto/upload-url.dto';

@Injectable()
export class RecordsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
      endpoint: config.get('S3_ENDPOINT'), // R2 endpoint if used
    });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  // ── Upload URL ─────────────────────────────────────────────────────────────

  async requestUploadUrl(dto: RequestUploadUrlDto, currentUser: JwtPayload) {
    const ext = dto.filename.split('.').pop() ?? 'bin';
    const objectKey = `records/${currentUser.sub}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
      Metadata: { uploadedBy: currentUser.sub },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 }); // 10 min

    return { uploadUrl, objectKey };
  }

  // ── Download URL ───────────────────────────────────────────────────────────

  async requestDownloadUrl(objectKey: string, currentUser: JwtPayload) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { fileUrls: { has: objectKey } },
      select: { patientId: true, isConfidential: true, patient: { select: { userId: true } } },
    });

    if (!record) throw new NotFoundException('File not found');
    this.assertReadAccess(record, currentUser);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min
    return { downloadUrl, expiresIn: 300 };
  }

  // ── Clinical Records ───────────────────────────────────────────────────────

  async createRecord(dto: CreateRecordDto, currentUser: JwtPayload) {
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

    return this.prisma.clinicalRecord.create({
      data: {
        patientId,
        providerId: currentUser.providerId,
        appointmentId: dto.appointmentId,
        recordType: dto.recordType,
        title: dto.title,
        description: dto.description,
        content: dto.content,
        fileUrls: dto.fileKeys ?? [],
        isConfidential: dto.isConfidential ?? false,
      },
      select: this.recordSelect(),
    });
  }

  async findRecords(patientId: string | undefined, currentUser: JwtPayload) {
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

    return this.prisma.clinicalRecord.findMany({
      where: { patientId: resolvedPatientId },
      orderBy: { createdAt: 'desc' },
      select: this.recordSelect(),
    });
  }

  async findRecord(id: string, currentUser: JwtPayload) {
    const record = await this.prisma.clinicalRecord.findUnique({
      where: { id },
      select: {
        ...this.recordSelect(),
        patient: { select: { userId: true } },
      },
    });

    if (!record) throw new NotFoundException('Record not found');
    this.assertReadAccess(record, currentUser);

    return record;
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  async createPrescription(dto: CreatePrescriptionDto, currentUser: JwtPayload) {
    this.requireProviderOrAdmin(currentUser);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        providerId: currentUser.providerId!,
        appointmentId: dto.appointmentId,
        diagnosis: dto.diagnosis,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            route: item.route,
            durationDays: item.durationDays,
            instructions: item.instructions,
            quantity: item.quantity,
            refills: item.refills ?? 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findPrescriptions(patientId: string | undefined, currentUser: JwtPayload) {
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

    return this.prisma.prescription.findMany({
      where: { patientId: resolvedPatientId },
      orderBy: { prescribedAt: 'desc' },
      include: { items: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private recordSelect() {
    return {
      id: true,
      patientId: true,
      providerId: true,
      appointmentId: true,
      recordType: true,
      title: true,
      description: true,
      content: true,
      fileUrls: true,
      isConfidential: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private assertReadAccess(
    record: { patient?: { userId?: string } | null; isConfidential?: boolean },
    currentUser: JwtPayload,
  ) {
    const isAdmin = [UserRole.admin, UserRole.super_admin, UserRole.coordinator].includes(
      currentUser.role as UserRole,
    );
    const isOwner = record.patient?.userId === currentUser.sub;
    const isProvider = [UserRole.provider].includes(currentUser.role as UserRole);

    if (!isAdmin && !isOwner && !isProvider) {
      throw new ForbiddenException('Access denied');
    }
    if (record.isConfidential && !isProvider && !isAdmin) {
      throw new ForbiddenException('Confidential record: provider access required');
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
