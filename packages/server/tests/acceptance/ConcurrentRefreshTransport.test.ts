import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { CacheService } from 'najm-cache';

/**
 * Tabs share one cookie jar. Two or three of them (or a tab and a server
 * render) refresh at the same moment with the same refresh cookie: their
 * access tokens were issued together, and a browser aligns the timers of
 * hidden tabs. On 2026-09-29 this revoked the admin's session twice. Every
 * such refresh must succeed and set the same new refresh cookie, so the jar
 * holds the current token whichever response lands last, and the session must
 * stay usable afterwards. This runs on PostgreSQL, whose `timestamp` columns
 * come back without a zone, so it also covers a server ahead of UTC.
 */

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// Match the explicit proxy topology in the route-security suite; requests
// must exercise the limiter rather than development's unresolved-IP skip.
process.env.SCHOOL_TRUSTED_PROXY_HOPS = '1';

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5533;

/** A cookie jar: name → value, updated from each response's Set-Cookie. */
type Jar = Map<string, string>;

function absorb(jar: Jar, response: Response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair, ...attributes] = header.split(';');
    const index = pair.indexOf('=');
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    const expired = attributes.some((attribute) => /max-age=0\b/i.test(attribute.trim()))
      || value === '';
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}

/** The refresh token a response set, if it set one. */
function refreshCookieSet(response: Response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(';');
    if (pair.startsWith('refreshToken=')) return pair.slice('refreshToken='.length);
  }
  return undefined;
}

const cookieHeader = (jar: Jar) => [...jar].map(([name, value]) => `${name}=${value}`).join('; ');

async function post(path: string, jar: Jar, data?: unknown) {
  return server.fetch(new Request(`${base}${path}`, {
    method: 'POST',
    headers: {
      origin: 'http://school.local',
      'x-forwarded-for': '198.18.0.22',
      ...(jar.size ? { cookie: cookieHeader(jar) } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
}

async function signIn(): Promise<Jar> {
  const jar: Jar = new Map();
  const response = await post('/auth/login', jar, { email: 'admin@history.example.test', password: adminPassword });
  expect(response.status).toBe(200);
  absorb(jar, response);
  expect(jar.size).toBeGreaterThan(0);
  return jar;
}

beforeAll(async () => {
  await server.listen(port);
  if (process.env.REDIS_URL?.trim()) expect(server.container.get(CacheService).type).toBe('redis');
});
afterAll(async () => { await server.stop(); });

describe('refreshes that share one refresh cookie', () => {
  it('all succeed when three are sent together, and the session keeps working', async () => {
    const jar = await signIn();
    const sent = new Map(jar);

    const responses = await Promise.all([1, 2, 3].map(() => post('/auth/refresh', sent)));
    const statuses = responses.map((response) => response.status);
    // A browser keeps whichever cookie its last response set.
    for (const response of responses) absorb(jar, response);

    expect(statuses).toEqual([200, 200, 200]);
    const issued = responses.map(refreshCookieSet);
    expect(issued[0]).toBeTruthy();
    expect(new Set(issued).size).toBe(1);
    const after = await post('/auth/refresh', jar);
    expect(after.status).toBe(200);
    absorb(jar, after);
    await post('/auth/logout', jar);
  });

  it('keeps the session when the replaced cookie arrives again inside the grace window', async () => {
    const jar = await signIn();
    const replaced = new Map(jar);

    const first = await post('/auth/refresh', jar);
    expect(first.status).toBe(200);
    absorb(jar, first);

    // Two more tabs whose requests still carried the replaced cookie.
    const late = [await post('/auth/refresh', replaced), await post('/auth/refresh', replaced)];
    expect(late.map((response) => response.status)).toEqual([200, 200]);
    expect(late.map(refreshCookieSet)).toEqual([refreshCookieSet(first), refreshCookieSet(first)]);
    for (const response of late) absorb(jar, response);

    const after = await post('/auth/refresh', jar);
    expect(after.status).toBe(200);
    absorb(jar, after);
    await post('/auth/logout', jar);
  });

  it('recovers a refresh whose response never reached the browser', async () => {
    // The page reloads while a refresh is in flight: the server rotates, but
    // the jar never stores the new cookie and presents the old one again.
    const jar = await signIn();
    const lost = await post('/auth/refresh', jar);
    expect(lost.status).toBe(200);

    const retry = await post('/auth/refresh', jar);
    expect(retry.status).toBe(200);
    expect(refreshCookieSet(retry)).toBe(refreshCookieSet(lost));
    absorb(jar, retry);

    const after = await post('/auth/refresh', jar);
    expect(after.status).toBe(200);
    absorb(jar, after);
    await post('/auth/logout', jar);
  });
});
