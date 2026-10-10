export type VitalStatus = 'green' | 'amber' | 'red';

const RANK: Record<VitalStatus, number> = { green: 0, amber: 1, red: 2 };

/**
 * Blood-pressure band from BOTH numbers (the worse of the two decides), so
 * 120/95 is not reported "normal" just because the systolic is fine.
 * green: <=120 and <=80, amber: <=139 / <=89, red: anything above.
 */
export function classifyBloodPressure(systolic: number, diastolic: number): VitalStatus {
  const sys: VitalStatus = systolic <= 120 ? 'green' : systolic <= 139 ? 'amber' : 'red';
  const dia: VitalStatus = diastolic <= 80 ? 'green' : diastolic <= 89 ? 'amber' : 'red';
  return RANK[sys] >= RANK[dia] ? sys : dia;
}
