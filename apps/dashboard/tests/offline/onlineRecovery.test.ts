import { describe, expect, test } from 'bun:test';
import { isOnlinePageReady } from '../../src/offline/onlineRecovery';

const url = 'https://school.example/students?academicYear=2026-2027';
const document = (status = 200, body = '<!doctype html><h1>School</h1>') => new Response(body, {
  status, headers: { 'content-type': 'text/html' },
});

function server(health: Response, page: Response | Error) {
  const calls: { url: string; options?: RequestInit }[] = [];
  const request = (async (input: RequestInfo | URL, options?: RequestInit) => {
    calls.push({ url: String(input), options });
    if (calls.length === 1) return health;
    if (page instanceof Error) throw page;
    return page;
  }) as typeof fetch;
  return { request, calls };
}

describe('returning from the offline shell', () => {
  test('requires the real page as well as a healthy API, without cached responses', async () => {
    const { request, calls } = server(Response.json({ status: 'ok' }), document());
    expect(await isOnlinePageReady(url, new AbortController().signal, request)).toBe(true);
    expect(calls.map(call => call.url)).toEqual(['https://school.example/api/health/status', url]);
    for (const { options } of calls) {
      expect(options?.cache).toBe('no-store');
      expect(options?.credentials).toBe('same-origin');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  test('stays offline when health fails or a network login page replaces the API', async () => {
    for (const health of [Response.json({}, { status: 503 }), document()]) {
      const { request, calls } = server(health, document());
      expect(await isOnlinePageReady(url, new AbortController().signal, request)).toBe(false);
      expect(calls).toHaveLength(1);
    }
  });

  test('a reachable API does not hide an unavailable or slow page', async () => {
    for (const page of [document(503), Response.json({}), new Error('connection failed'), new DOMException('timed out', 'TimeoutError'),
      document(200, '<meta name="school-shell-version" content="cached">'), document(200, "<meta content='cached' name='school-shell-version'>"), document(200, '')]) {
      const { request } = server(Response.json({}), page);
      expect(await isOnlinePageReady(url, new AbortController().signal, request)).toBe(false);
    }
  });

  test('returns to authoritative sign-in, forbidden and missing pages', async () => {
    for (const status of [200, 401, 403, 404]) {
      const page = document(status);
      Object.defineProperty(page, 'url', { value: 'https://school.example/login?from=%2Fstudents' });
      const { request } = server(Response.json({}), page);
      expect(await isOnlinePageReady(url, new AbortController().signal, request)).toBe(true);
    }
  });

  test('does not navigate to another origin or a download', async () => {
    const external = document();
    Object.defineProperty(external, 'url', { value: 'https://network-login.example/' });
    const download = document(); download.headers.set('content-disposition', 'attachment');
    for (const page of [external, download]) {
      const { request } = server(Response.json({}), page);
      expect(await isOnlinePageReady(url, new AbortController().signal, request)).toBe(false);
    }
  });

  test('an aborted check cannot return to the live page', async () => {
    const controller = new AbortController(); controller.abort();
    const { request, calls } = server(Response.json({}), document());
    expect(await isOnlinePageReady(url, controller.signal, request)).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
