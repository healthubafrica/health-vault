interface PricedPlan {
  priceKobo: number;
  annualPriceKobo?: number | null;
  launchPriceKobo?: number | null;
}

/**
 * The amount the backend will actually charge (SubscriptionsService.upgrade):
 * annual = launch price when set, else the annual price; monthly = monthly price.
 * The screen must show this, not the list annual price, or patients are charged
 * a different amount than they were shown.
 *
 * Returns null when the plan has no annual price — the backend rejects such an
 * upgrade, so the screen must say "Monthly only" instead of the monthly price
 * under a "/ yr" label.
 */
export function planPriceKobo(plan: PricedPlan, cycle: 'monthly' | 'annually'): number | null {
  if (cycle === 'annually') {
    if (plan.launchPriceKobo && plan.launchPriceKobo > 0) return plan.launchPriceKobo;
    if (plan.annualPriceKobo) return plan.annualPriceKobo;
    return null;
  }
  return plan.priceKobo;
}

const ANNUAL_TERM_DAYS = 300;

/**
 * Price and unit for the "current plan" card. ActiveSubscription carries no
 * billing cycle, so a term longer than ~300 days is treated as annual.
 */
export function currentPlanPrice(
  sub: { startedAt: string; expiresAt: string | null; plan: PricedPlan & { billingPeriod: string } },
): { kobo: number; unit: string } {
  if (sub.expiresAt) {
    const days = (new Date(sub.expiresAt).getTime() - new Date(sub.startedAt).getTime()) / 86_400_000;
    if (days > ANNUAL_TERM_DAYS) {
      const annual = planPriceKobo(sub.plan, 'annually');
      if (annual !== null) return { kobo: annual, unit: 'yr' };
    }
  }
  return { kobo: sub.plan.priceKobo, unit: sub.plan.billingPeriod };
}

/** Free plans are never cancellable; tier casing differs between API and tests. */
export function isPaidPlan(plan: { priceKobo: number; tier: string }): boolean {
  return plan.priceKobo > 0 && plan.tier.toLowerCase() !== 'free';
}
