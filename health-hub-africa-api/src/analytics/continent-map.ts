// Static ISO 3166-1 alpha-2 -> continent lookup. This is stable, unchanging
// reference data (country-to-continent assignment doesn't change), so it's
// embedded rather than fetched from a GeoIP vendor — the geo headers already
// give us a country code, this just buckets it one level up.
//
// ponytail: covers the ~195 UN-recognized states plus common territories:
// not a licensed geodata provider's full ISO-3166 list. An uncovered code
// falls into "Unknown" rather than throwing — extend CONTINENTS below if one
// shows up in real traffic.
const CONTINENTS: Record<string, string[]> = {
  Africa: [
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG',
    'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
    'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO',
    'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW',
  ],
  Asia: [
    'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CY', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ',
    'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM',
    'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE',
    'UZ', 'VN', 'YE',
  ],
  Europe: [
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI',
    'GR', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'GG', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC',
    'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA',
    'GB', 'VA',
  ],
  'North America': [
    'AI', 'AG', 'AW', 'BS', 'BB', 'BZ', 'BM', 'VG', 'CA', 'KY', 'CR', 'CU', 'CW', 'DM', 'DO', 'SV',
    'GL', 'GD', 'GP', 'GT', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'NI', 'PA', 'PR', 'BL', 'KN', 'LC',
    'MF', 'PM', 'VC', 'SX', 'TT', 'TC', 'US', 'VI',
  ],
  'South America': [
    'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE',
  ],
  Oceania: [
    'AS', 'AU', 'CK', 'FJ', 'PF', 'GU', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW',
    'PG', 'PN', 'WS', 'SB', 'TK', 'TO', 'TV', 'VU', 'WF',
  ],
  Antarctica: ['AQ', 'BV', 'TF', 'HM', 'GS'],
}

const COUNTRY_TO_CONTINENT = new Map<string, string>(
  Object.entries(CONTINENTS).flatMap(([continent, codes]) => codes.map((code) => [code, continent] as const)),
)

export function continentForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return 'Unknown'
  return COUNTRY_TO_CONTINENT.get(countryCode.toUpperCase()) ?? 'Unknown'
}

// Spec §C: "store stable codes plus localized/display names" — a display
// name alone isn't a stable key (a label could change; a code shouldn't).
// Not a formal ISO standard (none exists for continents), but a
// conventional short code set widely used for exactly this purpose.
const CONTINENT_CODES: Record<string, string> = {
  Africa: 'AF',
  Asia: 'AS',
  Europe: 'EU',
  'North America': 'NA',
  'South America': 'SA',
  Oceania: 'OC',
  Antarctica: 'AN',
}

export function continentCodeForContinent(continent: string): string {
  return CONTINENT_CODES[continent] ?? 'UN'
}
