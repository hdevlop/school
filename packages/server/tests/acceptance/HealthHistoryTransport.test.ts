import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { resolveReadiness } = await import('../../src/modules/health/HealthService');
const base = 'http://school.local/api';

beforeAll(async () => { await server.listen(5518); });
afterAll(async () => { await server.stop(); });

async function request(path: string, year?: string) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    headers: year ? { 'X-Academic-Year': year } : undefined,
  }));
  return { response, body: await response.json() as Record<string, any> };
}

describe('shared health infrastructure', () => {
  it('keeps liveness, ping and readiness independent of the selected academic year', async () => {
    expect(yearScopedModules).not.toHaveProperty('health');
    for (const year of [undefined, '2025-2026', '2026-2027', 'not-a-year']) {
      const health = await request('/health', year);
      expect(health.response.status).toBe(200);
      expect(health.body.data).toBe('Health service is working correctly');

      const ping = await request('/health/ping', year);
      expect(ping.response.status).toBe(200);
      expect(ping.body.data).toBe('Health service is working correctly');

      const status = await request('/health/status', year);
      expect(status.response.status).toBe(200);
      expect(status.response.headers.get('cache-control')).toBe('no-store');
      expect(status.body).toMatchObject({
        service: 'school', status: 'ready',
        checks: { cache: 'ok', database: 'ok' },
      });
    }
    const conflicting = await request('/health/status?academicYear=2026-2027', '2025-2026');
    expect(conflicting.response.status).toBe(200);
    expect(conflicting.body.status).toBe('ready');
  });

  it('reports database and cache failure independently without querying a year', async () => {
    expect(await resolveReadiness({
      database: async () => { throw new Error('database unavailable'); },
      cache: async () => true,
    })).toEqual({ ready: false, checks: { cache: 'ok', database: 'unavailable' } });
    expect(await resolveReadiness({
      database: async () => true,
      cache: async () => { throw new Error('cache unavailable'); },
    })).toEqual({ ready: false, checks: { cache: 'unavailable', database: 'ok' } });
  });
});
