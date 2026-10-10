// Turns what the patient typed into a CreateVitalsPayload the backend accepts,
// or a plain-language error. Never produces NaN, null, or an empty reading.
import type { CreateVitalsPayload } from './api';

export type VitalsResult = { ok: true; payload: CreateVitalsPayload } | { ok: false; error: string };

const fail = (error: string): VitalsResult => ({ ok: false, error });

function num(raw: string): number | null {
  const v = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(v) ? v : null;
}

/** Plausibility limits (reject typos; not clinical normal ranges). */
const LIMITS: Record<string, { min: number; max: number; unit: string }> = {
  'Heart Rate': { min: 20, max: 300, unit: 'bpm' },
  'SpO₂': { min: 50, max: 100, unit: '%' },
  Temperature: { min: 30, max: 45, unit: '°C' },
  'Respiratory Rate': { min: 4, max: 60, unit: 'breaths/min' },
  Weight: { min: 1, max: 500, unit: 'kg' },
  // mg/dL, matching the web portal and the platform's stored unit.
  'Blood Glucose': { min: 10, max: 1000, unit: 'mg/dL' },
  'Pain Score': { min: 0, max: 10, unit: '/10' },
};

export function buildVitalsPayload(metric: string, value: string, note: string, recordedAt: string): VitalsResult {
  const base: CreateVitalsPayload = { recordedAt };
  const trimmedNote = note.trim();

  if (metric === 'Blood Pressure') {
    const parts = value.split('/');
    const sys = parts.length === 2 ? num(parts[0]) : null;
    const dia = parts.length === 2 ? num(parts[1]) : null;
    if (sys === null || dia === null) return fail('Enter blood pressure as systolic/diastolic, e.g. 120/80.');
    if (sys < 50 || sys > 300 || dia < 30 || dia > 200 || dia >= sys) {
      return fail('That blood pressure doesn’t look right. Check both numbers.');
    }
    return {
      ok: true,
      payload: {
        bloodPressureSystolic: Math.round(sys),
        bloodPressureDiastolic: Math.round(dia),
        ...(trimmedNote && { notes: trimmedNote }),
        ...base,
      },
    };
  }

  const limit = LIMITS[metric];
  if (!limit) return fail('Unknown measurement.');
  const n = num(value);
  if (n === null) return fail('Enter a number.');
  if (n < limit.min || n > limit.max) {
    return fail(`${metric} should be between ${limit.min} and ${limit.max} ${limit.unit}.`);
  }

  switch (metric) {
    case 'Heart Rate':
      return { ok: true, payload: { heartRate: Math.round(n), ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'SpO₂':
      return { ok: true, payload: { oxygenSaturation: n, ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'Temperature':
      return { ok: true, payload: { temperatureCelsius: n, ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'Respiratory Rate':
      return { ok: true, payload: { respiratoryRate: Math.round(n), ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'Weight':
      return { ok: true, payload: { weightKg: n, ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'Blood Glucose':
      return { ok: true, payload: { bloodGlucose: n, ...(trimmedNote && { notes: trimmedNote }), ...base } };
    case 'Pain Score': {
      // No column for pain; keep it in the note rather than posting an empty reading.
      const painNote = `Pain score: ${Math.round(n)}/10.${trimmedNote ? ` ${trimmedNote}` : ''}`;
      return { ok: true, payload: { notes: painNote, ...base } };
    }
    default:
      return fail('Unknown measurement.');
  }
}

import type { VitalsReading } from './api';

/** Newest reading (list is newest-first) satisfying `has`. */
export function latestWith(readings: VitalsReading[], has: (r: VitalsReading) => boolean): VitalsReading | undefined {
  return readings.find(has);
}

const METRIC_KEYS = ['heartRate', 'systolicBp', 'diastolicBp', 'spo2', 'weightKg', 'heightCm', 'temperatureC', 'bloodGlucose'] as const;

/**
 * Each save usually records ONE metric, so the newest row alone only ever holds
 * the last thing logged. Merge the newest non-null value of every metric.
 */
export function mergeLatest(readings: VitalsReading[]): VitalsReading | undefined {
  if (readings.length === 0) return undefined;
  const merged: VitalsReading = { ...readings[0] };
  for (const k of METRIC_KEYS) {
    if (merged[k] == null) {
      const found = readings.find((r) => r[k] != null);
      if (found) (merged as unknown as Record<string, unknown>)[k] = found[k];
    }
  }
  return merged;
}
