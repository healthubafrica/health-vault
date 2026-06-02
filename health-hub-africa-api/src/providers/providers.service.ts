import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateProviderDto, currentUser: JwtPayload) {
    const existing = await this.prisma.provider.findUnique({
      where: { userId: currentUser.sub },
    });
    if (existing) throw new ConflictException('Provider profile already exists');

    const provider = await this.prisma.provider.create({
      data: {
        userId: currentUser.sub,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        providerType: dto.providerType,
        specialization: dto.specialization,
        subSpecializations: dto.subSpecializations ?? [],
        qualifications: dto.qualifications,
        licenseNumber: dto.licenseNumber,
        licenseBody: dto.licenseBody,
        licenseCountry: dto.licenseCountry,
        yearsOfExperience: dto.yearsOfExperience,
        bio: dto.bio,
        currentHospital: dto.currentHospital,
        currentDepartment: dto.currentDepartment,
        officeAddress: dto.officeAddress,
        officeCity: dto.officeCity,
        officeState: dto.officeState,
        officeCountry: dto.officeCountry,
        acceptsVirtualConsults: dto.acceptsVirtualConsults ?? true,
        acceptsEmergencies: dto.acceptsEmergencies ?? false,
        consultationFeeKobo: dto.consultationFeeKobo,
        preferredTimezone: dto.preferredTimezone ?? 'Africa/Lagos',
        profilePhotoUrl: dto.profilePhotoUrl,
      },
      select: this.safeSelect(),
    });

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
      city,
      country,
      acceptsVirtualConsults,
      isVerified,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (providerType) where.providerType = providerType;
    if (specialization)
      where.specialization = { contains: specialization, mode: 'insensitive' };
    if (city) where.officeCity = { contains: city, mode: 'insensitive' };
    if (country) where.officeCountry = country;
    if (acceptsVirtualConsults !== undefined)
      where.acceptsVirtualConsults = acceptsVirtualConsults;
    if (isVerified !== undefined) where.isVerified = isVerified;

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

    return this.prisma.provider.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        providerType: dto.providerType,
        specialization: dto.specialization,
        subSpecializations: dto.subSpecializations,
        qualifications: dto.qualifications,
        licenseNumber: dto.licenseNumber,
        licenseBody: dto.licenseBody,
        licenseCountry: dto.licenseCountry,
        yearsOfExperience: dto.yearsOfExperience,
        bio: dto.bio,
        currentHospital: dto.currentHospital,
        currentDepartment: dto.currentDepartment,
        officeAddress: dto.officeAddress,
        officeCity: dto.officeCity,
        officeState: dto.officeState,
        officeCountry: dto.officeCountry,
        acceptsVirtualConsults: dto.acceptsVirtualConsults,
        acceptsEmergencies: dto.acceptsEmergencies,
        consultationFeeKobo: dto.consultationFeeKobo,
        preferredTimezone: dto.preferredTimezone,
        profilePhotoUrl: dto.profilePhotoUrl,
      },
      select: this.safeSelect(),
    });
  }

  // ── Verify Provider (Admin only) ──────────────────────────────────────────

  async verify(id: string, currentUser: JwtPayload) {
    this.requireAdmin(currentUser);

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.prisma.provider.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date() },
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
      middleName: true,
      providerType: true,
      specialization: true,
      subSpecializations: true,
      qualifications: true,
      licenseNumber: true,
      licenseBody: true,
      licenseCountry: true,
      yearsOfExperience: true,
      bio: true,
      currentHospital: true,
      currentDepartment: true,
      officeAddress: true,
      officeCity: true,
      officeState: true,
      officeCountry: true,
      acceptsVirtualConsults: true,
      acceptsEmergencies: true,
      consultationFeeKobo: true,
      isVerified: true,
      verifiedAt: true,
      averageRating: true,
      totalReviews: true,
      preferredTimezone: true,
      profilePhotoUrl: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: { email: true, phone: true },
      },
    };
  }

  private assertOwnerOrAdmin(provider: { userId: string }, currentUser: JwtPayload) {
    const isAdmin = [UserRole.admin, UserRole.super_admin].includes(
      currentUser.role as UserRole,
    );
    if (!isAdmin && provider.userId !== currentUser.sub) {
      throw new ForbiddenException('Access denied');
    }
  }

  private requireAdmin(user: JwtPayload) {
    if (![UserRole.admin, UserRole.super_admin].includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
