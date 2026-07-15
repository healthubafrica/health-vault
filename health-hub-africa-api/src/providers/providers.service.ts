import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpenemrService } from '../openemr/openemr.service';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';
import { CreateProviderNotificationEmailDto } from './dto/provider-notification-email.dto';
import { normalizeProviderName } from '../common/utils/provider-name.util';

// Structured professional-profile fields now have dedicated columns. `bio`
// stays free-text biography only. Legacy inputs (qualifications as a string,
// currentHospital/office* which map to the clinic columns) are folded into the
// structured shape here so older callers keep working.
export function buildProfileData(dto: Partial<CreateProviderDto>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (dto.bio !== undefined) data.bio = dto.bio;
  if (dto.subSpecializations !== undefined) data.subspecialties = dto.subSpecializations;
  if (dto.certifications !== undefined) data.certifications = dto.certifications;
  if (dto.professionalMemberships !== undefined) data.professionalMemberships = dto.professionalMemberships;
  if (dto.languages !== undefined) data.languages = dto.languages;
  if (dto.clinicalInterests !== undefined) data.clinicalInterests = dto.clinicalInterests;
  if (dto.consultationServices !== undefined) data.consultationServices = dto.consultationServices;
  if (dto.clinicName !== undefined) data.clinicName = dto.clinicName;
  if (dto.clinicState !== undefined) data.clinicState = dto.clinicState;
  if (dto.clinicCity !== undefined) data.clinicCity = dto.clinicCity;

  // qualifications: prefer the structured list; fall back to splitting the
  // legacy free-text string on commas/newlines.
  if (dto.qualificationsList !== undefined) {
    data.qualifications = dto.qualificationsList;
  } else if (dto.qualifications !== undefined) {
    data.qualifications = dto.qualifications
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // clinicAddress: explicit column wins; otherwise fold legacy office* /
  // currentHospital fields into the single clinic address line.
  if (dto.clinicAddress !== undefined) {
    data.clinicAddress = dto.clinicAddress;
  } else {
    const legacyAddress = [dto.officeAddress, dto.officeCity, dto.officeState, dto.officeCountry]
      .filter(Boolean)
      .join(', ');
    if (legacyAddress) data.clinicAddress = legacyAddress;
  }
  if (dto.clinicName === undefined && dto.currentHospital !== undefined) {
    data.clinicName = dto.currentHospital;
  }

  return data;
}

const TITLE_BY_TYPE: Record<string, string> = {
  DOCTOR: 'Dr.',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharm.',
  PHYSIOTHERAPIST: 'PT',
  SPECIALIST: 'Dr.',
  RADIOLOGIST: 'Dr.',
};

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateProviderDto, currentUser: JwtPayload) {
    // Belt-and-braces — the controller @Roles already restricts to admin /
    // super_admin, but the service-level check survives if the decorator
    // is ever loosened by mistake.
    this.requireAdmin(currentUser);

    // Forbid the long-standing footgun: admins (or anyone else with the
    // role) cannot create a provider profile *for themselves* through this
    // endpoint. If an admin should also be a provider, do it from a
    // different admin account.
    if (dto.userId === currentUser.sub) {
      throw new ForbiddenException(
        'Admins cannot create a provider profile for themselves through this endpoint',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, isActive: true, deletedAt: true, provider: { select: { id: true } } },
    });
    if (!targetUser || targetUser.deletedAt || !targetUser.isActive) {
      throw new NotFoundException('Target user not found or inactive');
    }
    if (targetUser.provider) {
      throw new ConflictException('Provider profile already exists for this user');
    }

    // Atomic: promote role if needed, revoke any in-flight sessions so the
    // role change takes effect on the next request, and insert the
    // Provider row. Sessions revocation matches the pattern in
    // AdminService.updateUserRole — the user has to re-login to pick up
    // the new role and downstream JWT.providerId.
    const provider = await this.prisma.$transaction(async (tx) => {
      if (targetUser.role !== UserRole.provider) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: { role: UserRole.provider },
        });
        await tx.userSession.updateMany({
          where: { userId: targetUser.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      const normalized = normalizeProviderName(
        dto.firstName,
        dto.lastName,
        TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
      );

      return tx.provider.create({
        data: {
          userId: targetUser.id,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          title: normalized.title,
          specialty: dto.specialization ?? dto.providerType,
          licenseNumber: dto.licenseNumber,
          yearsExperience: dto.yearsOfExperience ?? 0,
          isAvailable: dto.acceptsVirtualConsults ?? true,
          profilePhotoUrl: dto.profilePhotoUrl,
          ...buildProfileData(dto),
          // verifiedAt intentionally null — sync stays paused and the
          // appointment booking gate stays closed until an admin clicks
          // Verify after reviewing the license.
        },
        select: this.safeSelect(),
      });
    });

    this.logger.log(
      `Provider ${provider.id} created by admin ${currentUser.sub} for user ${dto.userId} — awaiting verification`,
    );

    return provider;
  }

  // ── Find All ──────────────────────────────────────────────────────────────

  async findAll(query: QueryProvidersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      providerType,
      specialization,
      acceptsVirtualConsults,
      isVerified,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (specialization) {
      where.specialty = { contains: specialization, mode: 'insensitive' };
    } else if (providerType) {
      // Provider type has no dedicated column; it is reflected in specialty
      where.specialty = { contains: providerType, mode: 'insensitive' };
    }
    if (acceptsVirtualConsults !== undefined) where.isAvailable = acceptsVirtualConsults;
    if (isVerified !== undefined) where.user = { isVerified };

    const [data, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.safeSelect(),
      }),
      this.prisma.provider.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: this.safeSelect(),
    });

    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  async findMyProfile(currentUser: JwtPayload) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId: currentUser.sub },
      select: this.safeSelect(),
    });

    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProviderDto, currentUser: JwtPayload) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      select: { id: true, userId: true, firstName: true, lastName: true, title: true },
    });

    if (!provider) throw new NotFoundException('Provider not found');
    this.assertOwnerOrAdmin(provider, currentUser);

    const profileData = buildProfileData(dto);

    // If a credential-affecting field changes, the prior admin verification
    // no longer applies — clear it so the row stops syncing to OpenEMR and
    // stops accepting bookings until an admin re-verifies the new values.
    // Cosmetic edits (bio, photo, availability, years of experience) don't
    // invalidate the verification.
    const isCredentialChange =
      (dto.licenseNumber !== undefined && dto.licenseNumber !== null) ||
      (dto.specialization !== undefined && dto.specialization !== null) ||
      (dto.providerType !== undefined);

    const normalized = normalizeProviderName(
      dto.firstName ?? provider.firstName,
      dto.lastName ?? provider.lastName,
      dto.providerType !== undefined ? (TITLE_BY_TYPE[dto.providerType] ?? 'Dr.') : provider.title,
    );

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: normalized.firstName }),
        ...(dto.lastName !== undefined && { lastName: normalized.lastName }),
        ...((dto.firstName !== undefined || dto.lastName !== undefined || dto.providerType !== undefined) && {
          title: normalized.title,
        }),
        ...(dto.specialization !== undefined && { specialty: dto.specialization }),
        ...(dto.licenseNumber !== undefined && { licenseNumber: dto.licenseNumber }),
        ...(dto.yearsOfExperience !== undefined && { yearsExperience: dto.yearsOfExperience }),
        ...profileData,
        ...(dto.acceptsVirtualConsults !== undefined && {
          isAvailable: dto.acceptsVirtualConsults,
        }),
        ...(dto.profilePhotoUrl !== undefined && { profilePhotoUrl: dto.profilePhotoUrl }),
        ...(isCredentialChange && { verifiedAt: null, verifiedBy: null }),
      },
      select: this.safeSelect(),
    });

    if (isCredentialChange) {
      this.logger.warn(
        `Provider ${updated.id} credentials changed — verification reset, OpenEMR sync paused until admin re-verifies`,
      );
    }

    // Credential changes reset verifiedAt, so no sync should happen. For
    // cosmetic edits the processor checks verifiedAt itself and no-ops when
    // still unverified — so it's safe to enqueue without a DB re-read.
    if (!isCredentialChange) {
      await this.openemrService.enqueueProviderSync(updated.id).catch((err) =>
        this.logger.error(`Failed to enqueue OpenEMR provider sync: ${err.message}`),
      );
    }

    return updated;
  }

  // Self-service update — resolves the caller's own provider id, then reuses
  // the same update() path (validation, verification-reset, sync).
  async updateMyProfile(dto: UpdateProviderDto, currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    return this.update(providerId, dto, currentUser);
  }

  // ── Verify Provider (Admin only) ──────────────────────────────────────────

  async verify(id: string, currentUser: JwtPayload) {
    this.requireAdmin(currentUser);

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');

    // Stamp the provider-side verification fields. We deliberately do NOT
    // touch User.isVerified here — that one is set by signup OTP and is
    // about account ownership, not clinical credentials.
    await this.prisma.provider.update({
      where: { id },
      data: { verifiedAt: new Date(), verifiedBy: currentUser.sub },
    });

    // OpenEMR sync is gated on verifiedAt, so the original create/update
    // enqueues were no-ops until now. Push the (now verified) profile.
    await this.openemrService.enqueueProviderSync(provider.id).catch((err) =>
      this.logger.error(`Failed to enqueue OpenEMR provider sync after verify: ${err.message}`),
    );

    return this.prisma.provider.findUnique({
      where: { id },
      select: this.safeSelect(),
    });
  }

  // ── Soft Delete (Admin only) ──────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    this.requireAdmin(currentUser);

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.user.update({
      where: { id: provider.userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { message: 'Provider account deactivated' };
  }

  // ── Notification Emails (self-service) ────────────────────────────────────

  async listMyNotificationEmails(currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    return this.prisma.providerNotificationEmail.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMyNotificationEmail(dto: CreateProviderNotificationEmailDto, currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    return this.prisma.providerNotificationEmail.create({
      data: { providerId, label: dto.label, email: dto.email, addedBy: currentUser.sub },
    });
  }

  async removeMyNotificationEmail(emailId: string, currentUser: JwtPayload) {
    const providerId = await this.resolveOwnProviderId(currentUser);
    const row = await this.prisma.providerNotificationEmail.findUnique({ where: { id: emailId } });
    if (!row || row.providerId !== providerId) throw new NotFoundException('Notification email not found');
    await this.prisma.providerNotificationEmail.delete({ where: { id: emailId } });
    return { message: 'Notification email removed' };
  }

  // Prefers the providerId already embedded in the JWT (set at login); falls
  // back to a DB lookup only for tokens issued before the provider row
  // existed. Never trusts a client-supplied provider id for /me routes.
  private async resolveOwnProviderId(currentUser: JwtPayload): Promise<string> {
    if (currentUser.providerId) return currentUser.providerId;
    const provider = await this.prisma.provider.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider.id;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private safeSelect() {
    return {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      title: true,
      specialty: true,
      licenseNumber: true,
      yearsExperience: true,
      bio: true,
      subspecialties: true,
      qualifications: true,
      certifications: true,
      professionalMemberships: true,
      languages: true,
      clinicalInterests: true,
      consultationServices: true,
      clinicName: true,
      clinicAddress: true,
      clinicCity: true,
      clinicState: true,
      rating: true,
      totalPatients: true,
      isAvailable: true,
      verifiedAt: true,
      profilePhotoUrl: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: { email: true, phone: true, isVerified: true },
      },
    };
  }

  private assertOwnerOrAdmin(provider: { userId: string }, currentUser: JwtPayload) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin];
    const isAdmin = adminRoles.includes(currentUser.role as UserRole);
    if (!isAdmin && provider.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireAdmin(user: JwtPayload) {
    const adminRoles: UserRole[] = [UserRole.admin, UserRole.super_admin];
    if (!adminRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
