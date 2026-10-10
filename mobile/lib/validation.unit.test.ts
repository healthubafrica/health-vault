import { genderForApi, isValidPassword, normalizePhone, parseIsoDob } from './validation';

describe('isValidPassword (mirrors backend SEC-003)', () => {
  it('accepts 12+ chars with upper, lower, digit and special', () => {
    expect(isValidPassword('Str0ng!Passw0rd')).toBe(true);
  });
  it.each(['short1!A', 'alllowercase1!x', 'ALLUPPERCASE1!X', 'NoDigitsHere!!!', 'NoSpecial12345A'])('rejects %s', (p) => {
    expect(isValidPassword(p)).toBe(false);
  });
  it('rejects passwords over 72 chars (bcrypt limit)', () => {
    expect(isValidPassword('Aa1!' + 'x'.repeat(80))).toBe(false);
  });
});

describe('normalizePhone', () => {
  it('returns undefined for blank input (phone is optional)', () => {
    expect(normalizePhone('  ')).toEqual({ ok: true, value: undefined });
  });
  it('keeps valid E.164', () => {
    expect(normalizePhone('+2348012345678')).toEqual({ ok: true, value: '+2348012345678' });
  });
  it('converts a Nigerian local number to E.164', () => {
    expect(normalizePhone('0801 234 5678')).toEqual({ ok: true, value: '+2348012345678' });
  });
  it('rejects garbage', () => {
    expect(normalizePhone('12ab')).toEqual({ ok: false });
  });
});

describe('parseIsoDob', () => {
  const now = new Date('2026-10-10T00:00:00Z');
  it('accepts a real past date', () => {
    expect(parseIsoDob('1990-04-12', now)).toBe('1990-04-12');
  });
  it.each(['', '12/04/1990', '1990-13-01', '1990-02-31', '2027-01-01', '1890-01-01'])('rejects %s', (v) => {
    expect(parseIsoDob(v, now)).toBeNull();
  });
});

describe('genderForApi', () => {
  it('maps UI values to the backend enum casing', () => {
    expect(genderForApi('female')).toBe('Female');
    expect(genderForApi('male')).toBe('Male');
    expect(genderForApi('other')).toBe('Other');
  });
});
