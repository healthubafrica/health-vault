import { canCancel, canJoinCall, findSessionForAppointment, isPastStatus, statusPill } from './appointments';

describe('appointment status helpers (backend AppointmentStatus)', () => {
  it('lets a patient cancel anything still pending a visit, including new "requested" bookings', () => {
    for (const s of ['requested', 'confirmed', 'upcoming']) expect(canCancel(s)).toBe(true);
    for (const s of ['in_progress', 'completed', 'cancelled', 'no_show']) expect(canCancel(s)).toBe(false);
  });

  it('only offers Join Call for a confirmed/upcoming/in-progress TeleCare appointment', () => {
    expect(canJoinCall({ isTelecare: true, status: 'confirmed' })).toBe(true);
    expect(canJoinCall({ isTelecare: true, status: 'upcoming' })).toBe(true);
    expect(canJoinCall({ isTelecare: true, status: 'in_progress' })).toBe(true);
    expect(canJoinCall({ isTelecare: true, status: 'requested' })).toBe(false);
    expect(canJoinCall({ isTelecare: false, status: 'confirmed' })).toBe(false);
  });

  it('treats completed, cancelled and no_show as past', () => {
    for (const s of ['completed', 'cancelled', 'no_show']) expect(isPastStatus(s)).toBe(true);
    for (const s of ['requested', 'confirmed', 'upcoming', 'in_progress']) expect(isPastStatus(s)).toBe(false);
  });

  it('maps statuses to a readable pill', () => {
    expect(statusPill('requested')).toEqual({ status: 'amber', label: 'Awaiting confirmation' });
    expect(statusPill('confirmed')).toEqual({ status: 'green', label: 'Confirmed' });
    expect(statusPill('cancelled')).toEqual({ status: 'red', label: 'Cancelled' });
    expect(statusPill('no_show')).toEqual({ status: 'red', label: 'Missed' });
  });
});

describe('findSessionForAppointment', () => {
  const sessions = [
    { id: 's1', appointmentId: 'a1' },
    { id: 's2', appointmentId: 'a2' },
    { id: 's3', appointmentId: null },
  ];
  it('matches by appointmentId — the token endpoint needs the SESSION id, not the appointment id', () => {
    expect(findSessionForAppointment(sessions, 'a2')?.id).toBe('s2');
  });
  it('returns undefined when no session exists yet', () => {
    expect(findSessionForAppointment(sessions, 'a9')).toBeUndefined();
  });
});
