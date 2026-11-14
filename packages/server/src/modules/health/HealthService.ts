import { Service } from '../../najm';
import { db } from '../../database/db';
import { sql } from 'drizzle-orm';
import { CacheService } from 'najm-cache';
import { readStorageSpace } from './storageSpace';

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

  /** Free and total bytes of the disk that holds uploaded files; null when it cannot be read. */
  async getStorageSpace() {
    return readStorageSpace();
  }

  async ping() {
    return this.message;
  }
}
