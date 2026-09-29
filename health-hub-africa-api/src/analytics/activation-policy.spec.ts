import { activationMetric } from './activation-policy';
const row = (eventName: string, day: number) => ({ eventName, patientId: 'p1', anonymousVisitorId: null, occurredAt: new Date(Date.UTC(2026, 0, day)) });
it('requires actions after registration and inside the versioned activation window', () => {
  const registration = [row('registration_complete', 2)];
  expect(activationMetric(registration, [row('booking_confirmed', 1)]).numerator).toBe(0);
  expect(activationMetric(registration, [row('booking_confirmed', 3)]).numerator).toBe(1);
  expect(activationMetric(registration, [row('booking_confirmed', 40)]).numerator).toBe(0);
});
