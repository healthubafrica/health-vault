import { PaymentGateway } from '@prisma/client';
import { aggregateRevenueRows } from './revenue-aggregation.util';

describe('aggregateRevenueRows', () => {
  it('groups paid rows by gateway with gross/net/refunds', () => {
    const buckets = aggregateRevenueRows([
      { gateway: PaymentGateway.Paystack, status: 'paid', amountKobo: 500000, refundAmountKobo: null },
      { gateway: PaymentGateway.Paystack, status: 'paid', amountKobo: 300000, refundAmountKobo: null },
      { gateway: PaymentGateway.Paystack, status: 'refunded', amountKobo: 200000, refundAmountKobo: 200000 },
      { gateway: PaymentGateway.Flutterwave, status: 'paid', amountKobo: 100000, refundAmountKobo: null },
    ]);

    const paystack = buckets.find((b) => b.gateway === PaymentGateway.Paystack)!;
    expect(paystack.totalTransactions).toBe(3);
    expect(paystack.grossRevenueKobo).toBe(1000000n);
    expect(paystack.refundsKobo).toBe(200000n);
    expect(paystack.netRevenueKobo).toBe(800000n);
    expect(paystack.failedCount).toBe(0);

    const flutterwave = buckets.find((b) => b.gateway === PaymentGateway.Flutterwave)!;
    expect(flutterwave.totalTransactions).toBe(1);
    expect(flutterwave.grossRevenueKobo).toBe(100000n);
  });

  it('counts failed payments separately without touching revenue totals', () => {
    const buckets = aggregateRevenueRows([
      { gateway: PaymentGateway.Paystack, status: 'failed', amountKobo: 500000, refundAmountKobo: null },
    ]);
    const paystack = buckets.find((b) => b.gateway === PaymentGateway.Paystack)!;
    expect(paystack.totalTransactions).toBe(0);
    expect(paystack.grossRevenueKobo).toBe(0n);
    expect(paystack.failedCount).toBe(1);
  });

  it('ignores pending/processing/disputed payments entirely', () => {
    const buckets = aggregateRevenueRows([
      { gateway: PaymentGateway.Paystack, status: 'pending', amountKobo: 500000, refundAmountKobo: null },
      { gateway: PaymentGateway.Paystack, status: 'processing', amountKobo: 500000, refundAmountKobo: null },
      { gateway: PaymentGateway.Paystack, status: 'disputed', amountKobo: 500000, refundAmountKobo: null },
    ]);
    const paystack = buckets.find((b) => b.gateway === PaymentGateway.Paystack)!;
    expect(paystack.totalTransactions).toBe(0);
    expect(paystack.failedCount).toBe(0);
  });

  it('returns an empty array for no rows', () => {
    expect(aggregateRevenueRows([])).toEqual([]);
  });
});
