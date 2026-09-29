/** Calendar reporting is Africa/Lagos (UTC+1, no daylight saving). */
import { BadRequestException } from '@nestjs/common';
export const REPORTING_TIMEZONE = 'Africa/Lagos';
export const DAY_MS = 86_400_000;
const OFFSET_MS = 3_600_000;

export function previousReportingDay(referenceDate = new Date()) {
  const local = new Date(referenceDate.getTime() + OFFSET_MS);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return {
    reportDate: new Date(midnight - DAY_MS),
    start: new Date(midnight - DAY_MS - OFFSET_MS),
    end: new Date(midnight - OFFSET_MS),
  };
}

/** Named calendar periods and inclusive custom date labels, returned half-open. */
export function reportingRange(period = '30d', now = new Date()) {
  const today = previousReportingDay(new Date(+now + DAY_MS)).start;
  const local = new Date(+now + OFFSET_MS);
  let since: Date;
  let until = now;
  if (period === 'today') since = today;
  else if (period === 'yesterday') { since = new Date(+today - DAY_MS); until = today; }
  else if (['month', 'quarter', 'ytd'].includes(period)) {
    const month = period === 'ytd' ? 0 : period === 'quarter' ? Math.floor(local.getUTCMonth() / 3) * 3 : local.getUTCMonth();
    since = new Date(Date.UTC(local.getUTCFullYear(), month, 1) - OFFSET_MS);
  } else if (period.startsWith('custom:')) {
    const match = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(period);
    if (!match) throw new BadRequestException('Use custom:YYYY-MM-DD:YYYY-MM-DD');
    const from = new Date(`${match[1]}T00:00:00Z`), to = new Date(`${match[2]}T00:00:00Z`);
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || from.toISOString().slice(0, 10) !== match[1]
      || to.toISOString().slice(0, 10) !== match[2] || +from > +to || +to - +from > 366 * DAY_MS)
      throw new BadRequestException('Invalid date range (maximum 366 days)');
    since = new Date(+from - OFFSET_MS); until = new Date(+to + DAY_MS - OFFSET_MS);
  } else {
    if (!/^\d{1,3}d$/.test(period)) throw new BadRequestException('Invalid analytics period');
    const days = Number(period.slice(0, -1));
    if (days < 1 || days > 366) throw new BadRequestException('Period must be 1–366 days');
    since = new Date(+now - days * DAY_MS);
  }
  return { since, until };
}
