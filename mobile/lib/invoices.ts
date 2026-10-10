export type InvoiceFilter = 'all' | 'paid' | 'pending';

interface PaymentLike {
  status: string;
  amountKobo: number;
  createdAt: string;
  paidAt?: string | null;
}

/** Failed, refunded and disputed payments are not "pending" money. */
export function matchesFilter(filter: InvoiceFilter, status: string): boolean {
  if (filter === 'paid') return status === 'paid';
  if (filter === 'pending') return status === 'pending';
  return true;
}

/** This calendar year's paid + genuinely pending amounts (the screen's "YTD" card). */
export function summarizePayments(payments: PaymentLike[], now: Date = new Date()) {
  const year = now.getUTCFullYear();
  let paidKobo = 0;
  let pendingKobo = 0;
  for (const p of payments) {
    if (new Date(p.paidAt ?? p.createdAt).getUTCFullYear() !== year) continue;
    if (p.status === 'paid') paidKobo += p.amountKobo ?? 0;
    else if (p.status === 'pending') pendingKobo += p.amountKobo ?? 0;
  }
  return { paidKobo, pendingKobo, totalKobo: paidKobo + pendingKobo };
}
