import { detectLoginLocationAnomalies, LoginAttemptRow } from './login-anomaly.util';

function row(overrides: Partial<LoginAttemptRow>): LoginAttemptRow {
  return {
    userId: 'u1',
    email: 'a@example.com',
    occurredAt: new Date('2026-09-14T08:00:00Z'),
    countryCode: 'NG',
    success: true,
    ...overrides,
  };
}

describe('detectLoginLocationAnomalies', () => {
  it('flags a successful login from a different country than the same user\'s previous successful login', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ countryCode: 'NG', occurredAt: new Date('2026-09-14T08:00:00Z') }),
      row({ countryCode: 'US', occurredAt: new Date('2026-09-14T09:00:00Z') }),
    ]);

    expect(anomalies).toEqual([
      { userId: 'u1', email: 'a@example.com', fromCountry: 'NG', toCountry: 'US', occurredAt: new Date('2026-09-14T09:00:00Z') },
    ]);
  });

  it('does not flag consecutive logins from the same country', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ countryCode: 'NG' }),
      row({ countryCode: 'NG' }),
    ]);

    expect(anomalies).toEqual([]);
  });

  it('is case-insensitive on country codes', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ countryCode: 'ng' }),
      row({ countryCode: 'NG' }),
    ]);

    expect(anomalies).toEqual([]);
  });

  it('ignores failed attempts entirely — they never set or break the "previous country"', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ countryCode: 'NG', success: true }),
      row({ countryCode: 'US', success: false }), // wrong password from a new country
      row({ countryCode: 'NG', success: true }), // still NG — no anomaly despite the failed US attempt between
    ]);

    expect(anomalies).toEqual([]);
  });

  it('does not compare across different users even when rows are adjacent', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ userId: 'u1', countryCode: 'NG' }),
      row({ userId: 'u2', countryCode: 'US' }),
    ]);

    expect(anomalies).toEqual([]);
  });

  it('does not flag the very first login for a user (no previous country to compare against)', () => {
    const anomalies = detectLoginLocationAnomalies([row({ countryCode: 'US' })]);

    expect(anomalies).toEqual([]);
  });

  it('treats a null countryCode as unknown, never itself the trigger or target of an anomaly', () => {
    const anomalies = detectLoginLocationAnomalies([
      row({ countryCode: 'NG' }),
      row({ countryCode: null }),
      row({ countryCode: 'US' }),
    ]);

    // NG -> null: skipped (target unknown). null -> US: skipped (source
    // never became "previous" because a null country doesn't update it).
    // So the comparison that actually lands is NG (still "previous") -> US.
    expect(anomalies).toEqual([
      expect.objectContaining({ fromCountry: 'NG', toCountry: 'US' }),
    ]);
  });
});
