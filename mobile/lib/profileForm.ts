import { bloodGroupToApi } from './bloodGroup';
import { parseIsoDob } from './validation';

export const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC', 'CC', 'Other'] as const;

export interface ProfileForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string; // API value: Male | Female | Other | Prefer_not_to_say
  bloodType: string; // label: "O+"
  genotype: string;
  height: string;
  weight: string;
  address: string;
  city: string;
  state: string;
  country: string;
  nin: string;
}

// Mirrors PatientMedicalInfoDto limits so users see a clear message, not a 400.
const HEIGHT = { min: 30, max: 260 };
const WEIGHT = { min: 1, max: 500 };

/** "" -> null (clears the value), "1,72" / "172" -> number, anything else -> NaN. */
function parseMeasure(raw: string): number | null {
  const v = raw.trim().replace(',', '.');
  if (!v) return null;
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
}

const orNull = (s: string) => s.trim() || null;

/** Builds the PATCH /patients/:id body (same fields the portal sends), or a user-facing error. */
export function buildProfileUpdate(f: ProfileForm): { ok: true; body: Record<string, unknown> } | { ok: false; message: string } {
  if (!f.firstName.trim() || !f.lastName.trim()) return { ok: false, message: 'First and last name are required.' };

  const dob = f.dateOfBirth.trim();
  if (dob && !parseIsoDob(dob)) {
    return { ok: false, message: 'Enter your date of birth as YYYY-MM-DD (for example 1990-04-12).' };
  }

  const heightCm = parseMeasure(f.height);
  if (heightCm !== null && !(heightCm >= HEIGHT.min && heightCm <= HEIGHT.max)) {
    return { ok: false, message: `Height must be in centimetres, between ${HEIGHT.min} and ${HEIGHT.max}.` };
  }
  const weightKg = parseMeasure(f.weight);
  if (weightKg !== null && !(weightKg >= WEIGHT.min && weightKg <= WEIGHT.max)) {
    return { ok: false, message: `Weight must be in kilograms, between ${WEIGHT.min} and ${WEIGHT.max}.` };
  }

  return {
    ok: true,
    body: {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      ...(dob && { dateOfBirth: dob }),
      ...(f.gender && { gender: f.gender }),
      ...(bloodGroupToApi(f.bloodType) && { bloodGroup: bloodGroupToApi(f.bloodType) }),
      genotype: orNull(f.genotype),
      address: orNull(f.address),
      city: orNull(f.city),
      state: orNull(f.state),
      ...(f.country.trim() && { country: f.country.trim() }),
      ...(f.nin.trim() && { nin: f.nin.trim() }),
      medicalInfo: { heightCm, weightKg },
    },
  };
}
