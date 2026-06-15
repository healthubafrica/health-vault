import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateConsentDto } from './dto/create-consent.dto';

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertConsent(dto: CreateConsentDto, currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.patientConsent.upsert({
      where: {
        patientId_consentType: {
          patientId: patient.id,
          consentType: dto.consentType,
        },
      },
      create: {
        patientId: patient.id,
        consentType: dto.consentType,
        granted: dto.granted,
        version: dto.version ?? '1.0',
        notes: dto.notes,
        grantedAt: dto.granted ? new Date() : undefined,
        revokedAt: !dto.granted ? new Date() : undefined,
      },
      update: {
        granted: dto.granted,
        version: dto.version,
        notes: dto.notes,
        grantedAt: dto.granted ? new Date() : undefined,
        revokedAt: !dto.granted ? new Date() : undefined,
      },
    });
  }

  async findMyConsents(currentUser: JwtPayload) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found');

    return this.prisma.patientConsent.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
