// Backend enum BloodGroup is keyed A_PLUS … O_MINUS (Prisma @map("A+") only
// changes the DB value); the API sends and accepts the KEYS, never "O+".
const KEY_BY_LABEL = {
  'A+': 'A_PLUS',
  'A-': 'A_MINUS',
  'B+': 'B_PLUS',
  'B-': 'B_MINUS',
  'AB+': 'AB_PLUS',
  'AB-': 'AB_MINUS',
  'O+': 'O_PLUS',
  'O-': 'O_MINUS',
} as const;

export const BLOOD_GROUP_LABELS = Object.keys(KEY_BY_LABEL) as Array<keyof typeof KEY_BY_LABEL>;

const LABEL_BY_KEY = Object.fromEntries(
  Object.entries(KEY_BY_LABEL).map(([label, key]) => [key, label]),
) as Record<string, string>;

/** API value (or an already-formatted label) → "O+"; null when unknown. */
export function bloodGroupLabel(value?: string | null): string | null {
  if (!value) return null;
  return LABEL_BY_KEY[value] ?? value;
}

/** "O+" → "O_PLUS" for requests; undefined when blank/unrecognised. */
export function bloodGroupToApi(label?: string | null): string | undefined {
  if (!label) return undefined;
  return (KEY_BY_LABEL as Record<string, string>)[label];
}
