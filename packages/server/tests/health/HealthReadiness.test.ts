import { describe, expect, it } from 'bun:test';

import { resolveReadiness } from '@server/modules/health/HealthService';
import { HealthController } from '@server/modules/health/HealthController';
import type { HealthService } from '@server/modules/health/HealthService';

describe('health readiness', () => {
  it('requires both PostgreSQL and Redis', async () => {
    expect(
      await resolveReadiness({
        cache: async () => 'PONG',
        database: async () => [{ '?column?': 1 }],
      }),
    ).toEqual({
      checks: { cache: 'ok', database: 'ok' },
      ready: true,
    });
  });

  it('fails closed without exposing dependency errors', async () => {
    const databaseUnavailable = await resolveReadiness({
      cache: async () => 'PONG',
      database: async () => {
        throw new Error('postgresql://secret@database/school');
      },
    });
    expect(databaseUnavailable).toEqual({
      checks: { cache: 'ok', database: 'unavailable' },
      ready: false,
    });
    expect(JSON.stringify(databaseUnavailable)).not.toContain('secret');

    const cacheUnavailable = await resolveReadiness({
      cache: async () => {
        throw new Error('redis://:secret@redis:6379/0');
      },
      database: async () => [{ '?column?': 1 }],
    });
    expect(cacheUnavailable).toEqual({
      checks: { cache: 'unavailable', database: 'ok' },
      ready: false,
    });
    expect(JSON.stringify(cacheUnavailable)).not.toContain('secret');
  });

  it('returns a private 503 readiness response when a dependency is down', async () => {
    const controller = new HealthController({
      getReadiness: async () => ({
        checks: { cache: 'unavailable', database: 'ok' },
        ready: false,
      }),
    } as HealthService);
    const response = await controller.getStatus();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      checks: { cache: 'unavailable', database: 'ok' },
      service: 'school',
      status: 'not_ready',
      version: '0.1.0',
    });
  });
});
