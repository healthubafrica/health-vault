// Trigger CI/CD deploy with new IAM role permissions
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { RequestProfilePhotoUrlDto } from './dto/profile-photo-upload.dto';

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
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
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

    return patient;
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
    return patient;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePatientDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');
    this.assertAccess(patient, currentUser);

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
        profilePhotoUrl: dto.profilePhotoUrl,
      },
      select: this.safeSelect(),
    });

    return updated;
  }

  async requestProfilePhotoUploadUrl(dto: RequestProfilePhotoUrlDto, currentUser: JwtPayload) {
    const ext = dto.contentType === 'image/png' ? 'png' : dto.contentType === 'image/webp' ? 'webp' : 'jpg';
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
