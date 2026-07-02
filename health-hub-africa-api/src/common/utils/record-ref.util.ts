import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates the next sequential HHA clinical record reference for the
 * current year: REC-YYYY-000001, REC-YYYY-000002, ...
 *
 * Shared by RecordsService and DocumentsService so both record-creation
 * paths draw from the same per-year sequence.
 */
export async function generateRecordRef(prisma: PrismaService): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const last = await prisma.clinicalRecord.findFirst({
    where: { hhaRef: { startsWith: prefix } },
    orderBy: { hhaRef: 'desc' },
    select: { hhaRef: true },
  });
  const seq = last ? parseInt(last.hhaRef.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}
