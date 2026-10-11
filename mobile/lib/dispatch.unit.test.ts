import { dispatchStatusLabel, dispatchStatusPill, emergencyTypeLabel } from './dispatch';

describe('dispatch helpers', () => {
  it('labels known and unknown statuses', () => {
    expect(dispatchStatusLabel('en_route')).toBe('Unit on the way');
    expect(dispatchStatusLabel('some_new_state')).toBe('some new state');
  });

  it('maps statuses to pill colours', () => {
    expect(dispatchStatusPill('closed')).toBe('green');
    expect(dispatchStatusPill('requested')).toBe('amber');
    expect(dispatchStatusPill('on_scene')).toBe('pending');
  });

  it('humanises emergency types', () => {
    expect(emergencyTypeLabel('Chest_Pain')).toBe('Chest pain');
    expect(emergencyTypeLabel('Other')).toBe('Other');
  });
});
