import { classifyBloodPressure } from './vitalStatus';

describe('classifyBloodPressure', () => {
  it('is green only when both numbers are in range', () => {
    expect(classifyBloodPressure(118, 76)).toBe('green');
  });
  it('lets a high diastolic raise the status even when systolic is fine', () => {
    expect(classifyBloodPressure(118, 95)).toBe('red');
    expect(classifyBloodPressure(118, 85)).toBe('amber');
  });
  it('lets a high systolic raise the status even when diastolic is fine', () => {
    expect(classifyBloodPressure(160, 70)).toBe('red');
    expect(classifyBloodPressure(130, 70)).toBe('amber');
  });
});
