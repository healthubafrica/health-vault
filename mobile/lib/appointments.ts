// Rules keyed on the backend's AppointmentStatus enum:
// requested | confirmed | upcoming | in_progress | completed | cancelled | no_show
// (there is no "pending"; a fresh patient booking is "requested").

export function canCancel(status: string): boolean {
  return status === 'requested' || status === 'confirmed' || status === 'upcoming';
}

export function canJoinCall(a: { isTelecare: boolean; status: string }): boolean {
  return a.isTelecare && (a.status === 'confirmed' || a.status === 'upcoming' || a.status === 'in_progress');
}

export function isPastStatus(status: string): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'no_show';
}

export function statusPill(status: string): { status: string; label: string } {
  switch (status) {
    case 'requested':
      return { status: 'amber', label: 'Awaiting confirmation' };
    case 'confirmed':
    case 'upcoming':
      return { status: 'green', label: 'Confirmed' };
    case 'in_progress':
      return { status: 'green', label: 'In progress' };
    case 'completed':
      return { status: 'green', label: 'Completed' };
    case 'cancelled':
      return { status: 'red', label: 'Cancelled' };
    case 'no_show':
      return { status: 'red', label: 'Missed' };
    default:
      return { status: status, label: status };
  }
}

/** The token endpoint needs the TelecareSession id; sessions link back via appointmentId. */
export function findSessionForAppointment<T extends { id: string; appointmentId?: string | null }>(
  sessions: T[],
  appointmentId: string,
): T | undefined {
  return sessions.find((s) => s.appointmentId === appointmentId);
}
