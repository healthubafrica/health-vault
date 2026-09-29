import { JourneyEvent, median, percent } from './journey-metrics';
import { DEFAULT_ACTIVATION_EVENTS } from './activation-policy';

export type CohortDimension = 'registrationMonth' | 'country' | 'device' | 'source' | 'plan' | 'firstFeature';
export const COHORT_DIMENSIONS: CohortDimension[] = ['registrationMonth', 'country', 'device', 'source', 'plan', 'firstFeature'];
type CohortEvent = JourneyEvent & { countryCode?: string | null; deviceCategory?: string | null; featureArea?: string | null };

/** Rolling retention: returned at or after N days, through asOf. Version 1. */
export function cohortMetrics(registrations: CohortEvent[], activity: CohortEvent[], dimension: CohortDimension,
  planByPatient = new Map<string, string>(), asOf = new Date()) {
  const registrationsByPatient = new Map<string, CohortEvent>();
  for (const event of registrations) {
    if (!event.patientId) continue;
    const previous = registrationsByPatient.get(event.patientId);
    if (!previous || +event.occurredAt < +previous.occurredAt) registrationsByPatient.set(event.patientId, event);
  }
  const activityByPatient = new Map<string, CohortEvent[]>();
  for (const event of activity) {
    if (!event.patientId || +event.occurredAt > +asOf) continue;
    const rows = activityByPatient.get(event.patientId) ?? [];
    rows.push(event); activityByPatient.set(event.patientId, rows);
  }
  const groups = new Map<string, { registered: CohortEvent; events: CohortEvent[] }[]>();
  for (const [patientId, registered] of registrationsByPatient) {
    const events = (activityByPatient.get(patientId) ?? []).filter(row => +row.occurredAt >= +registered.occurredAt).sort((a, b) => +a.occurredAt - +b.occurredAt);
    const properties = registered.properties as { acquisitionSource?: string } | null;
    const labels = { registrationMonth: registered.occurredAt.toISOString().slice(0, 7),
      country: registered.countryCode, device: registered.deviceCategory, source: properties?.acquisitionSource,
      plan: planByPatient.get(patientId), firstFeature: events.find(row => row.featureArea)?.featureArea };
    const key = labels[dimension] ?? 'Unknown';
    const members = groups.get(key) ?? [];
    members.push({ registered, events }); groups.set(key, members);
  }
  return [...groups].map(([segment, members]) => {
    const secondSession: number[] = [], secondAction: number[] = [], secondBooking: number[] = [];
    for (const { registered, events } of members) {
      const sessions = new Set<string>();
      for (const event of events) {
        if (event.analyticsSessionId && !sessions.has(event.analyticsSessionId)) {
          sessions.add(event.analyticsSessionId);
          if (sessions.size === 2) secondSession.push((+event.occurredAt - +registered.occurredAt) / 1000);
        }
      }
      for (const [list, target] of [
        [events.filter(row => DEFAULT_ACTIVATION_EVENTS.includes(row.eventName)), secondAction],
        [events.filter(row => row.eventName === 'booking_confirmed'), secondBooking],
      ] as const) if (list[1]) target.push((+list[1].occurredAt - +registered.occurredAt) / 1000);
    }
    return { segment, cohortSize: members.length, windows: [1, 7, 30, 60, 90].map(days => {
      const eligible = members.filter(member => +member.registered.occurredAt + days * 86400000 <= +asOf);
      const retained = eligible.filter(member => member.events.some(event => +event.occurredAt >= +member.registered.occurredAt + days * 86400000));
      return { days, eligibleCohortSize: eligible.length, retainedUsers: retained.length, rate: percent(retained.length, eligible.length) };
    }), medianSecondsToSecondSession: median(secondSession), medianSecondsToSecondAction: median(secondAction), medianSecondsToSecondBooking: median(secondBooking) };
  }).sort((a, b) => b.cohortSize - a.cohortSize);
}
