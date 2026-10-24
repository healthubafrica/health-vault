import * as SecureStore from 'expo-secure-store';
import type { PatientProfile } from './api';
import { bloodGroupLabel } from './bloodGroup';

// A deliberately limited copy of the emergency profile, kept on the device so
// the Emergency screen still shows it with no network. SecureStore encrypts it
// (Keychain / Keystore); it is wiped on sign-out.
const KEY = 'hha_emergency_profile';
// SecureStore values should stay under ~2 KB, so long lists are clipped.
const MAX_FIELD = 300;

export interface EmergencySnapshot {
  name: string;
  bloodGroup: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  medications: string | null;
  contact: { name: string; phone: string; relationship: string | null } | null;
  savedAt: string;
}

const list = (items?: string[] | null) => (items?.length ? items.join(', ') : null);
const clip = (s: string | null) => (s && s.length > MAX_FIELD ? `${s.slice(0, MAX_FIELD - 1)}…` : s);

export function toEmergencySnapshot(p: PatientProfile): EmergencySnapshot {
  const c = p.emergencyContacts?.[0];
  const contactName = c?.fullName ?? p.nextOfKinName;
  const contactPhone = c?.phone ?? p.nextOfKinPhone;
  return {
    name: `${p.firstName} ${p.lastName}`.trim(),
    bloodGroup: bloodGroupLabel(p.bloodGroup) ?? null,
    allergies: list(p.medicalInfo?.allergies),
    chronicConditions: list(p.medicalInfo?.chronicConditions),
    medications: list(p.medicalInfo?.activeMedications),
    contact:
      contactName && contactPhone
        ? { name: contactName, phone: contactPhone, relationship: c?.relationship ?? p.nextOfKinRelationship ?? null }
        : null,
    savedAt: new Date().toISOString(),
  };
}

export async function saveEmergencyProfile(p: PatientProfile): Promise<void> {
  try {
    const s = toEmergencySnapshot(p);
    const stored: EmergencySnapshot = {
      ...s,
      allergies: clip(s.allergies),
      chronicConditions: clip(s.chronicConditions),
      medications: clip(s.medications),
    };
    await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
  } catch {
    // Best effort: the online profile still works without the offline copy.
  }
}

export async function loadEmergencyProfile(): Promise<EmergencySnapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as EmergencySnapshot) : null;
  } catch {
    return null;
  }
}

export async function clearEmergencyProfile(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
