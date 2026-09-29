export interface JourneyEvent {
  eventName: string;
  patientId: string | null;
  anonymousVisitorId: string | null;
  analyticsSessionId?: string | null;
  occurredAt: Date;
  pagePath?: string | null;
  properties?: unknown;
}

export const JOURNEY_DEFINITIONS = {
  registration: ['registration_start', 'registration_step_complete', 'otp_requested', 'otp_verify_success', 'login_success'],
  booking: ['booking_started', 'slot_selected', 'booking_confirmed'],
  payment: ['checkout_started', 'payment_attempted', 'payment_success'],
  records: ['records_view', 'upload_start', 'upload_success'],
  results: ['notification_clicked', 'result_view'],
  subscription: ['plan_select', 'checkout_start', 'payment_success'],
} as const;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percent(numerator: number, denominator: number) {
  return denominator ? Math.round(numerator / denominator * 1000) / 10 : null;
}

export function identityKey(event: Pick<JourneyEvent, 'patientId' | 'anonymousVisitorId'>) {
  return event.patientId ?? (event.anonymousVisitorId ? `anon:${event.anonymousVisitorId}` : null);
}

/** Resolve identities within the authorized input population; never return IDs. */
export function journeyMetrics(input: JourneyEvent[]) {
  const links = new Map<string, string>();
  for (const row of input) if (row.patientId && row.anonymousVisitorId) links.set(row.anonymousVisitorId, row.patientId);
  const rows = [...input].sort((a, b) => +a.occurredAt - +b.occurredAt);
  const byPerson = new Map<string, JourneyEvent[]>();
  for (const row of rows) {
    const key = row.patientId ?? links.get(row.anonymousVisitorId ?? '') ?? identityKey(row);
    if (!key) continue;
    const events = byPerson.get(key) ?? [];
    events.push(row);
    byPerson.set(key, events);
  }
  const paths = new Map<string, { count: number; converted: number }>();
  const exits = new Map<string, number>();
  const stepsToConversion: number[] = [];
  const outcomes = new Set(['booking_confirmed', 'payment_success', 'upload_success']);
  for (const events of byPerson.values()) {
    const sessions = new Map<string, JourneyEvent[]>();
    for (const event of events) {
      // Server outcomes without a session still participate in person funnels.
      if (!event.analyticsSessionId) continue;
      const list = sessions.get(event.analyticsSessionId) ?? [];
      list.push(event); sessions.set(event.analyticsSessionId, list);
    }
    for (const session of sessions.values()) {
      const pages: string[] = [];
      for (const row of session) if (row.pagePath && pages[pages.length - 1] !== row.pagePath) pages.push(row.pagePath);
      if (!pages.length) continue;
      const path = pages.slice(0, 20).join(' → ');
      const conversion = session.findIndex((row) => outcomes.has(row.eventName));
      const bucket = paths.get(path) ?? { count: 0, converted: 0 };
      bucket.count++; if (conversion >= 0) { bucket.converted++; stepsToConversion.push(conversion + 1); }
      paths.set(path, bucket);
      const exit = pages[pages.length - 1]; exits.set(exit, (exits.get(exit) ?? 0) + 1);
    }
  }
  const funnels = Object.entries(JOURNEY_DEFINITIONS).map(([name, definition]) => {
    const counts = definition.map(() => 0);
    const durations: number[][] = definition.map(() => []);
    const retries = definition.map(() => 0);
    const failures = definition.map(() => 0);
    for (const events of byPerson.values()) {
      let position = 0;
      let previous: Date | undefined;
      const reached = new Set<number>();
      for (const event of events) {
        if (position && /(?:_failure|_error)$/.test(event.eventName)) failures[Math.min(position - 1, definition.length - 1)]++;
        const stage = (definition as readonly string[]).indexOf(event.eventName);
        if (stage < 0) continue;
        if (reached.has(stage)) { retries[stage]++; continue; }
        if (stage !== position) continue;
        reached.add(stage); counts[stage]++;
        if (previous) durations[stage].push((+event.occurredAt - +previous) / 1000);
        previous = event.occurredAt; position++;
      }
    }
    return { name, stages: definition.map((eventName, index) => ({
      eventName, users: counts[index], conversionRate: percent(counts[index], index ? counts[index - 1] : counts[0]),
      abandonmentRate: index < definition.length - 1 ? percent(counts[index] - counts[index + 1], counts[index]) : null,
      medianElapsedSeconds: median(durations[index]), retryCount: retries[index],
      retryRate: percent(retries[index], counts[index] + retries[index]), errorCount: failures[index],
      errorRate: percent(failures[index], counts[index] + failures[index]),
    })) };
  });
  const topPaths = [...paths].map(([path, counts]) => ({ path, ...counts, abandoned: counts.count - counts.converted }))
    .sort((a, b) => b.count - a.count).slice(0, 20);
  return { definitionVersion: 1, funnels, topPaths,
    conversionPaths: topPaths.filter((path) => path.converted > 0),
    abandonmentPaths: topPaths.filter((path) => path.abandoned > 0),
    medianStepsToConversion: median(stepsToConversion),
    exits: [...exits].map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 20) };
}

/** Count attempts by stable payment ID, never by unique payer or page clicks. */
export function paymentAttemptRate(rows: JourneyEvent[]) {
  const attempted = new Set<string>();
  const succeeded = new Set<string>();
  for (const row of rows) {
    const paymentId = (row.properties as { paymentId?: unknown } | null)?.paymentId;
    if (typeof paymentId !== 'string') continue;
    if (row.eventName === 'payment_attempted') attempted.add(paymentId);
    if (row.eventName === 'payment_success') succeeded.add(paymentId);
  }
  const numerator = [...attempted].filter((id) => succeeded.has(id)).length;
  return { numerator, denominator: attempted.size, value: percent(numerator, attempted.size) };
}

export const ACTION_OUTCOMES = new Set(['upload_success', 'upload_failure', 'share_success', 'share_failure',
  'booking_confirmed', 'booking_error', 'payment_success', 'payment_failure', 'otp_verify_success', 'otp_verify_failure',
  'telecare_session_join_success', 'telecare_session_join_failure', 'dispatch_request_success', 'dispatch_request_failure']);

export function actionErrorRate(rows: Pick<JourneyEvent, 'eventName'>[]) {
  const attempts = rows.filter((row) => ACTION_OUTCOMES.has(row.eventName));
  const failures = attempts.filter((row) => /(?:_failure|_error)$/.test(row.eventName));
  return { numerator: failures.length, denominator: attempts.length, value: percent(failures.length, attempts.length) };
}
