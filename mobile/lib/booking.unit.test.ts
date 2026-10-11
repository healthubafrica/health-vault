import { isVideoService, localDateKey } from './booking';

describe('isVideoService', () => {
  it('treats TeleCare and NeuroFlex as video services only', () => {
    expect(isVideoService('TeleCare')).toBe(true);
    expect(isVideoService('NeuroFlex')).toBe(true);
    expect(isVideoService('MinuteCare')).toBe(false);
    expect(isVideoService(undefined)).toBe(false);
  });
});

describe('localDateKey', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // 00:30 local on 5 March: toISOString() would be the 4th in any UTC+ zone.
    expect(localDateKey(new Date(2026, 2, 5, 0, 30))).toBe('2026-03-05');
    expect(localDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});
