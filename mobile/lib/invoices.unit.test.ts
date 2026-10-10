import { summarizePayments, matchesFilter } from './invoices';

const p = (status: string, amountKobo: number, createdAt: string) => ({ status, amountKobo, createdAt, paidAt: null });

describe('summarizePayments', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  const payments = [
    p('paid', 500000, '2026-03-01T00:00:00Z'),
    p('pending', 200000, '2026-09-01T00:00:00Z'),
    p('failed', 900000, '2026-09-02T00:00:00Z'),
    p('refunded', 700000, '2026-09-03T00:00:00Z'),
    p('paid', 100000, '2025-12-31T00:00:00Z'), // last year
  ];

  it('counts only this year, and only money that is paid or genuinely pending', () => {
    expect(summarizePayments(payments, now)).toEqual({ paidKobo: 500000, pendingKobo: 200000, totalKobo: 700000 });
  });

  it('is zero for no payments', () => {
    expect(summarizePayments([], now)).toEqual({ paidKobo: 0, pendingKobo: 0, totalKobo: 0 });
  });
});

describe('matchesFilter', () => {
  it('"pending" means awaiting payment, not failed or refunded', () => {
    expect(matchesFilter('pending', 'pending')).toBe(true);
    expect(matchesFilter('pending', 'failed')).toBe(false);
    expect(matchesFilter('pending', 'refunded')).toBe(false);
  });
  it('"paid" is only paid, "all" is everything', () => {
    expect(matchesFilter('paid', 'paid')).toBe(true);
    expect(matchesFilter('paid', 'refunded')).toBe(false);
    expect(matchesFilter('all', 'failed')).toBe(true);
  });
});
