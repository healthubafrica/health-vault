// Shared avatar helpers: gender -> default artwork mapping and initials.

export type AvatarArt = 'male' | 'female' | 'neutral';

/**
 * Maps the API Gender enum (Male | Female | Other | Prefer_not_to_say) and
 * common label variants to the artwork to draw. Unknown / missing -> null,
 * meaning "no illustration, use initials".
 */
export function genderArt(gender?: string | null): AvatarArt | null {
  if (!gender) return null;
  const g = gender.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (g === 'male') return 'male';
  if (g === 'female') return 'female';
  if (g === 'other' || g === 'prefer_not_to_say') return 'neutral';
  return null;
}

const TITLE_PREFIX = /^(dr|prof)\.?\s+/i;

/** Up to two uppercase initials (first + last word). Safe for empty / one-word names. */
export function initialsOf(name?: string | null): string {
  const words = (name ?? '')
    .trim()
    .replace(TITLE_PREFIX, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter((p) => p && p.trim()).join(' ');
}

interface ProviderPerson {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  gender?: string | null;
}

/** Avatar props for any API provider shape; photo/gender may be absent on older payloads. */
export function providerAvatarProps(provider?: ProviderPerson | null) {
  return {
    uri: provider?.profilePhotoUrl ?? undefined,
    gender: provider?.gender ?? undefined,
    name: provider ? fullName(provider.firstName, provider.lastName) : '',
  };
}
