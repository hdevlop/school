import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '../../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('production rate-limit deployment contract', () => {
  it('ships one explicit ioredis implementation for the package-owned cache', () => {
    const manifest = JSON.parse(read('package.json'));
    const serverManifest = JSON.parse(read('packages/server/package.json'));
    const rootIoredis = Bun.resolveSync('ioredis/package.json', root);
    const cacheIoredis = Bun.resolveSync(
      'ioredis/package.json',
      resolve(root, 'node_modules/najm-cache'),
    );

    expect(manifest.dependencies.ioredis).toBe('5.11.1');
    expect(manifest.overrides.ioredis).toBe('5.11.1');
    expect(serverManifest.dependencies.ioredis).toBe('5.11.1');
    expect(cacheIoredis).toBe(rootIoredis);
  });

  it('requires an internal persistent authenticated Redis service', () => {
    const compose = read('compose.production.yml');
    const redisService = compose.slice(compose.lastIndexOf('\n  redis:\n'));

    expect(compose).toContain('redis:\n        condition: service_healthy');
    expect(redisService).toContain('redis-server --appendonly yes --requirepass');
    expect(redisService).toContain('- redis_data:/data');
    expect(redisService).toContain('- backend');
    expect(redisService).toContain('- default');
    expect(redisService).not.toMatch(/\n\s+ports:/);
  });

  it('keeps the protected Redis credentials split across deployment environments', () => {
    const appEnv = read('deploy/env/app.env.example');
    const infrastructureEnv = read('deploy/env/infrastructure.env.example');

    expect(appEnv).toContain(
      'REDIS_URL=redis://:REPLACE_WITH_STRONG_REDIS_PASSWORD@redis:6379/0',
    );
    expect(infrastructureEnv).toContain(
      'REDIS_PASSWORD=REPLACE_WITH_STRONG_REDIS_PASSWORD',
    );
  });

  it('uses dependency-aware readiness for container and deployment health', () => {
    expect(read('Dockerfile')).toContain('/api/health/status');
    expect(read('compose.production.yml')).toContain('/api/health/status');
    expect(read('.github/workflows/deploy-production.yml')).toContain(
      'https://myscolai.com/api/health/status',
    );
  });
});
