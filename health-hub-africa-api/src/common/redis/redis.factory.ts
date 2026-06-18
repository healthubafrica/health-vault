import Redis, { RedisOptions } from 'ioredis';
import { ConfigService } from '@nestjs/config';

// Centralised ioredis client builder so every consumer (Throttler, OpenEMR,
// future caches, etc.) agrees on how REDIS_URL is parsed and what TLS rules
// apply for `rediss://` hosts.
export function createRedisClient(
  config: ConfigService,
  extra: RedisOptions = {},
): Redis {
  const redisUrl = config.get<string>('REDIS_URL');
  const base: RedisOptions = { lazyConnect: true, ...extra };

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return new Redis({
        ...base,
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
      });
    } catch {
      return new Redis(redisUrl, base);
    }
  }

  return new Redis({
    ...base,
    host: config.get('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
  });
}
