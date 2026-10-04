import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !password || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5498;
let adminToken: string;
let principalToken: string;

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

beforeAll(async () => {
  await server.listen(port);
  for (const actor of [
    { email: 'admin@history.example.test', password, set: (token: string) => { adminToken = token; } },
    { email: 'principal@history.example.test', password: principalPassword,
      set: (token: string) => { principalToken = token; } },
  ]) {
    const response = await request('/auth/login', undefined, 'POST', {
      email: actor.email, password: actor.password,
    }, '');
    expect(response.status).toBe(200);
    const token = response.body.data?.accessToken ?? response.body.accessToken;
    if (!token) throw new Error(`History ${actor.email} login returned no access token`);
    actor.set(token);
  }
});
afterAll(async () => { await server.stop(); });

describe('authenticated Announcements transport on the marked PostgreSQL fixture', () => {
  it('keeps exact REST lists, detail and the signed-in published view in the selected year', async () => {
    const [old, current, principalCurrent, published] = await Promise.all([
      request('/announcements', '2025-2026'),
      request('/announcements'),
      request('/announcements', '2026-2027', 'GET', undefined, principalToken),
      request('/announcements/published', undefined, 'GET', undefined, principalToken),
    ]);
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    expect(principalCurrent.status).toBe(200);
    expect(published.status).toBe(200);
    expect(old.body.data.map((row: { id: string }) => row.id)).toEqual(['history-announcement-2025-class']);
    expect(current.body.data.map((row: { id: string }) => row.id).sort()).toEqual([
      'history-announcement-2026-all', 'history-announcement-2026-class',
    ]);
    expect(principalCurrent.body.data.map((row: { id: string }) => row.id).sort())
      .toEqual(current.body.data.map((row: { id: string }) => row.id).sort());
    expect(published.body.data.map((row: { id: string }) => row.id)).toEqual(['history-announcement-2026-all']);
    // Announcements reach the people they target, so an anonymous caller reads none.
    expect((await request('/announcements/published', undefined, 'GET', undefined, '')).status).toBe(401);
    expect((await request('/announcements/published', '2025-2026', 'GET', undefined, '')).status).toBe(401);
    expect((await request('/announcements/history-announcement-2025-class', '2026-2027')).status).toBe(404);
    expect((await request('/announcements/history-announcement-unresolved', '2025-2026')).status).toBe(404);
    expect((await request('/announcements?academicYear=2026-2027', '2025-2026')).status).toBe(400);
    expect((await request('/announcements/stats', '2026-2027', 'GET', undefined, principalToken)).status).toBe(403);
  });

  it('creates and corrects a past-year class notice with scoped publish and deletion', async () => {
    const created = await request('/announcements', '2025-2026', 'POST', {
      title: 'Historical class notice', content: 'A corrected notice for the old class.',
      targetAudience: 'class', classIds: ['history-class-2025'],
    });
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;
    try {
      expect(created.body.data.academicYearId).toBe('history-year-2025');
      expect((await request(`/announcements/${id}`, '2026-2027')).status).toBe(404);
      expect((await request(`/announcements/${id}`, '2026-2027', 'PUT', { title: 'Wrong year' })).status).toBe(404);
      expect((await request(`/announcements/${id}/publish`, '2026-2027', 'POST')).status).toBe(404);
      expect((await request(`/announcements/${id}/publish`, '2025-2026', 'POST')).status).toBe(200);
      expect((await request(`/announcements/${id}/unpublish`, '2025-2026', 'POST')).status).toBe(200);
      const updated = await request(`/announcements/${id}`, '2025-2026', 'PUT', { title: 'Corrected class notice' });
      expect(updated.status).toBe(200);
      expect(updated.body.data.title).toBe('Corrected class notice');
    } finally {
      expect((await request(`/announcements/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
    }
    const mismatched = await request('/announcements', '2025-2026', 'POST', {
      title: 'Wrong class year', content: 'A notice with a mismatched class year.',
      targetAudience: 'class', classIds: ['history-class-2026'],
    });
    expect(mismatched.status).toBe(409);
  });

  it('applies selected-year input to authenticated MCP tools', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (headerYear?: string, toolYear?: string, token = adminToken) => {
      const client = new Client({ name: 'school-announcement-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === 'announcements_get_announcements')?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name: 'announcements_get_announcements',
          arguments: toolYear ? { academicYear: toolYear } : {} });
        return result as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    const [old, current, principalCurrent, conflict] = await Promise.all([
      call('2025-2026'), call(undefined, '2026-2027'),
      call('2026-2027', undefined, principalToken), call('2025-2026', '2026-2027'),
    ]);
    expect(old.isError).not.toBe(true);
    expect(current.isError).not.toBe(true);
    expect(principalCurrent.isError).not.toBe(true);
    expect(conflict.isError).toBe(true);
    expect((JSON.parse(old.content[0].text) as Array<{ id: string }>).map((row) => row.id))
      .toEqual(['history-announcement-2025-class']);
    expect((JSON.parse(current.content[0].text) as Array<{ id: string }>).map((row) => row.id).sort())
      .toEqual(['history-announcement-2026-all', 'history-announcement-2026-class']);
    expect((JSON.parse(principalCurrent.content[0].text) as Array<{ id: string }>).map((row) => row.id).sort())
      .toEqual(['history-announcement-2026-all', 'history-announcement-2026-class']);
  });

  it('writes a past-year notice through MCP and rejects a wrong-year deletion', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-announcement-write-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}` } },
    });
    await client.connect(transport);
    let id: string | undefined;
    try {
      const tools = await client.listTools();
      expect(tools.tools.find((tool) => tool.name === 'announcements_create')?.inputSchema.properties)
        .toHaveProperty('academicYear');
      const created = await client.callTool({ name: 'announcements_create', arguments: {
        academicYear: '2025-2026', title: 'MCP historical notice',
        content: 'A notice written through the authenticated MCP tool.', targetAudience: 'all',
      } }) as { content: Array<{ text: string }>; isError?: boolean };
      expect(created.isError).not.toBe(true);
      id = (JSON.parse(created.content[0].text) as { id: string }).id;
      expect((await request(`/announcements/${id}`, '2025-2026')).status).toBe(200);
      const wrongYear = await client.callTool({ name: 'announcements_delete_by_id', arguments: {
        id, academicYear: '2026-2027',
      } }) as { isError?: boolean };
      expect(wrongYear.isError).toBe(true);
    } finally {
      if (id) expect((await request(`/announcements/${id}`, '2025-2026', 'DELETE')).status).toBe(200);
      await transport.close();
    }
  });
});
