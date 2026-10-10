import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmergencyContactDto, UpdateEmergencyContactDto } from './dto/emergency-contact.dto';

const MAX_CONTACTS_PER_PATIENT = 5;

@Injectable()
export class EmergencyContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(patientId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { patientId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(patientId: string, dto: CreateEmergencyContactDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.emergencyContact.count({ where: { patientId } });
      if (existing >= MAX_CONTACTS_PER_PATIENT) {
        throw new BadRequestException(`You can save up to ${MAX_CONTACTS_PER_PATIENT} emergency contacts.`);
      }
      // The first contact is always the primary one.
      const isPrimary = existing === 0 || dto.isPrimary === true;
      if (isPrimary && existing > 0) {
        await tx.emergencyContact.updateMany({ where: { patientId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.emergencyContact.create({ data: { ...dto, patientId, isPrimary } });
    });
  }

  async update(patientId: string, id: string, dto: UpdateEmergencyContactDto) {
    const owned = await this.prisma.emergencyContact.findFirst({ where: { id, patientId }, select: { id: true } });
    if (!owned) throw new NotFoundException('Emergency contact not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.emergencyContact.updateMany({ where: { patientId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.emergencyContact.update({ where: { id }, data: dto });
    });
  }

  async remove(patientId: string, id: string) {
    const owned = await this.prisma.emergencyContact.findFirst({ where: { id, patientId }, select: { id: true } });
    if (!owned) throw new NotFoundException('Emergency contact not found');
    await this.prisma.emergencyContact.delete({ where: { id } });
    return { deleted: true };
  }
}
