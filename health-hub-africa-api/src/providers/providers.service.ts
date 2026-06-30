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

// The DTO captures a richer profile than the schema stores. Structured
// details without dedicated columns are appended to the bio text so the
// information survives.
function buildBio(dto: Partial<CreateProviderDto>): string | undefined {
  const details = [
    dto.bio,
    dto.qualifications ? `Qualifications: ${dto.qualifications}` : null,
    dto.subSpecializations?.length
      ? `Sub-specializations: ${dto.subSpecializations.join(', ')}`
      : null,
    dto.licenseBody ? `License body: ${dto.licenseBody}` : null,
    dto.licenseCountry ? `License country: ${dto.licenseCountry}` : null,
    dto.currentHospital ? `Hospital: ${dto.currentHospital}` : null,
    dto.currentDepartment ? `Department: ${dto.currentDepartment}` : null,
    [dto.officeAddress, dto.officeCity, dto.officeState, dto.officeCountry]
      .filter(Boolean)
      .join(', ') || null,
  ].filter(Boolean);
  return details.length ? details.join('\n') : undefined;
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

      return tx.provider.create({
        data: {
          userId: targetUser.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          title: TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
          specialty: dto.specialization ?? dto.providerType,
          licenseNumber: dto.licenseNumber,
          yearsExperience: dto.yearsOfExperience ?? 0,
          bio: buildBio(dto),
          isAvailable: dto.acceptsVirtualConsults ?? true,
          profilePhotoUrl: dto.profilePhotoUrl,
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
      select: { id: true, userId: true },
    });

    if (!provider) throw new NotFoundException('Provider not found');
    this.assertOwnerOrAdmin(provider, currentUser);

    const bio = buildBio(dto);

    // If a credential-affecting field changes, the prior admin verification
    // no longer applies — clear it so the row stops syncing to OpenEMR and
    // stops accepting bookings until an admin re-verifies the new values.
    // Cosmetic edits (bio, photo, availability, years of experience) don't
    // invalidate the verification.
    const isCredentialChange =
      (dto.licenseNumber !== undefined && dto.licenseNumber !== null) ||
      (dto.specialization !== undefined && dto.specialization !== null) ||
      (dto.providerType !== undefined);

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.providerType !== undefined && {
          title: TITLE_BY_TYPE[dto.providerType] ?? 'Dr.',
        }),
        ...(dto.specialization !== undefined && { specialty: dto.specialization }),
        ...(dto.licenseNumber !== undefined && { licenseNumber: dto.licenseNumber }),
        ...(dto.yearsOfExperience !== undefined && { yearsExperience: dto.yearsOfExperience }),
        ...(bio !== undefined && { bio }),
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
      rating: true,
      totalPatients: true,
      isAvailable: true,
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
