import { afterEach, describe, expect, it } from 'bun:test';
import { cache as cachePlugin, CacheService } from 'najm-cache';
import { Server } from 'najm-core';
import { resolveClientAddress } from 'najm-rate';

import {
  authInfrastructureConfig,
  mcpConfig,
  rateLimitConfig,
  resolveCacheConfig,
  resolveTrustedProxyHops,
} from '@server/config';

const originalNodeEnv = process.env.NODE_ENV;
const originalHops = process.env.SCHOOL_TRUSTED_PROXY_HOPS;
const originalRedisUrl = process.env.REDIS_URL;
const originalNextPhase = process.env.NEXT_PHASE;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalHops === undefined) delete process.env.SCHOOL_TRUSTED_PROXY_HOPS;
  else process.env.SCHOOL_TRUSTED_PROXY_HOPS = originalHops;
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = originalRedisUrl;
  if (originalNextPhase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = originalNextPhase;
});

describe('shared security configuration', () => {
  it('protects same-origin MCP discovery and sanitizes failures', () => {
    expect(mcpConfig().config).toMatchObject({
      auth: { type: 'najm-auth' },
      cors: false,
      exposeErrorDetails: false,
    });
  });

  it('uses the exact production proxy boundary and trusts none locally', () => {
    delete process.env.SCHOOL_TRUSTED_PROXY_HOPS;
    process.env.NODE_ENV = 'production';
    expect(resolveTrustedProxyHops()).toBe(1);
    expect(rateLimitConfig().config.trustedProxyHops).toBe(1);

    process.env.NODE_ENV = 'development';
    expect(resolveTrustedProxyHops()).toBe(0);
  });

  it('requires the installed Redis cache contract in production', () => {
    delete process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'rediss://:test-password@redis.internal:6379/0';

    expect(authInfrastructureConfig()).toMatchObject({
      cache: {
        driver: 'redis',
        redis: {
          keyPrefix: 'school:',
          url: 'rediss://:test-password@redis.internal:6379/0',
        },
        required: true,
      },
      rateLimit: { trustedProxyHops: 1 },
    });
    const config = resolveCacheConfig();
    expect(config.redis?.client).toBeDefined();
    const service = new CacheService({
      driver: config.driver ?? 'auto',
      memory: config.memory ?? {},
      redis: config.redis,
      required: config.required ?? false,
    });
    expect(service.type).toBe('redis');
  });

  it('uses memory locally and during a production build', () => {
    delete process.env.REDIS_URL;
    delete process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'development';
    expect(resolveCacheConfig()).toEqual({ driver: 'memory', required: false });

    process.env.NODE_ENV = 'production';
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(resolveCacheConfig()).toEqual({ driver: 'memory', required: false });
  });

  it('rejects missing, malformed, or unauthenticated production Redis without leaking values', () => {
    delete process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;
    expect(() => resolveCacheConfig()).toThrow('requires a Redis URL');

    const secret = 'redis-password-must-not-leak';
    process.env.REDIS_URL = `https://:${secret}@redis.internal/0`;
    let message = '';
    try {
      resolveCacheConfig();
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain('REDIS_URL');
    expect(message).not.toContain(secret);

    process.env.REDIS_URL = 'redis://redis.internal:6379/0';
    expect(() => resolveCacheConfig()).toThrow('REDIS_URL');
  });

  it('fails startup when required Redis is unreachable without logging its address', async () => {
    delete process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://:startup-secret@127.0.0.1:1/0';
    const isolated = new Server({ isolated: true }).use(cachePlugin(resolveCacheConfig()));

    let message = '';
    try {
      await isolated.init();
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain('cache backend is not reachable');
    expect(message).not.toContain('startup-secret');
    expect(message).not.toContain('127.0.0.1');
  });

  it('rejects invalid or excessive proxy-hop overrides', () => {
    process.env.SCHOOL_TRUSTED_PROXY_HOPS = '-1';
    expect(() => resolveTrustedProxyHops()).toThrow('from 0 to 8');

    process.env.SCHOOL_TRUSTED_PROXY_HOPS = '9';
    expect(() => resolveTrustedProxyHops()).toThrow('from 0 to 8');
  });

  it('ignores attacker-prepended addresses at the configured boundary', () => {
    const first = resolveClientAddress(
      { 'x-forwarded-for': '198.51.100.10, 203.0.113.7' },
      1,
    );
    const rotated = resolveClientAddress(
      { 'x-forwarded-for': '192.0.2.44, 203.0.113.7' },
      1,
    );
    expect(rotated).toBe(first);
  });
});
