import { identityKey, JourneyEvent, percent } from './journey-metrics';
export const DEFAULT_ACTIVATION_EVENTS = ['booking_confirmed', 'payment_success', 'upload_success', 'manual_entry_success',
  'ticket_created', 'result_view', 'share_success'];

export function activationPolicy() {
  const days = Number(process.env.ANALYTICS_ACTIVATION_WINDOW_DAYS ?? 30);
  const events = (process.env.ANALYTICS_ACTIVATION_EVENTS ?? DEFAULT_ACTIVATION_EVENTS.join(',')).split(',').map(value => value.trim()).filter(Boolean);
  const version = Number(process.env.ANALYTICS_ACTIVATION_VERSION ?? 2);
  if (!Number.isInteger(days) || days < 1 || days > 365 || !Number.isInteger(version) || version < 2
    || !events.length || events.some(event => !DEFAULT_ACTIVATION_EVENTS.includes(event))) throw new Error('Invalid analytics activation policy');
  return { days, events, version };
}

export function activationMetric(registrations: JourneyEvent[], activity: JourneyEvent[], policy = activationPolicy()) {
  const first = new Map<string, Date>();
  for (const row of registrations) {
    if (row.eventName !== 'registration_complete') continue;
    const key = identityKey(row);
    if (key && (!first.has(key) || +row.occurredAt < +first.get(key)!)) first.set(key, row.occurredAt);
  }
  const activated = new Set<string>();
  for (const row of activity) {
    if (!policy.events.includes(row.eventName)) continue;
    const key = identityKey(row), start = key ? first.get(key) : undefined;
    if (key && start && +row.occurredAt >= +start && +row.occurredAt < +start + policy.days * 86400000) activated.add(key);
  }
  return { key: 'activationRate', label: 'Activation Rate', numerator: activated.size, denominator: first.size,
    value: percent(activated.size, first.size) };
}
