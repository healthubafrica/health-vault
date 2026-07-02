import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number | null;
  fileCount: number;
  maxFiles: number | null;
  maxFileSizeBytes: number | null;
}

const BYTES_PER_MB = 1024 * 1024;

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async getStorageUsage(patientId: string): Promise<StorageUsage> {
    const [agg, fileCount, patient] = await Promise.all([
      this.prisma.clinicalRecord.aggregate({
        where: { patientId, fileSizeBytes: { not: null }, deletedAt: null },
        _sum: { fileSizeBytes: true },
      }),
      this.prisma.clinicalRecord.count({
        where: { patientId, fileUrl: { not: null }, deletedAt: null },
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
            select: {
              plan: {
                select: {
                  storageQuotaBytes: true,
                  maxFileSizeBytes: true,
                  maxFiles: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const clinicalBytes = Number(agg._sum.fileSizeBytes ?? 0);
    const photoBytes = patient?.profilePhotoSizeBytes ?? 0;
    const usedBytes = clinicalBytes + photoBytes;

    const plan = patient?.subscriptions[0]?.plan;
    const override = patient?.storageQuotaOverrideBytes;
    const planQuota = plan?.storageQuotaBytes ?? null;
    const quotaBytes =
      override != null ? Number(override) : planQuota != null ? Number(planQuota) : null;

    const maxFileSizeBytes =
      plan?.maxFileSizeBytes != null ? Number(plan.maxFileSizeBytes) : null;
    const maxFiles = plan?.maxFiles ?? null;

    return { usedBytes, quotaBytes, fileCount, maxFiles, maxFileSizeBytes };
  }

  /**
   * Enforces plan upload limits (per-file size, total storage, file count)
   * before a presigned upload is issued.
   *
   * @param opts.replacingBytes When replacing an existing file, the size of
   *   the file being replaced — subtracted from the storage projection and
   *   the file-count check is skipped (net file count is unchanged).
   * @throws PaymentRequiredException when any plan limit would be exceeded.
   */
  async assertUploadAllowed(
    patientId: string,
    sizeBytes: number,
    opts?: { replacingBytes?: number },
  ): Promise<void> {
    const { usedBytes, quotaBytes, fileCount, maxFiles, maxFileSizeBytes } =
      await this.getStorageUsage(patientId);

    if (maxFileSizeBytes != null && sizeBytes > maxFileSizeBytes) {
      const limitMb = Math.round(maxFileSizeBytes / BYTES_PER_MB);
      throw new PaymentRequiredException(
        `File exceeds your plan's ${limitMb}MB per-file limit. Upgrade to upload larger files.`,
      );
    }

    const projectedBytes = usedBytes - (opts?.replacingBytes ?? 0) + sizeBytes;
    if (quotaBytes != null && projectedBytes > quotaBytes) {
      throw new PaymentRequiredException(
        'You have reached your plan\'s storage limit. Please upgrade to continue uploading files.',
      );
    }

    const isReplacing = opts?.replacingBytes !== undefined;
    if (!isReplacing && maxFiles != null && fileCount >= maxFiles) {
      throw new PaymentRequiredException(
        `You have reached your plan's ${maxFiles}-file limit. Please upgrade to upload more files.`,
      );
    }
  }
}
