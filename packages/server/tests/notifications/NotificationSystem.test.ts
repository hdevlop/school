import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

import {
  isValidVapidPublicKey,
  normalizeVapidSubject,
} from '../../src/modules/notifications/notificationConfig';

describe('School notification system', () => {
  it('accepts only valid VAPID contact subjects and uncompressed public keys', () => {
    const publicKey = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url');

    expect(normalizeVapidSubject('ops@school.test')).toBe('mailto:ops@school.test');
    expect(normalizeVapidSubject('https://school.test/push')).toBe('https://school.test/push');
    expect(normalizeVapidSubject('javascript:alert(1)')).toBeUndefined();
    expect(isValidVapidPublicKey(publicKey)).toBe(true);
    expect(isValidVapidPublicKey('not-a-vapid-key')).toBe(false);
  });

  it('runs a private dedicated worker with a Redis heartbeat', () => {
    const compose = readFileSync(
      new URL('../../../../compose.production.yml', import.meta.url),
      'utf8',
    );
    const worker = compose.match(/  notifications-worker:[\s\S]*?\n  postgres:/)?.[0];

    expect(worker).toBeDefined();
    expect(worker).toContain('command: ["bun", "run", "notifications:worker"]');
    expect(worker).toContain('school:notifications:worker:heartbeat');
    expect(worker).toContain('- notifications-egress');
    expect(worker).not.toContain('ports:');
  });
});
