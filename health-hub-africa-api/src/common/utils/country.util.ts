// Resolves a client-supplied ISO 3166-1 alpha-2 code to the values stored on
// Patient. The English display name is derived server-side (not trusted from
// the client) so `country` and `countryCode` can never disagree, and the
// name stays consistent with the keys REGION_MAP uses for HHA patient IDs.
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export interface DeclaredCountry {
  countryCode: string;
  country: string;
}

export function declaredCountryFromCode(code?: string | null): DeclaredCountry | undefined {
  const countryCode = code?.trim().toUpperCase();
  if (!countryCode) return undefined;
  let country: string | undefined;
  try {
    country = regionNames.of(countryCode);
  } catch {
    return undefined;
  }
  // Intl echoes the input back for codes it doesn't know — treat as invalid.
  if (!country || country === countryCode) return undefined;
  return { countryCode, country };
}
