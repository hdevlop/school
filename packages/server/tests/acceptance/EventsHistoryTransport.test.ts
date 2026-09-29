import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
// 5496 to 5509 are taken by the other history transport suites.
const port = 5510;
let adminToken: string;
const created: string[] = [];

async function request(path: string, year?: string, method = 'GET', data?: unknown, token = adminToken) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

const pastEvent = {
  title: 'History science fair', type: 'academic', startDate: '2025-12-05', endDate: '2025-12-05',
  startTime: '09:00', endTime: '12:00', visibility: 'public',
};

async function create(year: string, body: Record<string, unknown> = pastEvent) {
  const result = await request('/events', year, 'POST', body);
  if (result.body.data?.id) created.push(result.body.data.id);
  return result;
}

const ids = (body: Record<string, any>) => (body.data as Array<{ id: string }>).map((row) => row.id);

beforeAll(async () => {
  await server.listen(port);
  const login = await request('/auth/login', undefined, 'POST',
    { email: 'admin@history.example.test', password: adminPassword }, '');
  expect(login.status).toBe(200);
  adminToken = login.body.data?.accessToken ?? login.body.accessToken;
  if (!adminToken) throw new Error('History admin login returned no access token');
});

afterAll(async () => {
  const { db } = await import('../../src/database/db');
  const { events } = await import('../../src/modules/events/eventSchema');
  const { inArray } = await import('drizzle-orm');
  if (created.length) await db.delete(events).where(inArray(events.id, created));
  await server.stop();
});

describe('authenticated Events REST and MCP on the marked PostgreSQL fixture', () => {
  it('refuses every read without a signed-in user', async () => {
    // These answered anyone before 2026-09-28.
    for (const path of ['/events', '/events/today', '/events/upcoming', '/events/past', '/events/active',
      '/events/type/academic', '/events/class/history-class-2025', '/events/section/history-section-2025-a',
      '/events/date-range?startDate=2025-09-01&endDate=2026-08-31', '/events/participant/history-student-01']) {
      expect((await request(path, undefined, 'GET', undefined, '')).status).toBe(401);
    }
  });

  it('creates a past-year event in that year only, and keeps reads and changes there', async () => {
    const past = await create('2025-2026', { ...pastEvent, visibility: 'private',
      status: 'completed', registrationRequired: true });
    expect(past.status).toBe(200);
    const id = past.body.data.id as string;

    expect(ids((await request('/events', '2025-2026')).body)).toContain(id);
    expect(ids((await request('/events/type/academic', '2025-2026')).body)).toContain(id);
    expect(ids((await request('/events')).body)).not.toContain(id);
    expect((await request(`/events/${id}`, '2026-2027')).status).toBe(404);
    expect((await request(`/events/${id}`, '2026-2027', 'PUT', { title: 'Wrong year' })).status).toBe(404);
    expect((await request(`/events/${id}/cancel`, '2026-2027', 'POST')).status).toBe(404);
    expect((await request(`/events/${id}`, '2026-2027', 'DELETE')).status).toBe(404);

    const moved = await request(`/events/${id}`, '2025-2026', 'PUT', { startDate: '2026-10-01', endDate: '2026-10-01' });
    expect(moved.status).toBe(409);
    expect(moved.body.message).toBe("The event's dates must fall in the selected school year");
    const corrected = await request(`/events/${id}`, '2025-2026', 'PUT', { title: 'History science fair (corrected)' });
    expect(corrected.status).toBe(200);
    expect((await request(`/events/${id}`, '2025-2026')).body.data)
      .toMatchObject({ visibility: 'private', status: 'completed', registrationRequired: true });
    expect((await request(`/events/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
  });

  it('refuses dates outside the selected year and a bad year selection', async () => {
    expect((await create('2026-2027')).status).toBe(409);
    expect((await request('/events?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/events', '2099-2100')).status).toBe(404);
    expect((await request('/events/missing-event', '2025-2026')).body.message).toBe('Event not found');
  });

  it('uses the same year selection over authenticated MCP', async () => {
    const past = await create('2025-2026');
    expect(past.status).toBe(200);
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const list = async (headerYear?: string, toolYear?: string) => {
      const client = new Client({ name: 'school-event-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'events_get_events')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'events_get_events', arguments: toolYear ? { academicYear: toolYear } : {} });
        const { content, isError } = result as { content: Array<{ text: string }>; isError?: boolean };
        expect(isError).not.toBe(true);
        return (JSON.parse(content[0].text) as Array<{ id: string }>).map((row) => row.id);
      } finally { await transport.close(); }
    };
    expect(await list('2025-2026')).toContain(past.body.data.id);
    expect(await list(undefined, '2026-2027')).not.toContain(past.body.data.id);
  });
});
