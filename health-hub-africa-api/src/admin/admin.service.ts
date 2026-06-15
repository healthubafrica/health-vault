import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  CreateFacilityDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Users ─────────────────────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { patient: { firstName: { contains: search, mode: 'insensitive' } } },
            { patient: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          patient: { select: { id: true, firstName: true, lastName: true, hhaPatientId: true } },
          provider: { select: { id: true, firstName: true, lastName: true, isAvailable: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, currentUser: JwtPayload) {
    this.requireSuperAdmin(currentUser);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async getAuditLogs(page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;
    const where: any = userId ? { actorId: userId } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Facilities ─────────────────────────────────────────────────────────────

  async listFacilities(page = 1, limit = 20, country?: string) {
    const skip = (page - 1) * limit;
    // The facility model has no country column — match on state/city instead.
    const where: any = country
      ? {
          OR: [
            { state: { contains: country, mode: 'insensitive' } },
            { city: { contains: country, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.healthcareFacility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.healthcareFacility.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // Map the facility DTO onto schema columns. Contact details have no
  // dedicated columns and are appended to the address text.
  private toFacilityData(dto: Partial<CreateFacilityDto>) {
    const address =
      [dto.address, dto.phone ? `Tel: ${dto.phone}` : null, dto.email]
        .filter(Boolean)
        .join(' | ') || undefined;
    return {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { facilityType: dto.type }),
      ...(address !== undefined && { address }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
    };
  }

  async createFacility(dto: CreateFacilityDto) {
    return this.prisma.healthcareFacility.create({
      data: {
        name: dto.name,
        facilityType: dto.type ?? 'general',
        ...this.toFacilityData({ ...dto, name: undefined, type: undefined }),
      },
    });
  }

  async updateFacility(id: string, dto: Partial<CreateFacilityDto>) {
    const facility = await this.prisma.healthcareFacility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    return this.prisma.healthcareFacility.update({
      where: { id },
      data: this.toFacilityData(dto),
    });
  }

  async deleteFacility(id: string) {
    const facility = await this.prisma.healthcareFacility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    // Hard delete — the model has no soft-delete flag. Refuse when the
    // facility is referenced by dispatch or triage records.
    try {
      await this.prisma.healthcareFacility.delete({ where: { id } });
    } catch {
      throw new ForbiddenException(
        'Facility is referenced by dispatch records and cannot be deleted',
      );
    }
    return { message: 'Facility deleted' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private requireSuperAdmin(user: JwtPayload) {
    if (user.role !== UserRole.super_admin) {
      throw new ForbiddenException('Super admin access required');
    }
  }
}
