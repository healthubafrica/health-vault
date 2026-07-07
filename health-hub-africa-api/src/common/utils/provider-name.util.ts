// Provider titles get typed straight into firstName/lastName by OpenEMR
// clinic staff (e.g. "Dr. Jane" in the given-name field) or by admins
// doing manual imports. This is the one place that understands how to
// pull a title back out and canonicalize it, so it never gets doubled
// (e.g. title="Dr." + firstName="Dr. Jane" -> "Dr. Dr. Jane").

const TITLE_ALIASES: Record<string, string> = {
  professor: 'Prof.',
  prof: 'Prof.',
  doctor: 'Dr.',
  dr: 'Dr.',
  mrs: 'Mrs.',
  ms: 'Ms.',
  miss: 'Miss',
  mr: 'Mr.',
};

const TITLE_TOKENS = Object.keys(TITLE_ALIASES).sort((a, b) => b.length - a.length);

// A recognised title at the very start of a string, followed by either a
// period (optionally + trailing whitespace) or at least one whitespace
// character. The mandatory separator is what stops "Drew" or "Mrsomething"
// from being misread as a title ("Dr"/"Mr") glued onto the rest of a name —
// without it, "Drew" would false-positive-match "Dr" + "ew".
const LEADING_TITLE_RE = new RegExp(
  `^(${TITLE_TOKENS.join('|')})(?:\\.\\s*|\\s+)(?=\\S)`,
  'i',
);

function canonicalizeBareToken(value: string): string | null {
  const key = value.toLowerCase().replace(/\.$/, '');
  return key in TITLE_ALIASES ? key : null;
}

/**
 * Repeatedly strips a leading title token from `value` — repeatedly so an
 * accidentally-doubled prefix ("Dr. Dr. Jane") collapses fully, not just
 * one layer. Returns the cleaned string and the last token stripped.
 */
function stripLeadingTitles(value: string): { rest: string; token: string | null } {
  let rest = (value ?? '').trim();
  let token: string | null = null;
  for (;;) {
    const match = rest.match(LEADING_TITLE_RE);
    if (!match) break;
    token = match[1].toLowerCase();
    rest = rest.slice(match[0].length).trim();
  }
  return { rest, token };
}

export interface NormalizedProviderName {
  firstName: string;
  lastName: string;
  title: string;
}

/**
 * Normalizes a provider's name/title triple: strips any professional
 * title embedded in firstName/lastName out into the dedicated title
 * field, and canonicalizes/deduplicates a supplied title so the same
 * prefix is never doubled up.
 *
 * Precedence when title info comes from more than one place: an
 * explicit, already-clean title (e.g. "Dr." from OpenEMR's FHIR prefix
 * field) wins over a title merely embedded in firstName/lastName — the
 * dedicated field is trusted over a name-field data-entry artifact.
 */
export function normalizeProviderName(
  rawFirstName: string,
  rawLastName: string,
  rawTitle?: string | null,
): NormalizedProviderName {
  const { rest: firstName, token: firstNameToken } = stripLeadingTitles(rawFirstName ?? '');
  const { rest: lastName, token: lastNameToken } = stripLeadingTitles(rawLastName ?? '');

  const trimmedRawTitle = (rawTitle ?? '').trim();
  const cleanedTitleToken = canonicalizeBareToken(trimmedRawTitle);
  const { token: doubledTitleToken } = stripLeadingTitles(trimmedRawTitle);

  const resolvedToken = cleanedTitleToken ?? doubledTitleToken ?? firstNameToken ?? lastNameToken;
  const title = resolvedToken ? TITLE_ALIASES[resolvedToken] : trimmedRawTitle || 'Dr.';

  return { firstName, lastName, title };
}

/**
 * Assembles "Title FirstName LastName" from the dedicated fields. Always
 * call this instead of hand-concatenating a provider's title into a
 * display string — every ad hoc `${title} ${firstName} ${lastName}` in
 * this codebase is exactly the pattern that let duplicate titles hide.
 */
export function buildProviderDisplayName(provider: {
  title?: string | null;
  firstName: string;
  lastName: string;
}): string {
  return [provider.title?.trim(), provider.firstName?.trim(), provider.lastName?.trim()]
    .filter(Boolean)
    .join(' ');
}
