import 'reflect-metadata';
import { afterEach, expect, it, mock } from 'bun:test';
import { Agent, request } from 'node:https';
import { createSafePushAgent, isPublicPushAddress } from '../../src/modules/notifications/pushEndpoint';
import { pushSubscriptionDto, pushUnsubscribeDto } from '../../src/modules/notifications/notificationDto';
import { vapidConfig } from '../../src/modules/notifications/notificationConfig';
import { PushSender, PUSH_DEADLINE_MS } from '../../src/modules/notifications/PushSender';

const target = { endpoint: 'https://fcm.googleapis.com/fcm/send/canary', p256dh: 'canary', auth: 'canary' };
const originalConfigured = Object.getOwnPropertyDescriptor(vapidConfig, 'configured')!;
afterEach(() => { mock.restore(); Object.defineProperty(vapidConfig, 'configured', originalConfigured); });

it('SEC-004 accepts supported HTTPS providers and rejects arbitrary hosts, ports and credentials', () => {
  for (const host of ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'db5p.notify.windows.com']) {
    expect(pushSubscriptionDto.safeParse({ ...target, endpoint: `https://${host}/canary` }).success).toBe(true);
  }
  for (const endpoint of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a', 'https://[::1]/a', 'https://10.0.0.1/a', 'https://evil.example/a', 'https://fcm.googleapis.com.evil.example/a', 'https://fcm.googleapis.com:9443/a', 'https://user:pass@fcm.googleapis.com/a', 'https://fcm.googleapis.com/a#fragment']) {
    expect(pushSubscriptionDto.safeParse({ ...target, endpoint }).success).toBe(false);
  }
  // Invalid legacy endpoints can still be removed, but cannot be sent to.
  expect(pushUnsubscribeDto.safeParse({ endpoint: 'https://127.0.0.1/legacy' }).success).toBe(true);
});

it('SEC-004 rejects private, mapped, documentation and mixed public/private DNS results', async () => {
  for (const address of ['0.0.0.0', '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '198.18.0.1', '224.0.0.1', '192.0.2.1', '::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1', '3fff::1']) {
    expect(isPublicPushAddress(address)).toBe(false);
  }
  expect(isPublicPushAddress('8.8.8.8')).toBe(true);
  expect(isPublicPushAddress('2607:f8b0:4007:80d::200a')).toBe(true);
  for (const records of [[], [{ address: '127.0.0.1', family: 4 }], [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }], [{ address: '8.8.8.8', family: 6 }]]) {
    await expect(createSafePushAgent(target.endpoint, async () => records)).rejects.toThrow();
  }
});

it('SEC-004 pins the validated addresses into the TLS agent lookup, without another DNS query', async () => {
  let lookups = 0;
  const agent = await createSafePushAgent(target.endpoint, async () => {
    lookups++;
    return [{ address: '8.8.8.8', family: 4 }];
  });
  const lookup = agent.options.lookup!;
  const result = await new Promise((resolve, reject) => lookup('fcm.googleapis.com', {}, (err, address, family) => err ? reject(err) : resolve({ address, family })));
  expect(result).toEqual({ address: '8.8.8.8', family: 4 });
  await expect(new Promise((resolve, reject) => lookup('evil.example', {}, (err, address) => err ? reject(err) : resolve(address)))).rejects.toThrow();
  expect(lookups).toBe(1);
  agent.destroy();
});

it('SEC-004 requires the actual worker runtime to honor the HTTPS agent lookup', async () => {
  let lookups = 0;
  const agent = new Agent({ lookup(_host, _options, callback) {
    lookups++;
    callback(Object.assign(new Error('AUDIT_PIN_USED'), { code: 'AUDIT_PIN_USED' }), '', 0);
  } });
  // Lookup aborts before a connection. The reserved .invalid name also prevents
  // provider traffic if a future runtime silently ignores the custom agent.
  const code = await new Promise((resolve) => {
    const req = request({ hostname: 'audit-pinning.invalid', agent }, () => resolve('unexpected_response'));
    const timer = setTimeout(() => { req.destroy(); resolve('deadline'); }, 1000);
    req.on('error', (error) => { clearTimeout(timer); resolve((error as NodeJS.ErrnoException).code); });
    req.end();
  });
  agent.destroy();
  expect(code).toBe('AUDIT_PIN_USED');
  expect(lookups).toBe(1);
});

it('SEC-004 refuses unsafe stored endpoints before dispatch and bounds a stalled send', async () => {
  Object.defineProperty(vapidConfig, 'configured', { configurable: true, value: true });
  const requests: Array<Record<string, unknown>> = [];
  const fake = {
    setVapidDetails() {},
    sendNotification(_subscription: unknown, _payload: unknown, options: Record<string, unknown>) {
      requests.push(options);
      return requests.length === 1 ? new Promise(() => {}) : Promise.resolve({ statusCode: 201 });
    },
  };
  mock.module('web-push', () => ({ default: fake, ...fake }));
  const payload = { notificationId: 'canary', title: 'local test', body: 'local test' };
  expect(await new PushSender().send({ ...target, endpoint: 'https://127.0.0.1/canary' }, payload))
    .toEqual({ result: 'failed', code: 'push_invalid_endpoint' });
  expect(requests).toEqual([]);
  let destroyed = 0;
  class LocalSender extends PushSender {
    protected async agentFor() {
      const agent = new Agent();
      agent.destroy = () => { destroyed++; };
      return agent;
    }
  }
  const sender = new LocalSender();
  // Advance only the deadline timer, with no provider/DNS/network involved.
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: (...args: unknown[]) => void, ms: number, ...args: unknown[]) =>
    realSetTimeout(fn, ms === PUSH_DEADLINE_MS ? 5 : ms, ...args)) as typeof setTimeout;
  try {
    expect(await sender.send(target, payload)).toEqual({ result: 'transient', code: 'push_network_error' });
    expect(await sender.send(target, payload)).toEqual({ result: 'sent' });
    expect(requests[0].timeout).toBe(PUSH_DEADLINE_MS);
    expect(requests[0].agent).toBeInstanceOf(Agent);
    expect(destroyed).toBeGreaterThanOrEqual(2);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});
