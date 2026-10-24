import { CACHE_ID } from './bootstrap';

const NO_REPLY = Symbol('no reply');

// Najm's versioned public PWA status protocol. Resolves to the worker's reply,
// NO_REPLY when it gives none in time, or undefined when it cannot be asked.
function requestStatus(worker: ServiceWorker, timeoutMs: number): Promise<unknown> {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = (value: unknown) => {
      clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value);
    };
    const timer = setTimeout(() => finish(NO_REPLY), timeoutMs);
    channel.port1.onmessage = event => finish(event.data);
    try { worker.postMessage({ type: 'NAJM_PWA_STATUS', protocol: 1, cacheId: CACHE_ID }, [channel.port2]); }
    catch { finish(undefined); }
  });
}

// Cache presence also describes a waiting update. Ask the worker that actually
// controls this page.
export async function isActiveShellReady(container: Pick<ServiceWorkerContainer, 'controller'>, version: string, timeoutMs = 2000): Promise<boolean> {
  const worker = container.controller;
  if (!worker || worker.state !== 'activated') return false;
  const status = await requestStatus(worker, timeoutMs) as { protocol?: unknown; cacheId?: unknown; cacheVersion?: unknown; ready?: unknown } | undefined;
  return container.controller === worker && worker.state === 'activated' && status?.protocol === 1
    && status.cacheId === CACHE_ID && status.cacheVersion === version && status.ready === true;
}

// A timeout means unknown readiness, never proof of an obsolete worker.
