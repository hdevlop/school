import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CacheService, MemoryDriver } from 'najm-cache';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const installed = (packageName: string, file: string) =>
  readFileSync(join(repoRoot, 'node_modules', packageName, file), 'utf8');

describe('the installed auth hardening contract', () => {
  test('pins the remediated Auth and Cache releases', () => {
    const auth = JSON.parse(installed('najm-auth', 'package.json')) as {
      version: string;
    };
    const cache = JSON.parse(installed('najm-cache', 'package.json')) as {
      version: string;
    };

    expect(auth.version).toBe('4.0.4');
    expect(cache.version).toBe('2.2.0');
  });

  test('requires family-bound sessions and live-family verification', () => {
    const declarations = installed('najm-auth', 'dist/index.d.ts');
    const runtime = installed('najm-auth', 'dist/index.js');

    expect(declarations).toContain('tokenFamily: string;');
    expect(declarations).toContain(
      "Promise<'live' | 'revoked' | 'unknown'>",
    );
    expect(runtime).toContain('isSessionFamilyLive(session.tokenFamily');
    expect(runtime).toContain('authEmailRateLimitKey');
  });

  test('allows exactly one concurrent reset-token consumer', async () => {
    const driver = new MemoryDriver();
    const cache = new CacheService(driver);
    await cache.set('reset:token', 'expected', 60_000);

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        cache.compareAndDelete('reset:token', 'expected'),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await cache.get('reset:token')).toBeNull();
    await cache.destroy();
  });
});
