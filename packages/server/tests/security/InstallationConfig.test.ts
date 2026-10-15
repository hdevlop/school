import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { corsConfig } from '../../src/config/coreConfig';

const keys = ['FRONTEND_URL', 'CORS_ORIGIN', 'SCHOOL_STORAGE_PATH'] as const;
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe('installation configuration', () => {
  it('allows the installation runtime origin and preserves an explicit CORS override', () => {
    delete process.env.CORS_ORIGIN;
    for (const host of ['demo.example.test', 'customer.example.test']) {
      process.env.FRONTEND_URL = `https://${host}`;
      expect(corsConfig().config.origin).toContain(`https://${host}`);
    }
    process.env.CORS_ORIGIN = 'https://override.example.test';
    expect(corsConfig().config.origin).toContain('https://override.example.test');
    expect(corsConfig().config.origin).not.toContain('https://customer.example.test');
  });

  it('uses the shared container mount for app and worker uploads, with a local development fallback', () => {
    // Construct each storage plugin in a separate process: its factory applies
    // route decorators, so repeated calls would contaminate the guard suites.
    for (const configuredPath of ['/srv/school/storage', undefined]) {
      const env = { ...process.env };
      if (configuredPath) env.SCHOOL_STORAGE_PATH = configuredPath;
      else delete env.SCHOOL_STORAGE_PATH;
      const moduleUrl = new URL('../../src/config/storageConfig.ts', import.meta.url).href;
      const result = Bun.spawnSync([process.execPath, '-e', `
        const { storageConfig } = await import(${JSON.stringify(moduleUrl)});
        console.log(JSON.stringify(storageConfig().config.basePath));
      `], { env });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(new TextDecoder().decode(result.stdout))).toBe(configuredPath ?? 'storage');
    }
  });
});
