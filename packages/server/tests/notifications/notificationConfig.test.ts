import { describe, expect, it } from 'bun:test';
import { normalizeVapidSubject } from '../../src/modules/notifications/notificationConfig';

describe('the VAPID subject', () => {
  it('keeps a mailto: or https: contact as written', () => {
    expect(normalizeVapidSubject('mailto:ops@school.ma')).toBe('mailto:ops@school.ma');
    expect(normalizeVapidSubject(' MAILTO:ops@school.ma ')).toBe('MAILTO:ops@school.ma');
    expect(normalizeVapidSubject('https://school.ma/contact')).toBe('https://school.ma/contact');
  });

  it('prefixes a bare address once', () => {
    expect(normalizeVapidSubject('ops@school.ma')).toBe('mailto:ops@school.ma');
  });

  it('refuses anything else', () => {
    for (const value of [undefined, '', 'ops', 'http://school.ma', 'javascript:alert(1)', 'ftp://school.ma', `${'a'.repeat(320)}@x.ma`]) {
      expect(normalizeVapidSubject(value)).toBeUndefined();
    }
  });
});
