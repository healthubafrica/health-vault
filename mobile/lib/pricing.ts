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
 */
export function planPriceKobo(plan: PricedPlan, cycle: 'monthly' | 'annually'): number {
  if (cycle === 'annually') {
    if (plan.launchPriceKobo && plan.launchPriceKobo > 0) return plan.launchPriceKobo;
    if (plan.annualPriceKobo) return plan.annualPriceKobo;
  }
  return plan.priceKobo;
}
