import { describe, expect, test } from 'bun:test';
import { keepPushWorkerCurrent } from '@/features/Notifications/keepPushWorkerCurrent';

function fakeContainer(existing: Partial<ServiceWorkerRegistration> | undefined) {
  const registered: string[] = [];
  let checks = 0;
  const registration = { update: async () => { checks += 1; }, ...existing } as ServiceWorkerRegistration;
  return {
    registered,
    checks: () => checks,
    container: {
      getRegistration: async () => (existing ? registration : undefined),
      register: async (script: string | URL) => { registered.push(String(script)); return registration; },
    },
  };
}

describe('keepPushWorkerCurrent', () => {
  test('a signed-in device registers the worker and checks it for a newer script', async () => {
    const device = fakeContainer(undefined);
    await keepPushWorkerCurrent(device.container, true);
    expect(device.registered).toEqual(['/sw.js']);
    expect(device.checks()).toBe(1);
  });

  test('a signed-out device gets no worker it did not have', async () => {
    const device = fakeContainer(undefined);
    await keepPushWorkerCurrent(device.container, false);
    expect(device.registered).toEqual([]);
    expect(device.checks()).toBe(0);
  });

  test('a signed-out device still replaces the older worker it has', async () => {
    const device = fakeContainer({});
    await keepPushWorkerCurrent(device.container, false);
    expect(device.registered).toEqual([]);
    expect(device.checks()).toBe(1);
  });

  test('a worker already installing is not checked again', async () => {
    const device = fakeContainer({ installing: {} as ServiceWorker });
    await keepPushWorkerCurrent(device.container, true);
    expect(device.checks()).toBe(0);
  });
});
