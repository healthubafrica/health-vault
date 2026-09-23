// Pure comparison logic for docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md's
// event-vs-transactional and aggregate-vs-source pairs. Kept separate from
// AnalyticsReconciliationService (which only fetches counts and calls these)
// so the comparison math is unit-testable without a Prisma mock.

export interface ReconciliationResult {
  pair: string;
  analyticsCount: number;
  transactionalCount: number;
  diff: number;
  /** Absolute-diff threshold before this counts as a real mismatch, not a
   * boundary-race blip — see docs/ANALYTICS-DATA-RECONCILIATION-PLAN.md
   * ("1 row, or 0.5% of volume, whichever is larger"). */
  mismatched: boolean;
}

export function compareCounts(pair: string, analyticsCount: number, transactionalCount: number): ReconciliationResult {
  const diff = Math.abs(analyticsCount - transactionalCount);
  const threshold = Math.max(1, Math.ceil(transactionalCount * 0.005));
  return {
    pair,
    analyticsCount,
    transactionalCount,
    diff,
    mismatched: diff > threshold,
  };
}

/** Amount-based pairs (revenue) compare kobo values, not row counts — same
 * threshold shape but expressed in currency, not "rows". */
export function compareAmounts(pair: string, analyticsAmount: number, transactionalAmount: number): ReconciliationResult {
  const diff = Math.abs(analyticsAmount - transactionalAmount);
  const threshold = Math.max(1, Math.ceil(transactionalAmount * 0.005));
  return {
    pair,
    analyticsCount: analyticsAmount,
    transactionalCount: transactionalAmount,
    diff,
    mismatched: diff > threshold,
  };
}
