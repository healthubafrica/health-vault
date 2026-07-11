// Trigger CI/CD deploy with new IAM role permissions
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { RequestProfilePhotoUrlDto, ProcessProfilePhotoDto } from './dto/profile-photo-upload.dto';
import { OpenemrService } from '../openemr/openemr.service';
import { StorageService } from '../storage/storage.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';

// HHA Patient ID: HHA-{REGION}-{YYYYMM}-{4-digit-seq}  e.g. HHA-CAN-2605-0004
const REGION_MAP: Record<string, string> = {
  Nigeria: 'LAG',
  Ghana: 'ACC',
  Kenya: 'NBI',
  'South Africa': 'JHB',
  Canada: 'CAN',
  'United Kingdom': 'LON',
  'United States': 'NYC',
};

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly openemrService: OpenemrService,
    private readonly storageService: StorageService,
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
      endpoint: config.get('S3_ENDPOINT'),
    });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  // Canonical bucket URL prefix — same shape signProfilePhotoUrl derives keys
  // from and the same one requestProfilePhotoUploadUrl mints publicUrls with.
  private get photoUrlBase(): string {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    return endpoint
      ? `${endpoint}/${this.bucket}/`
      : `https://${this.bucket}.s3.${this.config.get('AWS_REGION', 'us-east-1')}.amazonaws.com/`;
  }

  // A stored photo URL must be an object this user uploaded through the
  // presign flow. Anything else — another user's photo, a clinical-record
  // object, an external URL — would otherwise be signed and served by the
  // photo read paths, turning the avatar field into an arbitrary-object read.
  private assertOwnPhotoUrl(url: string, userId: string): void {
    const requiredPrefix = `${this.photoUrlBase}profile-photos/${userId}/`;
    if (!url.startsWith(requiredPrefix)) {
      throw new BadRequestException(
        'profilePhotoUrl must be the publicUrl returned by the profile-photo upload endpoint',
      );
    }
  }

  // ── HHA-ID Generator ──────────────────────────────────────────────────────

  private async generateHhaId(country?: string): Promise<string> {
    const region = (country && REGION_MAP[country]) ?? 'HHA';
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `HHA-${region}-${yyyymm}-`;

    const last = await this.prisma.patient.findFirst({
      where: { hhaPatientId: { startsWith: prefix } },
      orderBy: { hhaPatientId: 'desc' },
      select: { hhaPatientId: true },
    });

    let seq = 1;
    if (last?.hhaPatientId) {
      const parts = last.hhaPatientId.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreatePatientDto, currentUser: JwtPayload) {
    const existing = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
    });
    if (existing) throw new ConflictException('Patient profile already exists');

    if (dto.profilePhotoUrl) this.assertOwnPhotoUrl(dto.profilePhotoUrl, currentUser.sub);

    const regionCode = dto.regionCode ?? (dto.country && REGION_MAP[dto.country]) ?? 'HHA';
    const hhaPatientId = await this.generateHhaId(dto.country);

    const allergies = dto.medicalInfo?.allergies ?? dto.allergies ?? [];
    const chronicConditions = dto.medicalInfo?.chronicConditions ?? dto.chronicConditions ?? [];

    const patient = await this.prisma.patient.create({
      data: {
        userId: currentUser.sub,
        hhaPatientId,
        regionCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        nationality: dto.nationality,
        stateOfOrigin: dto.stateOfOrigin,
        lgaOfOrigin: dto.lgaOfOrigin,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'Nigeria',
        nextOfKinName: dto.nextOfKinName,
        nextOfKinRelationship: dto.nextOfKinRelationship,
        nextOfKinPhone: dto.nextOfKinPhone,
        medicalInfo: {
          create: {
            allergies,
            chronicConditions,
          }
        },
        emergencyContacts: dto.emergencyContacts && dto.emergencyContacts.length > 0 ? {
          createMany: {
            data: dto.emergencyContacts.map(c => ({
              fullName: c.fullName,
              relationship: c.relationship,
              phone: c.phone,
              email: c.email,
              isPrimary: c.isPrimary ?? false,
            }))
          }
        } : undefined,
        nin: dto.nin,
        gdprConsent: dto.gdprConsent ?? false,
        marketingConsent: dto.marketingConsent ?? false,
        preferredTimezone: dto.preferredTimezone ?? 'Africa/Lagos',
        profilePhotoUrl: dto.profilePhotoUrl,
      },
      select: this.safeSelect(),
    });

    await this.openemrService.enqueuePatientSync(patient.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR patient sync: ${err.message}`),
    );

    return { ...patient, profilePhotoUrl: await this.signProfilePhotoUrl(patient.profilePhotoUrl) };
  }

  // ── Find All (Admin/Coordinator only) ─────────────────────────────────────

  async findAll(query: QueryPatientsDto, currentUser: JwtPayload) {
    this.requireAdminOrCoordinator(currentUser);

    const { page = 1, limit = 20, search, gender, state, country } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { hhaPatientId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (gender) where.gender = gender;
    if (state) where.state = state;
    if (country) where.country = country;

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.safeSelect(),
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: this.safeSelect(),
    });

    if (!patient) throw new NotFoundException('Patient not found');

    this.assertAccess(patient, currentUser);

    return patient;
  }

  async findMyProfile(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: this.safeSelect(),
    });

    if (!patient) throw new NotFoundException('Patient profile not found');
    return { ...patient, profilePhotoUrl: await this.signProfilePhotoUrl(patient.profilePhotoUrl) };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePatientDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertAccess(patient, currentUser);

    // Keep the user-level canonical photo in sync so admin/provider
    // dashboards (which read users) show the portal-uploaded photo too.
    // Ownership check guards both this write and the patient-row write below.
    if (dto.profilePhotoUrl) {
      this.assertOwnPhotoUrl(dto.profilePhotoUrl, patient.userId);
      await this.prisma.user
        .update({ where: { id: patient.userId }, data: { profilePhotoUrl: dto.profilePhotoUrl } })
        .catch(() => null);
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        nationality: dto.nationality,
        stateOfOrigin: dto.stateOfOrigin,
        lgaOfOrigin: dto.lgaOfOrigin,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        nextOfKinName: dto.nextOfKinName,
        nextOfKinRelationship: dto.nextOfKinRelationship,
        nextOfKinPhone: dto.nextOfKinPhone,
        medicalInfo: (dto.allergies || dto.chronicConditions) ? {
          upsert: {
            create: {
              allergies: dto.allergies ?? [],
              chronicConditions: dto.chronicConditions ?? [],
            },
            update: {
              allergies: dto.allergies,
              chronicConditions: dto.chronicConditions,
            }
          }
        } : undefined,
        nin: dto.nin,
        gdprConsent: dto.gdprConsent,
        marketingConsent: dto.marketingConsent,
        preferredTimezone: dto.preferredTimezone,
        preferredLanguage: dto.preferredLanguage,
        dateFormat: dto.dateFormat,
        profilePhotoUrl: dto.profilePhotoUrl,
      },
      select: this.safeSelect(),
    });

    await this.openemrService.enqueuePatientSync(updated.id).catch(err =>
      this.logger.error(`Failed to enqueue OpenEMR patient sync: ${err.message}`),
    );

    return { ...updated, profilePhotoUrl: await this.signProfilePhotoUrl(updated.profilePhotoUrl) };
  }

  // Generates a short-lived presigned GET URL from the stored profile photo URL.
  // The object is private on S3; the stored publicUrl is the canonical key-based
  // URL we derive the object key from.
  private async signProfilePhotoUrl(storedUrl: string | null | undefined): Promise<string | null> {
    if (!storedUrl) return null;
    const base = this.photoUrlBase;
    if (!storedUrl.startsWith(base)) return storedUrl; // external image — not our object
    const objectKey = storedUrl.slice(base.length);
    // Same avatar-only gate as S3Service.signStoredUrl: never presign a
    // non-avatar bucket object (e.g. a clinical record) that ended up in a
    // photo column — return null so the UI falls back to initials.
    if (!/^profile-photos\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/i.test(objectKey)) return null;
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: objectKey });
      return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    } catch {
      return null;
    }
  }

  async requestProfilePhotoUploadUrl(dto: RequestProfilePhotoUrlDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true, profilePhotoSizeBytes: true },
    });

    if (patient) {
      const { usedBytes, quotaBytes } = await this.storageService.getStorageUsage(patient.id);
      const currentPhotoSize = patient.profilePhotoSizeBytes ?? 0;
      const netIncrease = dto.sizeBytes - currentPhotoSize;
      if (quotaBytes !== null && usedBytes + netIncrease > quotaBytes) {
        throw new PaymentRequiredException(
          'You have reached your Free Plan storage limit. Please upgrade to continue uploading files.',
        );
      }
      await this.prisma.patient.update({
        where: { id: patient.id },
        data: { profilePhotoSizeBytes: dto.sizeBytes },
      });
    }

    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };
    const ext = extMap[dto.contentType] ?? 'jpg';
    const objectKey = `profile-photos/${currentUser.sub}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
      Metadata: { uploadedBy: currentUser.sub },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 }); // 10 min

    const publicUrl = this.config.get('S3_ENDPOINT')
      ? `${this.config.get('S3_ENDPOINT')}/${this.bucket}/${objectKey}`
      : `https://${this.bucket}.s3.${this.config.get('AWS_REGION', 'us-east-1')}.amazonaws.com/${objectKey}`;

    return { uploadUrl, objectKey, publicUrl };
  }

  // Downloads the just-uploaded raw photo from S3, applies optional crop,
  // resizes to max 1024 px on the longest side, converts to WebP at 85% quality,
  // uploads the processed image, updates the patient row, and deletes the original.
  async processProfilePhoto(dto: ProcessProfilePhotoDto, currentUser: JwtPayload) {
    const requiredPrefix = `profile-photos/${currentUser.sub}/`;
    if (!dto.objectKey.startsWith(requiredPrefix)) {
      throw new BadRequestException('objectKey must be a photo you uploaded via the upload URL endpoint');
    }

    // Download original from S3
    const getCmd = new GetObjectCommand({ Bucket: this.bucket, Key: dto.objectKey });
    const s3Obj = await this.s3.send(getCmd);
    const chunks: Uint8Array[] = [];
    for await (const chunk of s3Obj.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const inputBuffer = Buffer.concat(chunks);

    // Build Sharp pipeline
    let pipeline = sharp(inputBuffer);

    if (
      dto.cropLeft !== undefined &&
      dto.cropTop !== undefined &&
      dto.cropWidth !== undefined &&
      dto.cropHeight !== undefined
    ) {
      pipeline = pipeline.extract({
        left: Math.round(dto.cropLeft),
        top: Math.round(dto.cropTop),
        width: Math.round(dto.cropWidth),
        height: Math.round(dto.cropHeight),
      });
    }

    const processedBuffer = await pipeline
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload processed image under a new WebP key
    const newKey = `profile-photos/${currentUser.sub}/${randomUUID()}.webp`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: newKey,
        Body: processedBuffer,
        ContentType: 'image/webp',
        ContentLength: processedBuffer.byteLength,
        Metadata: { uploadedBy: currentUser.sub, processedFrom: dto.objectKey },
      }),
    );

    const newPublicUrl = this.config.get('S3_ENDPOINT')
      ? `${this.config.get('S3_ENDPOINT')}/${this.bucket}/${newKey}`
      : `https://${this.bucket}.s3.${this.config.get('AWS_REGION', 'us-east-1')}.amazonaws.com/${newKey}`;

    // Retrieve old photo URL before overwriting so we can delete the S3 object
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true, profilePhotoUrl: true },
    });

    await this.prisma.$transaction([
      this.prisma.patient.update({
        where: { userId: currentUser.sub },
        data: {
          profilePhotoUrl: newPublicUrl,
          profilePhotoSizeBytes: processedBuffer.byteLength,
        },
      }),
      this.prisma.user.update({
        where: { id: currentUser.sub },
        data: { profilePhotoUrl: newPublicUrl },
      }),
    ]);

    // Clean up: delete original upload and previous photo (best-effort)
    const oldPhotoKey = patient?.profilePhotoUrl
      ? this.extractObjectKey(patient.profilePhotoUrl)
      : null;

    const keysToDelete = [dto.objectKey];
    if (oldPhotoKey && oldPhotoKey !== dto.objectKey) keysToDelete.push(oldPhotoKey);

    for (const key of keysToDelete) {
      void this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch(err => this.logger.warn(`Could not delete S3 object ${key}: ${err instanceof Error ? err.message : err}`));
    }

    // Enqueue OpenEMR sync to propagate the new photo URL where supported
    if (patient) {
      void this.openemrService.enqueuePatientSync(patient.id)
        .catch(err => this.logger.error(`Failed to enqueue OpenEMR sync after photo update: ${err instanceof Error ? err.message : err}`));
    }

    return { profilePhotoUrl: await this.signProfilePhotoUrl(newPublicUrl) };
  }

  async removeProfilePhoto(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true, profilePhotoUrl: true },
    });
    if (!patient?.profilePhotoUrl) {
      throw new BadRequestException('No profile photo to remove');
    }

    const key = this.extractObjectKey(patient.profilePhotoUrl);

    await this.prisma.$transaction([
      this.prisma.patient.update({
        where: { userId: currentUser.sub },
        data: { profilePhotoUrl: null, profilePhotoSizeBytes: null },
      }),
      this.prisma.user.update({
        where: { id: currentUser.sub },
        data: { profilePhotoUrl: null },
      }),
    ]);

    if (key) {
      void this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch(err => this.logger.warn(`Could not delete photo S3 object ${key}: ${err instanceof Error ? err.message : err}`));
    }

    void this.openemrService.enqueuePatientSync(patient.id)
      .catch(err => this.logger.error(`Failed to enqueue OpenEMR sync after photo removal: ${err instanceof Error ? err.message : err}`));

    return { message: 'Profile photo removed' };
  }

  // Extract the S3 object key from a stored public photo URL.
  private extractObjectKey(url: string): string | null {
    try {
      const base = this.photoUrlBase;
      return url.startsWith(base) ? url.slice(base.length) : null;
    } catch {
      return null;
    }
  }

  // ── Self-service: Request Data Export ────────────────────────────────────

  async requestExport(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: { email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.notifications.sendEmail(
      user.email,
      'MyHealth Vault+™ — Data Export Request Received',
      'We have received your data export request. Your full health records, appointments, and account data will be compiled and sent to this email address within 24 hours.',
      currentUser.sub,
    );

    return { message: "Data export requested. You'll receive an email within 24 hours." };
  }

  // ── Self-service: Deactivate Account ─────────────────────────────────────

  async selfDeactivate(currentUser: JwtPayload, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) throw new NotFoundException('Account not found or already inactive');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new BadRequestException('Incorrect password');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: currentUser.sub },
        data: { isActive: false, deletedAt: new Date() },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: currentUser.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.notifications.sendEmail(
      user.email,
      'MyHealth Vault+™ — Account Deactivated',
      'Your MyHealth Vault+™ account has been deactivated. Your data is retained and recoverable. To reactivate, please contact support@healthhubafrica.com.',
      currentUser.sub,
    );

    return { message: 'Account deactivated. A confirmation email has been sent.' };
  }

  // ── Soft Delete (Admin only) ──────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    this.requireAdminOrCoordinator(currentUser);

    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');

    await this.prisma.user.update({
      where: { id: patient.userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'Patient account deactivated' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private safeSelect() {
    return {
      id: true,
      userId: true,
      hhaPatientId: true,
      regionCode: true,
      firstName: true,
      lastName: true,
      middleName: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      nationality: true,
      stateOfOrigin: true,
      lgaOfOrigin: true,
      address: true,
      city: true,
      state: true,
      country: true,
      nextOfKinName: true,
      nextOfKinRelationship: true,
      nextOfKinPhone: true,
      medicalInfo: {
        select: {
          allergies: true,
          chronicConditions: true,
          activeMedications: true,
          immunizations: true,
          activeCarePlan: true,
        }
      },
      emergencyContacts: {
        select: {
          id: true,
          fullName: true,
          relationship: true,
          phone: true,
          email: true,
          isPrimary: true,
        }
      },
      nin: true,
      status: true,
      openemrSyncStatus: true,
      gdprConsent: true,
      marketingConsent: true,
      preferredTimezone: true,
      preferredLanguage: true,
      dateFormat: true,
      profilePhotoUrl: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          email: true,
          phone: true,
          isVerified: true,
          lastLoginAt: true,
        },
      },
    };
  }

  private assertAccess(patient: { userId: string }, currentUser: JwtPayload) {
    const isAdmin = (
      [UserRole.admin, UserRole.super_admin, UserRole.coordinator] as string[]
    ).includes(currentUser.role);

    if (!isAdmin && patient.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireAdminOrCoordinator(user: JwtPayload) {
    const allowed = [UserRole.admin, UserRole.super_admin, UserRole.coordinator] as string[];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
