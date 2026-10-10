import Redis from 'ioredis';
import { cache, redisCacheConfig } from 'najm-cache';
import { isProduction } from 'najm-core/env';
import { isNextBuildPhase } from 'najm-next/env';

/**
 * Redis in production, where rate limits and sessions must be shared across
 * instances; memory in development unless REDIS_URL is set, and always during
 * `next build`, which must not contact production services.
 *
 *   REDIS_URL   redis:// or rediss:// URL. Required, with a password, in production.
 *
 * ioredis is imported here, not left to najm-cache's dynamic require, so the
 * Next server bundle includes it.
 */
export const cacheConfig = () =>
  cache(redisCacheConfig({
    url: process.env.REDIS_URL,
    Redis,
    keyPrefix: 'school:',
    required: isProduction(),
    buildPhase: isNextBuildPhase(),
  }));
