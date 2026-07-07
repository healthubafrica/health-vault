import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TravelSafeStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateTravelSafeTripDto } from './dto/create-trip.dto';
import { UpdateTravelSafeTripDto } from './dto/update-trip.dto';

const ADMIN_ROLES: UserRole[] = [UserRole.admin, UserRole.super_admin, UserRole.coordinator];

@Injectable()
export class TravelsafeService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(user: JwtPayload): Promise<string> {
    if (user.patientId) return user.patientId;
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient.id;
  }

  async create(dto: CreateTravelSafeTripDto, user: JwtPayload) {
    const patientId = await this.resolvePatientId(user);
    return this.prisma.travelSafeTrip.create({
      data: {
        patientId,
        partnerCode: dto.partnerCode,
        partnerName: dto.partnerName,
        destinationCountry: dto.destinationCountry,
        departureDate: new Date(dto.departureDate),
        returnDate: dto.returnDate ? new Date(dto.returnDate) : undefined,
        purpose: dto.purpose,
        notes: dto.notes,
      },
    });
  }

  async findAll(user: JwtPayload) {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    const where = isAdmin ? {} : { patientId: await this.resolvePatientId(user) };
    return this.prisma.travelSafeTrip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const trip = await this.prisma.travelSafeTrip.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    if (!isAdmin && trip.patient.userId !== user.sub) throw new ForbiddenException('Access denied');
    return trip;
  }

  async update(id: string, dto: UpdateTravelSafeTripDto, user: JwtPayload) {
    await this.findOne(id, user);
    return this.prisma.travelSafeTrip.update({
      where: { id },
      data: {
        ...(dto.partnerCode !== undefined && { partnerCode: dto.partnerCode }),
        ...(dto.partnerName !== undefined && { partnerName: dto.partnerName }),
        ...(dto.destinationCountry && { destinationCountry: dto.destinationCountry }),
        ...(dto.departureDate && { departureDate: new Date(dto.departureDate) }),
        ...(dto.returnDate !== undefined && {
          returnDate: dto.returnDate ? new Date(dto.returnDate) : null,
        }),
        ...(dto.purpose !== undefined && { purpose: dto.purpose }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status as TravelSafeStatus }),
      },
    });
  }

  async remove(id: string, user: JwtPayload) {
    await this.findOne(id, user);
    await this.prisma.travelSafeTrip.delete({ where: { id } });
    return { deleted: true };
  }

  async getSummary(id: string, user: JwtPayload) {
    const trip = await this.prisma.travelSafeTrip.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            bloodGroup: true,
            genotype: true,
            nextOfKinName: true,
            nextOfKinRelationship: true,
            nextOfKinPhone: true,
            medicalInfo: {
              select: { allergies: true, chronicConditions: true, activeMedications: true },
            },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    if (!isAdmin && trip.patient.userId !== user.sub) throw new ForbiddenException('Access denied');

    const { patient, ...tripData } = trip;
    return {
      trip: tripData,
      patient: {
        name: `${patient.firstName} ${patient.lastName}`,
        dateOfBirth: patient.dateOfBirth,
        bloodGroup: patient.bloodGroup,
        genotype: patient.genotype,
        nextOfKin: {
          name: patient.nextOfKinName,
          relationship: patient.nextOfKinRelationship,
          phone: patient.nextOfKinPhone,
        },
        allergies: patient.medicalInfo?.allergies ?? [],
        chronicConditions: patient.medicalInfo?.chronicConditions ?? [],
        activeMedications: patient.medicalInfo?.activeMedications ?? [],
      },
    };
  }
}
