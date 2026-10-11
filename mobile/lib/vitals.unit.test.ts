import { buildVitalsPayload } from './vitals';

const at = '2026-10-10T10:00:00.000Z';

describe('buildVitalsPayload', () => {
  it('rounds integer columns (heart rate)', () => {
    const r = buildVitalsPayload('Heart Rate', '72.6', '', at);
    expect(r).toEqual({ ok: true, payload: { heartRate: 73, recordedAt: at } });
  });

  it('parses "120/80" into systolic and diastolic', () => {
    const r = buildVitalsPayload('Blood Pressure', '120/80', 'after walk', at);
    expect(r).toEqual({
      ok: true,
      payload: { bloodPressureSystolic: 120, bloodPressureDiastolic: 80, notes: 'after walk', recordedAt: at },
    });
  });

  it.each(['120', '120/', '/80', 'abc', '80/120', '400/80', '120/10'])('rejects bad blood pressure %s', (v) => {
    const r = buildVitalsPayload('Blood Pressure', v, '', at);
    expect(r.ok).toBe(false);
  });

  it('rejects empty, non-numeric and out-of-range values instead of sending NaN/null', () => {
    for (const [m, v] of [
      ['Heart Rate', ''],
      ['Heart Rate', 'abc'],
      ['Heart Rate', '5'],
      ['SpO₂', '120'],
      ['Temperature', '5'],
      ['Weight', '-3'],
    ] as const) {
      expect(buildVitalsPayload(m, v, '', at).ok).toBe(false);
    }
  });

  it('accepts a decimal comma from phone keyboards', () => {
    expect(buildVitalsPayload('Temperature', '36,8', '', at)).toEqual({
      ok: true,
      payload: { temperatureCelsius: 36.8, recordedAt: at },
    });
  });

  it('sends blood glucose in mg/dL (the unit the whole platform stores)', () => {
    expect(buildVitalsPayload('Blood Glucose', '95', '', at)).toEqual({
      ok: true,
      payload: { bloodGlucose: 95, recordedAt: at },
    });
  });

  it('sends respiratory rate in its own field', () => {
    expect(buildVitalsPayload('Respiratory Rate', '16', '', at)).toEqual({
      ok: true,
      payload: { respiratoryRate: 16, recordedAt: at },
    });
  });

  it('keeps a pain score (no column for it) in the note so it is not lost as an empty row', () => {
    expect(buildVitalsPayload('Pain Score', '4', 'knee', at)).toEqual({
      ok: true,
      payload: { notes: 'Pain score: 4/10. knee', recordedAt: at },
    });
    expect(buildVitalsPayload('Pain Score', '11', '', at).ok).toBe(false);
  });

  it('rejects an unknown metric', () => {
    expect(buildVitalsPayload('Mystery', '1', '', at).ok).toBe(false);
  });
});

import { latestWith, mergeLatest } from './vitals';
import type { VitalsReading } from './api';

describe('latest readings per metric', () => {
  // Newest first, as GET /vitals returns them.
  const readings = [
    { id: 'c', recordedAt: '2026-10-03T00:00:00Z', heartRate: 80 },
    { id: 'b', recordedAt: '2026-10-02T00:00:00Z', systolicBp: 118, diastolicBp: 76 },
    { id: 'a', recordedAt: '2026-10-01T00:00:00Z', heartRate: 70, bloodGlucose: 92 },
  ] as VitalsReading[];

  it('finds the newest reading that actually has the metric', () => {
    expect(latestWith(readings, (r) => r.bloodGlucose != null)?.id).toBe('a');
    expect(latestWith(readings, (r) => r.systolicBp != null)?.id).toBe('b');
    expect(latestWith(readings, (r) => r.spo2 != null)).toBeUndefined();
  });

  it('merges the newest value of every metric so saving one metric does not hide the rest', () => {
    const m = mergeLatest(readings)!;
    expect(m.heartRate).toBe(80);
    expect(m.systolicBp).toBe(118);
    expect(m.bloodGlucose).toBe(92);
    expect(mergeLatest([])).toBeUndefined();
  });
});
