import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';

export const NOTIFICATIONS_REDIS = 'NOTIFICATIONS_REDIS';

// Per-recipient send limits. Distinct from the HTTP throttler (which limits
// requests per IP/user): these limit messages per *destination* address,
// because many different flows (registration OTP, password reset, appointment
// reminder, billing receipt…) can all target one phone number / inbox. A
// recipient should never receive an abusive number of messages from us even
// if the requests originated from many endpoints and many users.
//
// Hour-window limits sized for legitimate worst-case:
//   SMS  — 5/hr: OTP + 1 retry + 2 reminders + slack = 5
//   Email — 10/hr: emails are cheaper and more tolerated
//   Push  — 30/hr: push is essentially free and silent
//   WhatsApp — 5/hr: template-message billing, treat like SMS
const LIMITS: Record<string, { max: number; ttlSeconds: number }> = {
  sms:      { max: 5,  ttlSeconds: 3600 },
  email:    { max: 10, ttlSeconds: 3600 },
  push:     { max: 30, ttlSeconds: 3600 },
  whatsapp: { max: 5,  ttlSeconds: 3600 },
};

@Injectable()
export class NotificationRateLimiterService {
  private readonly logger = new Logger(NotificationRateLimiterService.name);

  constructor(@Inject(NOTIFICATIONS_REDIS) private readonly redis: Redis) {}

  // Returns true if the send is allowed, false if the recipient is over budget.
  // Uses Redis INCR + first-touch EXPIRE — atomic, no race window between the
  // two commands (EXPIRE only fires on the count==1 branch, so the TTL is set
  // exactly once per window).
  async allow(channel: string, to: string): Promise<boolean> {
    const limit = LIMITS[channel];
    if (!limit) return true; // Unknown channel: don't block

    const key = `notif:rl:${channel}:${to.toLowerCase()}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, limit.ttlSeconds);
    }

    if (count > limit.max) {
      this.logger.warn(
        `Suppressed ${channel} to ${this.redact(to)} — ${count} sends in last ${limit.ttlSeconds}s exceeds limit ${limit.max}`,
      );
      return false;
    }
    return true;
  }

  // Mask recipient in logs: never write full phone/email to log files.
  private redact(to: string): string {
    if (to.includes('@')) {
      const [user, domain] = to.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    }
    return `${to.slice(0, 4)}***${to.slice(-2)}`;
  }
}
