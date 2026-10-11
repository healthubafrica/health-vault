import { bloodGroupLabel, bloodGroupToApi, BLOOD_GROUP_LABELS } from './bloodGroup';

describe('blood group mapping', () => {
  it('shows API enum keys as clinical labels', () => {
    expect(bloodGroupLabel('O_PLUS')).toBe('O+');
    expect(bloodGroupLabel('AB_MINUS')).toBe('AB-');
  });

  it('passes through values that are already labels, and handles missing', () => {
    expect(bloodGroupLabel('A+')).toBe('A+');
    expect(bloodGroupLabel(null)).toBeNull();
    expect(bloodGroupLabel(undefined)).toBeNull();
  });

  it('converts labels back to the enum key the backend accepts', () => {
    expect(bloodGroupToApi('O+')).toBe('O_PLUS');
    expect(bloodGroupToApi('B-')).toBe('B_MINUS');
    expect(bloodGroupToApi('')).toBeUndefined();
    expect(bloodGroupToApi('Unknown')).toBeUndefined();
  });

  it('round-trips every group', () => {
    for (const label of BLOOD_GROUP_LABELS) expect(bloodGroupLabel(bloodGroupToApi(label))).toBe(label);
  });
});
