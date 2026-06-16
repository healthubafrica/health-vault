import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpenemrService } from '../openemr/openemr.service';
import { UserRole, RecordType } from '@prisma/client';
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
  private readonly logger = new Logger(RecordsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly openemrService: OpenemrService,
  ) {
    // Static keys are optional — when absent the SDK default credential
    // provider chain resolves the ECS task role (or local AWS profile).
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      endpoint: config.get('S3_ENDPOINT'), // R2 endpoint if used
    });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  // ── Upload URL ─────────────────────────────────────────────────────────────

  // SEC-008: derive the extension from the declared MIME type (which is
  // allowlisted in the DTO) rather than from the client-supplied filename,
  // and restrict to alphanumeric characters to prevent path traversal.
  private static readonly MIME_TO_EXT: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/dicom': 'dcm',
  };

  async requestUploadUrl(dto: RequestUploadUrlDto, currentUser: JwtPayload) {
    const ext = RecordsService.MIME_TO_EXT[dto.contentType] ?? 'bin';
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
      where: { fileUrl: objectKey },
      select: { patientId: true, isDownloadable: true, patient: { select: { userId: true } } },
    });

    if (!record) throw new NotFoundException('File not found');
    await this.assertReadAccess(record, currentUser);

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

    // Schema holds one file per record and has no content column — long-form
    // content and any extra file keys are preserved in the description text.
    const extraFiles = (dto.fileKeys ?? []).slice(1);
    const description =
      [
        dto.description,
        dto.content,
        extraFiles.length ? `Additional files: ${extraFiles.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined;

    const created = await this.prisma.clinicalRecord.create({
      data: {
        hhaRef: await this.generateRecordRef(),
        patientId,
        providerId: currentUser.providerId,
        appointmentId: dto.appointmentId,
        recordType: dto.recordType,
        title: dto.title,
        description,
        fileUrl: dto.fileKeys?.[0],
        // Confidential records are not patient-downloadable
        isDownloadable: !(dto.isConfidential ?? false),
        recordedAt: new Date(),
      },
      select: this.recordSelect(),
    });

    await this.openemrService.enqueueRecordSync(created.patientId, created.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR record sync: ${err.message}`),
    );

    return created;
  }

  // REC-YYYY-000001 sequential record reference
  private async generateRecordRef(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;
    const last = await this.prisma.clinicalRecord.findFirst({
      where: { hhaRef: { startsWith: prefix } },
      orderBy: { hhaRef: 'desc' },
      select: { hhaRef: true },
    });
    const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  async findRecords(patientId: string | undefined, currentUser: JwtPayload, type?: string) {
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
      where: {
        patientId: resolvedPatientId,
        ...(type ? { recordType: type as RecordType } : {}),
      },
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
    await this.assertReadAccess(record, currentUser);

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

    // Schema models one drug per Prescription row, each 1:1 with a clinical
    // record — so a multi-item prescription becomes one record+prescription
    // pair per drug, created atomically.
    const baseRef = await this.generateRecordRef();
    const sharedNotes = [
      dto.diagnosis ? `Diagnosis: ${dto.diagnosis}` : null,
      dto.notes,
    ].filter(Boolean);

    const results = await this.prisma.$transaction(
      dto.items.map((item, index) =>
        this.prisma.prescription.create({
          data: {
            drugName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            route: item.route ?? 'oral',
            durationDays: item.durationDays,
            refillsRemaining: item.refills ?? 0,
            notes:
              [
                ...sharedNotes,
                item.instructions,
                item.quantity ? `Quantity: ${item.quantity}` : null,
              ]
                .filter(Boolean)
                .join(' | ') || undefined,
            patient: { connect: { id: dto.patientId } },
            provider: { connect: { id: currentUser.providerId! } },
            record: {
              create: {
                hhaRef: dto.items.length > 1 ? `${baseRef}-${index + 1}` : baseRef,
                recordType: 'prescription',
                title: `Prescription — ${item.medicationName}`,
                description: dto.diagnosis,
                recordedAt: new Date(),
                patient: { connect: { id: dto.patientId } },
                provider: { connect: { id: currentUser.providerId! } },
                ...(dto.appointmentId && {
                  appointment: { connect: { id: dto.appointmentId } },
                }),
              },
            },
          },
          include: { record: true },
        }),
      ),
    );

    for (const r of results) {
      if (r.record) {
        await this.openemrService.enqueueRecordSync(dto.patientId, r.record.id).catch(err =>
          this.logger.error(`Failed to enqueue OpenEMR prescription sync: ${err.message}`),
        );
      }
    }

    return results;
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
      orderBy: { createdAt: 'desc' },
      include: { record: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private recordSelect() {
    return {
      id: true,
      hhaRef: true,
      patientId: true,
      providerId: true,
      appointmentId: true,
      recordType: true,
      title: true,
      description: true,
      fileUrl: true,
      isDownloadable: true,
      recordedAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private async assertReadAccess(
    record: { patientId?: string; patient?: { userId?: string } | null; isDownloadable?: boolean },
    currentUser: JwtPayload,
  ) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    const isOwner = record.patient?.userId === currentUser.sub;

    // SEC-006: providers may only read records for patients assigned to them.
    // Any provider role is NOT sufficient — active assignment is required.
    let isAssignedProvider = false;
    if (currentUser.role === UserRole.provider && currentUser.providerId && record.patientId) {
      const assignment = await this.prisma.patientProviderAssignment.findFirst({
        where: {
          patientId: record.patientId,
          providerId: currentUser.providerId,
          unassignedAt: null,
        },
      });
      isAssignedProvider = !!assignment;
    }

    if (!isAdmin && !isOwner && !isAssignedProvider) {
      throw new ForbiddenException('Access denied');
    }
    if (record.isDownloadable === false && !isAssignedProvider && !isAdmin) {
      throw new ForbiddenException('Confidential record: assigned provider or admin access required');
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
