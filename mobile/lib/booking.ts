// Length of every bookable slot. The backend generates slots at this length by
// default (appointments.service getAvailableSlots: `durationMinutes ?? 30`) and
// validates a booking against the same window, so the app must request slots
// AND book with the same value — booking a longer visit than the slot it was
// picked from can collide with the next slot and fail with "already booked".
export const BOOKING_DURATION_MINUTES = 30;
