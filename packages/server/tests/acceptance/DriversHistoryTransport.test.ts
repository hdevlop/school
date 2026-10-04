import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { drivers, staff } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const { DriverRepository } = await import('../../src/modules/transport/drivers/DriverRepository');
const { yearScopedModules } = await import('../../src/config/yearScope');
const base = 'http://school.local/api';
const port = 5520;
const suffix = crypto.randomUUID().slice(0, 8);
const oldStaffId = `history-driver-staff-old-${suffix}`;
const newStaffId = `history-driver-staff-new-${suffix}`;
const oldDriverId = `history-driver-old-${suffix}`;
const newDriverId = `history-driver-new-${suffix}`;
const oldLicense = `HISTORY-OLD-${suffix}`;
const newLicense = `HISTORY-NEW-${suffix}`;
let token: string;

async function request(path: string, year?: string, method = 'GET') {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}) },
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(staff).values([
    { id: oldStaffId, employeeCode: `HISTORY-OLD-${suffix}`, name: 'History driver old',
      role: 'driver', hireDate: '2025-10-01', status: 'inactive', cin: `HIST-OLD-${suffix}` },
    { id: newStaffId, employeeCode: `HISTORY-NEW-${suffix}`, name: 'History driver new',
      role: 'driver', hireDate: '2026-10-01', status: 'active', cin: `HIST-NEW-${suffix}` },
  ]);
  await db.insert(drivers).values([
    { id: oldDriverId, staffId: oldStaffId, licenseNumber: oldLicense,
      licenseType: 'B', licenseExpiry: '2030-01-01' },
    { id: newDriverId, staffId: newStaffId, licenseNumber: newLicense,
      licenseType: 'B', licenseExpiry: '2030-01-01' },
  ]);
  await server.listen(port);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
});
afterAll(async () => {
  await server.stop();
  await db.delete(drivers).where(inArray(drivers.id, [oldDriverId, newDriverId]));
  await db.delete(staff).where(inArray(staff.id, [oldStaffId, newStaffId]));
});

describe('driver identity remains shared across school years', () => {
  it('keeps both driver identities and present status in repository reads', async () => {
    expect(yearScopedModules).not.toHaveProperty('drivers');
    const repository = new DriverRepository();
    repository.db = db;
    const ids = (await repository.getAll()).map((row) => row.id);
    expect(ids).toContain(oldDriverId);
    expect(ids).toContain(newDriverId);
    expect((await repository.getByStatus('inactive')).map((row) => row.id)).toContain(oldDriverId);
    expect((await repository.getByStatus('active')).map((row) => row.id)).toContain(newDriverId);
    expect((await repository.getByLicenseNumber(oldLicense))?.id).toBe(oldDriverId);
    expect((await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, oldDriverId)))[0]?.id)
      .toBe(oldDriverId);
  });

  it('keeps admin REST and MCP identity reads shared and legacy writes retired', async () => {
    for (const year of [undefined, '2025-2026', '2026-2027', 'invalid']) {
      const listing = await request('/drivers', year);
      expect(listing.status).toBe(200);
      const ids = listing.body.data.map((row: { id: string }) => row.id);
      expect(ids).toContain(oldDriverId);
      expect(ids).toContain(newDriverId);
      expect((await request(`/drivers/${oldDriverId}`, year)).body.data.id).toBe(oldDriverId);
      expect((await request(`/drivers/license/${encodeURIComponent(oldLicense)}`, year)).body.data.id)
        .toBe(oldDriverId);
    }
    expect((await request(`/drivers/${oldDriverId}`, '2026-2027', 'DELETE')).status).toBe(410);
    expect((await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.id, oldDriverId)))[0]?.id)
      .toBe(oldDriverId);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-driver-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const tools = await client.listTools();
      expect(tools.tools.some((tool) => tool.name === 'drivers_list_drivers')).toBe(true);
      const result = await client.callTool({ name: 'drivers_list_drivers' }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      expect(result.isError).not.toBe(true);
      expect((JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id))
        .toContain(oldDriverId);
    } finally { await transport.close(); }
  });
});
