import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5497;
let adminToken: string;
let principalToken: string;

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  if (typeof token !== 'string') throw new Error(`Login response has no access token; keys: ${Object.keys(body.data ?? body)}`);
  return token;
}

beforeAll(async () => {
  await server.listen(port);
  const { db } = await import('../../src/database/db');
  const { alerts } = await import('../../src/modules/alerts/alertSchema');
  const { eq } = await import('drizzle-orm');
  await db.delete(alerts).where(eq(alerts.title, 'History health review'));
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
});
afterAll(async () => { await server.stop(); });

async function request(path: string, token: string, year?: string, method = 'GET', data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

describe('authenticated Alerts REST on the marked PostgreSQL fixture', () => {
  it('allows admin year selection and denies the principal Alerts permission', async () => {
    const [old, current, denied] = await Promise.all([
      request('/alerts', adminToken, '2025-2026'),
      request('/alerts', adminToken),
      request('/alerts', principalToken, '2025-2026'),
    ]);
    expect(old.status).toBe(200);
    expect(current.status).toBe(200);
    expect(denied.status).toBe(401);
    expect(old.body.data.map((item: { id: string }) => item.id).sort()).toEqual([
      'history-alert-2025-attendance', 'history-alert-2025-reminder',
      'history-alert-shared-emergency', 'history-alert-shared-system',
    ]);
    expect(current.body.data.map((item: { id: string }) => item.id).sort()).toEqual([
      'history-alert-2026-announcement', 'history-alert-2026-behavior',
      'history-alert-shared-emergency', 'history-alert-shared-system',
    ]);
    expect((await request('/alerts/history-alert-2024-academic', adminToken, '2025-2026')).status).toBe(404);
    expect((await request('/alerts?academicYear=2026-2027', adminToken, '2025-2026')).status).toBe(400);
    expect((await request('/alerts', adminToken, '2099-2100')).status).toBe(404);
    expect((await request('/alerts/history-alert-2025-reminder', adminToken, '2025-2026', 'PUT', {
      title: 'History history-alert-2025-reminder',
    })).status).toBe(200);
  });

  it('creates, edits and deletes in a past year while rejecting cross-year access and mismatched targets', async () => {
    const alert = { type: 'health', title: 'History health review',
      message: 'A reviewed historical health concern.', studentId: 'history-student-03' };
    const created = await request('/alerts', adminToken, '2025-2026', 'POST', alert);
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;
    try {
      expect(created.body.data.academicYearId).toBe('history-year-2025');
      expect((await request(`/alerts/${id}`, adminToken, '2025-2026', 'PUT', {
        status: 'resolved', isRead: true, priority: 'high',
      })).status).toBe(200);
      expect((await request(`/alerts/${id}`, adminToken, '2026-2027')).status).toBe(404);
      expect((await request(`/alerts/${id}`, adminToken, '2026-2027', 'PUT', { title: 'Wrong year' })).status).toBe(404);
      expect((await request(`/alerts/${id}`, adminToken, '2026-2027', 'DELETE')).status).toBe(404);
      const updated = await request(`/alerts/${id}`, adminToken, '2025-2026', 'PUT', { title: 'Corrected history concern' });
      expect(updated.status).toBe(200);
      expect(updated.body.data.title).toBe('Corrected history concern');
      expect(updated.body.data).toMatchObject({ status: 'resolved', isRead: true, priority: 'high' });
    } finally {
      expect((await request(`/alerts/${id}`, adminToken, '2025-2026', 'DELETE')).status).toBe(200);
    }
    const mismatched = await request('/alerts', adminToken, '2025-2026', 'POST', {
      ...alert, type: 'attendance', title: 'Wrong class year', classId: 'history-class-2026',
    });
    expect(mismatched.status).toBe(409);
    const unenrolled = await request('/alerts', adminToken, '2025-2026', 'POST', {
      ...alert, type: 'behavioral', title: 'Wrong student year', studentId: 'history-student-08',
    });
    expect(unenrolled.status).toBe(409);
  });

  it('keeps a resolved alert resolved after a one-field MCP edit', async () => {
    const created = await request('/alerts', adminToken, '2025-2026', 'POST', {
      type: 'health', title: `History MCP concern ${crypto.randomUUID().slice(0, 8)}`,
      message: 'A historical concern for a partial MCP edit.', studentId: 'history-student-03',
    });
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;
    try {
      expect((await request(`/alerts/${id}`, adminToken, '2025-2026', 'PUT',
        { status: 'resolved', isRead: true })).status).toBe(200);
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const client = new Client({ name: 'school-alert-partial-update-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${adminToken}` } },
      });
      await client.connect(transport);
      try {
        const result = await client.callTool({ name: 'alerts_update',
          arguments: { id, title: 'History MCP corrected concern', academicYear: '2025-2026' } });
        expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
      } finally { await transport.close(); }
      expect((await request(`/alerts/${id}`, adminToken, '2025-2026')).body.data)
        .toMatchObject({ title: 'History MCP corrected concern', status: 'resolved', isRead: true });
    } finally {
      expect((await request(`/alerts/${id}`, adminToken, '2025-2026', 'DELETE')).status).toBe(200);
    }
  });

  it('attributes a trusted financial reminder from its charged fee without an HTTP year', async () => {
    const { db } = await import('../../src/database/db');
    const { fees } = await import('../../src/modules/financial/fees/feeSchema');
    const { eq } = await import('drizzle-orm');
    const { AlertService } = await import('../../src/modules/alerts/AlertService');
    const unscoped = await server.container.resolve(AlertService);
    await expect(unscoped.getAll()).rejects.toThrow('Resolved academic year is missing');
    const feeId = 'history-fee-test-source';
    await db.insert(fees).values({ id: feeId, studentId: 'history-student-03',
      feeTypeId: 'history-fee-type', academicYear: '2025-2026',
      baseAmount: '10', grossAmount: '10', netAmount: '10' }).onConflictDoNothing();
    let alertId: string | undefined;
    try {
      const service = await server.container.resolve(AlertService);
      const created = await service.createFromFeeSource(feeId, {
        studentId: 'history-student-03', title: 'Fee year reminder',
        message: 'A historical fee remains due.', priority: 'high',
      });
      alertId = created?.id;
      expect(created?.academicYearId).toBe('history-year-2025');
      expect((await request(`/alerts/${alertId}`, adminToken, '2025-2026')).status).toBe(200);
      expect((await request(`/alerts/${alertId}`, adminToken, '2026-2027')).status).toBe(404);
    } finally {
      if (alertId) expect((await request(`/alerts/${alertId}`, adminToken, '2025-2026', 'DELETE')).status).toBe(200);
      await db.delete(fees).where(eq(fees.id, feeId));
    }
  });

  it('reads alerts in the selected year for a parent\'s children and the operations KPIs', async () => {
    const { db } = await import('../../src/database/db');
    const { parents } = await import('../../src/modules/parents/parentSchema');
    const { studentParents } = await import('../../src/modules/students/studentSchema');
    const { usersTable } = await import('../../src/auth');
    const { eq } = await import('drizzle-orm');
    const parentId = 'history-parent-test';
    const userId = `${parentId}-user`;
    await db.insert(usersTable).values({ id: userId, name: 'Samira Alaoui', status: 'active',
      email: `${parentId}@history.example.test`, password: crypto.randomUUID() }).onConflictDoNothing();
    await db.insert(parents).values({ id: parentId, userId, name: 'Samira Alaoui', relationshipType: 'mother' })
      .onConflictDoNothing();
    await db.insert(studentParents).values([
      { id: 'history-link-test-01', studentId: 'history-student-01', parentId },
      { id: 'history-link-test-05', studentId: 'history-student-05', parentId },
    ]).onConflictDoNothing();
    try {
      const unread = async (year: string) => {
        const { status, body } = await request(`/profiles/parents/${parentId}/unread-alerts`, adminToken, year);
        expect(status).toBe(200);
        const perChild = body.data.perChild as Array<{ studentId: string; alerts: Array<{ id: string }> }>;
        return Object.fromEntries(perChild.map((child) => [child.studentId, child.alerts.map((alert) => alert.id)]));
      };
      expect(await unread('2025-2026')).toEqual({
        'history-student-01': [], 'history-student-05': ['history-alert-2025-attendance'],
      });
      expect(await unread('2026-2027')).toEqual({
        'history-student-01': ['history-alert-2026-behavior'], 'history-student-05': [],
      });
    } finally {
      await db.delete(studentParents).where(eq(studentParents.parentId, parentId));
      await db.delete(parents).where(eq(parents.id, parentId));
      await db.delete(usersTable).where(eq(usersTable.id, userId));
    }
    const kpis = await request('/dashboard/operations/kpis', adminToken, '2025-2026');
    expect(kpis.status).toBe(200);
    // Two alerts of the year and the two shared ones, all active and none critical.
    expect(kpis.body.data.activeAlertsCount).toBe(4);
    expect(kpis.body.data.criticalAlertsCount).toBe(0);
    expect((await request('/dashboard/operations/kpis', adminToken, '2099-2100')).status).toBe(404);
  });

  it('uses the same year selection and permission rules over authenticated MCP', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const call = async (token: string, headerYear?: string, toolYear?: string, name = 'alerts_get_alerts') => {
      const client = new Client({ name: 'school-alert-history-test', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}`,
          ...(headerYear ? { 'X-Academic-Year': headerYear } : {}) } },
      });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.find((tool) => tool.name === name)?.inputSchema.properties)
          .toHaveProperty('academicYear');
        const result = await client.callTool({ name, arguments: toolYear ? { academicYear: toolYear } : {} });
        return result as { content: Array<{ text: string }>; isError?: boolean };
      } finally { await transport.close(); }
    };
    const [old, current, denied, conflict] = await Promise.all([
      call(adminToken, '2025-2026'), call(adminToken, undefined, '2026-2027'),
      call(principalToken, '2025-2026'), call(adminToken, '2025-2026', '2026-2027'),
    ]);
    expect(old.isError).not.toBe(true);
    expect(current.isError).not.toBe(true);
    expect((JSON.parse(old.content[0].text) as Array<{ id: string }>).map((item) => item.id).sort()).toEqual([
      'history-alert-2025-attendance', 'history-alert-2025-reminder',
      'history-alert-shared-emergency', 'history-alert-shared-system',
    ]);
    expect((JSON.parse(current.content[0].text) as Array<{ id: string }>).map((item) => item.id).sort()).toEqual([
      'history-alert-2026-announcement', 'history-alert-2026-behavior',
      'history-alert-shared-emergency', 'history-alert-shared-system',
    ]);
    expect(denied.isError).toBe(true);
    expect(conflict.isError).toBe(true);
    const kpis = await call(adminToken, '2025-2026', undefined, 'operations-dashboard_get_kpis');
    expect(kpis.isError).not.toBe(true);
    expect(JSON.parse(kpis.content[0].text).activeAlertsCount).toBe(4);
  });
});
