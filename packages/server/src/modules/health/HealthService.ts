import { Service } from '@server/najm';
import { db } from '@server/database/db';
import { sql } from 'drizzle-orm';
import { CacheService } from 'najm-cache';

type ReadinessProbe = () => Promise<unknown>;

export async function resolveReadiness(probes: {
  cache: ReadinessProbe;
  database: ReadinessProbe;
}) {
  const [database, cache] = await Promise.allSettled([
    Promise.resolve().then(probes.database),
    Promise.resolve().then(probes.cache),
  ]);
  const checks = {
    cache: cache.status === 'fulfilled' ? 'ok' : 'unavailable',
    database: database.status === 'fulfilled' ? 'ok' : 'unavailable',
  } as const;

  return {
    checks,
    ready: database.status === 'fulfilled' && cache.status === 'fulfilled',
  };
}

@Service()
export class HealthService {
  private readonly message = 'Health service is working correctly';

  constructor(private readonly cache: CacheService) {}

  async getHealth() {
    return this.message;
  }

  async getStatus() {
    return this.message;
  }

  async getReadiness() {
    return resolveReadiness({
      cache: () => this.cache.verifyReady(),
      database: () => db.execute(sql`select 1`),
    });
  }

  async ping() {
    return this.message;
  }
}
