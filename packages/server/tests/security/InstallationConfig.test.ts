import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { schoolServerOptions } from '../../src/config/server';

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
      expect(schoolServerOptions().cors.origin).toContain(`https://${host}`);
    }
    process.env.CORS_ORIGIN = 'https://override.example.test';
    expect(schoolServerOptions().cors.origin).toContain('https://override.example.test');
    expect(schoolServerOptions().cors.origin).not.toContain('https://customer.example.test');
  });

  it('uses the shared container mount for app and worker uploads, with a local development fallback', () => {
    process.env.SCHOOL_STORAGE_PATH = '/srv/school/storage';
    expect(schoolServerOptions().storage.basePath).toBe('/srv/school/storage');
    delete process.env.SCHOOL_STORAGE_PATH;
    expect(schoolServerOptions().storage.basePath).toBe('storage');
  });
});
