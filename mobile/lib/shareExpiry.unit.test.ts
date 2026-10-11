import { expiryToIso, describeExpiry } from './shareExpiry';

const NOW = Date.UTC(2026, 9, 10, 12, 0, 0);

describe('shareExpiry', () => {
  it('maps each chip to an offset from now', () => {
    expect(expiryToIso('24h', NOW)).toBe(new Date(NOW + 86400000).toISOString());
    expect(expiryToIso('7d', NOW)).toBe(new Date(NOW + 7 * 86400000).toISOString());
    expect(expiryToIso('30d', NOW)).toBe(new Date(NOW + 30 * 86400000).toISOString());
  });

  it('returns undefined for never', () => {
    expect(expiryToIso('never', NOW)).toBeUndefined();
  });

  it('describes open-ended, future and past expiries', () => {
    expect(describeExpiry(null, NOW)).toBe('Never expires');
    expect(describeExpiry(new Date(NOW + 1000).toISOString(), NOW)).toMatch(/^Expires /);
    expect(describeExpiry(new Date(NOW - 1000).toISOString(), NOW)).toMatch(/^Expired /);
  });
});
