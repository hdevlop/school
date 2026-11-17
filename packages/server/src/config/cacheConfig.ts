import Redis from 'ioredis';
import { cache, redisCacheConfig } from 'najm-cache';
import { isProduction } from 'najm-core/env';
import { isNextBuildPhase } from 'najm-next/env';
import { env } from '../env';

/**
 * Redis in production, where rate limits and sessions must be shared across
 * instances; memory in development unless REDIS_URL is set, and always during
 * `next build`, which must not contact production services.
 *
 * ioredis is imported here, not left to najm-cache's dynamic require, so the
 * Next server bundle includes it.
 */
export const cacheConfig = () =>
  cache(redisCacheConfig({
    url: env.cache.redisUrl,
    Redis,
    keyPrefix: 'school:',
    required: isProduction(),
    buildPhase: isNextBuildPhase(),
  }));
