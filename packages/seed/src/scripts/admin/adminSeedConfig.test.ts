import { describe, expect, test } from 'bun:test';
import { resolveAdminSeedCredentials } from './adminSeedConfig';

describe('admin seed credentials', () => {
  test('retains local defaults for development', () => {
    expect(resolveAdminSeedCredentials({ NODE_ENV: 'development' })).toEqual({
      email: 'admin@admin.com',
      password: 'ChangeMe123456',
    });
  });

  test('requires explicit production credentials before seeding', () => {
    expect(() => resolveAdminSeedCredentials({ NODE_ENV: 'production' })).toThrow('ADMIN_EMAIL');
    expect(() => resolveAdminSeedCredentials({ NODE_ENV: 'production', ADMIN_EMAIL: 'admin@school.test' })).toThrow('ADMIN_PASSWORD');
  });

  test('rejects default and template passwords in production', () => {
    for (const password of ['ChangeMe123456', 'replace-before-any-shared-environment']) {
      expect(() => resolveAdminSeedCredentials({
        NODE_ENV: 'production',
        ADMIN_EMAIL: 'admin@school.test',
        ADMIN_PASSWORD: password,
      })).toThrow('must not use');
    }
  });

  test('rejects weak production passwords', () => {
    expect(() => resolveAdminSeedCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@school.test',
      ADMIN_PASSWORD: 'short',
    })).toThrow('at least 8 characters');
  });

  test('accepts an eight-character production password', () => {
    expect(resolveAdminSeedCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@school.test',
      ADMIN_PASSWORD: 'Abcdefg1',
    })).toEqual({ email: 'admin@school.test', password: 'Abcdefg1' });
  });

  test('rejects passwords over the bcrypt byte limit before seeding', () => {
    expect(() => resolveAdminSeedCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@school.test',
      ADMIN_PASSWORD: `Abcdefg1${'é'.repeat(33)}`,
    })).toThrow('at most 72 bytes');
  });

  test('accepts and normalizes explicit production credentials', () => {
    expect(resolveAdminSeedCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: ' Admin@School.Test ',
      ADMIN_PASSWORD: 'UniqueSecret123',
    })).toEqual({ email: 'admin@school.test', password: 'UniqueSecret123' });
  });
});
