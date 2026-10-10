// Client-side mirrors of the backend's input rules, so users get a clear
// message instead of a 400 from the API.

// auth/dto/register.dto.ts: 12-72 chars with upper, lower, digit and special.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
export const PASSWORD_HINT =
  'Use at least 12 characters with uppercase, lowercase, a number and a special character.';

export function isValidPassword(p: string): boolean {
  return p.length <= 72 && PASSWORD_REGEX.test(p);
}

const E164 = /^\+[1-9]\d{1,14}$/;

/** Blank is fine (optional). Nigerian local numbers (0801…) become +234801…. */
export function normalizePhone(raw: string): { ok: true; value: string | undefined } | { ok: false } {
  const compact = raw.replace(/[\s()-]/g, '');
  if (!compact) return { ok: true, value: undefined };
  const value = /^0\d{10}$/.test(compact) ? `+234${compact.slice(1)}` : compact;
  return E164.test(value) ? { ok: true, value } : { ok: false };
}

/** Returns the date if it is a real YYYY-MM-DD in the past (and after 1900), else null. */
export function parseIsoDob(v: string, now: Date = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  if (d.getUTCFullYear() < 1900 || d.getTime() > now.getTime()) return null;
  return v;
}

const GENDER = { female: 'Female', male: 'Male', other: 'Other' } as const;
export function genderForApi(g: keyof typeof GENDER): (typeof GENDER)[keyof typeof GENDER] {
  return GENDER[g];
}
