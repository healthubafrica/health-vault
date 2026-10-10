import { planPriceKobo } from './pricing';

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
  it('annual falls back to monthly when the plan has no annual price at all', () => {
    expect(planPriceKobo({ priceKobo: 100 }, 'annually')).toBe(100);
  });
});
