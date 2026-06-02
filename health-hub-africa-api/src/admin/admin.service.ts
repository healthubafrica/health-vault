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
          provider: { select: { id: true, firstName: true, lastName: true, isVerified: true } },
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
    const where: any = userId ? { userId } : {};

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Facilities ─────────────────────────────────────────────────────────────

  async listFacilities(page = 1, limit = 20, country?: string) {
    const skip = (page - 1) * limit;
    const where: any = country ? { country } : {};

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.facility.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async createFacility(dto: CreateFacilityDto) {
    return this.prisma.facility.create({ data: dto });
  }

  async updateFacility(id: string, dto: Partial<CreateFacilityDto>) {
    const facility = await this.prisma.facility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    return this.prisma.facility.update({ where: { id }, data: dto });
  }

  async deleteFacility(id: string) {
    const facility = await this.prisma.facility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');

    await this.prisma.facility.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Facility deactivated' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private requireSuperAdmin(user: JwtPayload) {
    if (user.role !== UserRole.super_admin) {
      throw new ForbiddenException('Super admin access required');
    }
  }
}
