import Redis from 'ioredis';
import { cache, type CachePluginConfig } from 'najm-cache';

import { envString, isNextBuildPhase, isProduction } from './env';

/**
 * Redis in production, where rate limits and sessions must be shared across
 * instances; memory in development unless REDIS_URL is set.
 *
 *   REDIS_URL   redis:// or rediss:// URL. Required, with a password, in production.
 */

const KEY_PREFIX = 'school:';

type RedisClient = NonNullable<CachePluginConfig['redis']>['client'];

function resolveRedisUrl(value: string | undefined, required: boolean) {
  if (!value) {
    if (required) throw new Error('Production rate limiting requires a Redis URL.');
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (
      !['redis:', 'rediss:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      (required && !parsed.password)
    ) {
      throw new Error('invalid Redis URL');
    }
  } catch {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }

  return value;
}

function redisClient(url: string): RedisClient {
  const client = new Redis(url, {
    keyPrefix: KEY_PREFIX,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2_000)),
  });
  client.on('error', () => void 0);
  return client as unknown as RedisClient;
}

export function resolveCacheConfig(): CachePluginConfig {
  if (isNextBuildPhase()) return { driver: 'memory', required: false };

  const required = isProduction();
  const url = resolveRedisUrl(envString(process.env.REDIS_URL), required);
  // Production without a URL has already thrown above.
  if (!url) return { driver: 'memory', required };

  return {
    driver: 'redis',
    required,
    redis: { client: redisClient(url), keyPrefix: KEY_PREFIX, url },
  };
}

export const cacheConfig = () => cache(resolveCacheConfig());
