import { describe, expect, test } from 'bun:test';

import { GET as serviceWorker } from '@/app/sw.js/route';

describe('PWA service worker', () => {
  test('uses the shared privacy-safe worker with a School fallback', async () => {
    const response = serviceWorker();
    const worker = await response.text();

    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate');
    expect(worker).toContain('const CACHE_PREFIX = "najm-pwa:myscolai-shell:"');
    expect(worker).toContain('MyScolAI is offline');
    expect(worker).toContain('request.mode !== "navigate"');
    expect(worker).not.toContain('cache.put');
    expect(worker).not.toContain('"/api/"');
  });
});
