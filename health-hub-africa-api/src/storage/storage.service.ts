import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number | null;
}

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async getStorageUsage(patientId: string): Promise<StorageUsage> {
    const [agg, patient] = await Promise.all([
      this.prisma.clinicalRecord.aggregate({
        where: { patientId, fileSizeBytes: { not: null }, deletedAt: null },
        _sum: { fileSizeBytes: true },
      }),
      this.prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          profilePhotoSizeBytes: true,
          storageQuotaOverrideBytes: true,
          subscriptions: {
            where: { status: { in: ['active', 'trial'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { plan: { select: { storageQuotaBytes: true } } },
          },
        },
      }),
    ]);

    const clinicalBytes = Number(agg._sum.fileSizeBytes ?? 0);
    const photoBytes = patient?.profilePhotoSizeBytes ?? 0;
    const usedBytes = clinicalBytes + photoBytes;

    const override = patient?.storageQuotaOverrideBytes;
    const planQuota = patient?.subscriptions[0]?.plan?.storageQuotaBytes ?? null;
    const quotaBytes =
      override != null ? Number(override) : planQuota != null ? Number(planQuota) : null;

    return { usedBytes, quotaBytes };
  }
}
