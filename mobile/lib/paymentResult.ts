// After a hosted checkout closes the app only knows the browser was dismissed,
// not whether the card was charged. The gateway reference lets us ask the
// backend (GET /payments/verify, which also re-checks with the gateway).

export type PaymentOutcome = 'paid' | 'failed' | 'pending';

interface SettleOptions {
  tries?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export async function settlePayment(
  verify: (reference: string) => Promise<{ status: string }>,
  reference: string,
  { tries = 6, delayMs = 2500, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: SettleOptions = {},
): Promise<PaymentOutcome> {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const { status } = await verify(reference);
      if (status === 'paid') return 'paid';
      if (status === 'failed' || status === 'cancelled') return 'failed';
    } catch {
      // Transient: the webhook may still confirm it. Keep trying, never report failure.
    }
    if (attempt < tries - 1) await sleep(delayMs);
  }
  return 'pending';
}

export function outcomeMessage(outcome: PaymentOutcome): { title: string; body: string } {
  switch (outcome) {
    case 'paid':
      return { title: 'Payment successful', body: 'Thank you — your payment has been confirmed.' };
    case 'failed':
      return { title: 'Payment not completed', body: 'The payment did not go through and you were not charged. You can try again.' };
    default:
      return {
        title: 'Payment processing',
        body: 'We have not received confirmation yet. If you completed the payment it will appear shortly; check Invoices before paying again.',
      };
  }
}
