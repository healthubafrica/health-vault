// Length of every bookable slot. The backend generates slots at this length by
// default (appointments.service getAvailableSlots: `durationMinutes ?? 30`) and
// validates a booking against the same window, so the app must request slots
// AND book with the same value — booking a longer visit than the slot it was
// picked from can collide with the next slot and fail with "already booked".
export const BOOKING_DURATION_MINUTES = 30;

// Services the backend books as video visits (appointments.service
// TELECARE_SERVICES). For any other service the server ignores a "virtual"
// appointmentType, so a Video choice there would be cosmetic.
export const VIDEO_SERVICE_TYPES = ['TeleCare', 'NeuroFlex'];

export function isVideoService(serviceType: string | undefined): boolean {
  return !!serviceType && VIDEO_SERVICE_TYPES.includes(serviceType);
}

// YYYY-MM-DD in the device's local calendar. toISOString() is UTC, which is the
// previous day for the first hour after midnight in WAT and breaks slot lookups.
export function localDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
