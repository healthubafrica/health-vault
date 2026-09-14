import { PaymentGateway } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Spec §25 — daily rollups for RevenueSummary.
 *
 * Scope note: RevenueSummary.serviceType is nullable and this first slice
 * always writes it as null (gateway-level rollup only, mirroring the
 * existing `getRevenueReport()` grouping). `PaymentLineItem.referenceType`
 * is the only column that could map a payment back to a ServiceType, but it
 * is never populated anywhere in the codebase today (verified via a
 * repo-wide search) — mapping against it would silently produce zeros
 * dressed up as real per-service revenue. Left as a documented gap rather
 * than guessed at.
 */

export interface RevenueBucket {
  gateway: PaymentGateway;
  totalTransactions: number;
  grossRevenueKobo: bigint;
  refundsKobo: bigint;
  netRevenueKobo: bigint;
  failedCount: number;
}

interface PaymentRow {
  gateway: PaymentGateway;
  status: string;
  amountKobo: number;
  refundAmountKobo: number | null;
}

/** Pure: groups raw Payment rows for one day into per-gateway revenue buckets. */
export function aggregateRevenueRows(rows: PaymentRow[]): RevenueBucket[] {
  const byGateway = new Map<
    PaymentGateway,
    { transactions: number; gross: bigint; refunds: bigint; failed: number }
  >();

  for (const row of rows) {
    if (!byGateway.has(row.gateway)) {
      byGateway.set(row.gateway, { transactions: 0, gross: 0n, refunds: 0n, failed: 0 });
    }
    const bucket = byGateway.get(row.gateway)!;

    if (row.status === 'failed') {
      bucket.failed += 1;
      continue;
    }
    if (row.status !== 'paid' && row.status !== 'refunded') continue;

    bucket.transactions += 1;
    bucket.gross += BigInt(row.amountKobo);
    if (row.refundAmountKobo) bucket.refunds += BigInt(row.refundAmountKobo);
  }

  return Array.from(byGateway.entries()).map(([gateway, b]) => ({
    gateway,
    totalTransactions: b.transactions,
    grossRevenueKobo: b.gross,
    refundsKobo: b.refunds,
    netRevenueKobo: b.gross - b.refunds,
    failedCount: b.failed,
  }));
}

/** Payments are attributed to the day they were *created* (covers `failed`
 * payments, which never get a `paidAt`) rather than `paidAt`/`refundedAt` —
 * consistent day-bucketing across paid/failed/refunded rows. */
export async function fetchPaymentRowsForDay(prisma: PrismaService, start: Date, end: Date): Promise<PaymentRow[]> {
  return prisma.payment.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { gateway: true, status: true, amountKobo: true, refundAmountKobo: true },
  });
}
