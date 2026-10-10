import { planPriceKobo, currentPlanPrice, isPaidPlan } from './pricing';

const plan = { priceKobo: 1250000, annualPriceKobo: 14900000, launchPriceKobo: 9900000 };

describe('planPriceKobo (mirrors SubscriptionsService.upgrade)', () => {
  it('monthly is the monthly price', () => {
    expect(planPriceKobo(plan, 'monthly')).toBe(1250000);
  });
  it('annual is the LAUNCH price when one is set — that is what is charged', () => {
    expect(planPriceKobo(plan, 'annually')).toBe(9900000);
  });
  it('annual falls back to the standard annual price when there is no launch price', () => {
    expect(planPriceKobo({ ...plan, launchPriceKobo: 0 }, 'annually')).toBe(14900000);
    expect(planPriceKobo({ priceKobo: 100, annualPriceKobo: 1000 }, 'annually')).toBe(1000);
  });
  it('annual is null (monthly only) when the plan has no annual price at all', () => {
    expect(planPriceKobo({ priceKobo: 100 }, 'annually')).toBeNull();
    expect(planPriceKobo({ priceKobo: 100 }, 'monthly')).toBe(100);
  });
});

describe('currentPlanPrice', () => {
  const sub = (days: number) => ({
    startedAt: '2026-01-01T00:00:00Z',
    expiresAt: new Date(Date.parse('2026-01-01T00:00:00Z') + days * 86_400_000).toISOString(),
    plan: { ...plan, billingPeriod: 'monthly' },
  });
  it('shows the monthly price for a monthly term', () => {
    expect(currentPlanPrice(sub(30))).toEqual({ kobo: 1250000, unit: 'monthly' });
  });
  it('shows the charged annual price for a ~year term', () => {
    expect(currentPlanPrice(sub(365))).toEqual({ kobo: 9900000, unit: 'yr' });
  });
  it('falls back to the plan price when there is no expiry', () => {
    expect(currentPlanPrice({ ...sub(30), expiresAt: null })).toEqual({ kobo: 1250000, unit: 'monthly' });
  });
});

describe('isPaidPlan', () => {
  it('treats Free (any casing) and zero-price plans as not paid', () => {
    expect(isPaidPlan({ priceKobo: 0, tier: 'Free' })).toBe(false);
    expect(isPaidPlan({ priceKobo: 100, tier: 'Free' })).toBe(false);
    expect(isPaidPlan({ priceKobo: 100, tier: 'BasicCare' })).toBe(true);
  });
});
