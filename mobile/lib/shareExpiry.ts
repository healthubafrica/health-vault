const HOUR = 3600 * 1000;

export type ShareExpiryId = '24h' | '7d' | '30d' | 'never';

export const SHARE_EXPIRY_OPTIONS: { id: ShareExpiryId; label: string; ms: number | null }[] = [
  { id: '24h', label: '24 hours', ms: 24 * HOUR },
  { id: '7d', label: '7 days', ms: 7 * 24 * HOUR },
  { id: '30d', label: '30 days', ms: 30 * 24 * HOUR },
  { id: 'never', label: 'Never', ms: null },
];

/** ISO expiry for a chip, or undefined for "never" (the API treats no expiresAt as non-expiring). */
export function expiryToIso(id: ShareExpiryId, now: number = Date.now()): string | undefined {
  const ms = SHARE_EXPIRY_OPTIONS.find((o) => o.id === id)?.ms;
  return ms ? new Date(now + ms).toISOString() : undefined;
}

export function describeExpiry(expiresAt?: string | null, now: number = Date.now()): string {
  if (!expiresAt) return 'Never expires';
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) return 'Never expires';
  const when = at.toLocaleDateString();
  return at.getTime() <= now ? `Expired ${when}` : `Expires ${when}`;
}
