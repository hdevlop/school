import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { vehicles } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const { VehicleRepository } = await import('../../src/modules/transport/vehicles/VehicleRepository');
const { yearScopedModules } = await import('../../src/config/yearScope');
const base = 'http://school.local/api';
const port = 5523;
const suffix = crypto.randomUUID().slice(0, 8);
const oldId = `history-vehicle-old-${suffix}`;
const newId = `history-vehicle-new-${suffix}`;
let token: string;

async function request(path: string, year?: string, method = 'GET', data?: unknown) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(vehicles).values([
    { id: oldId, name: 'History old vehicle', brand: 'Ford', model: 'Transit',
      year: 2022, capacity: 20, type: 'minibus',
      status: 'inactive', licensePlate: `H-OLD-${suffix}`,
      purchaseDate: '2025-10-01', currentMileage: '1500' },
    { id: newId, name: 'History new vehicle', brand: 'Ford', model: 'Transit',
      year: 2026, capacity: 20, status: 'active', licensePlate: `H-NEW-${suffix}`,
      purchaseDate: '2026-10-01', currentMileage: '500' },
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
  await db.delete(vehicles).where(inArray(vehicles.id, [oldId, newId]));
});

describe('vehicle identity remains shared across school years', () => {
  it('preserves nondefault type and status on a one-field REST edit', async () => {
    const updated = await request(`/vehicles/${oldId}`, undefined, 'PUT', { notes: 'Checked in history' });
    expect(updated.status).toBe(200);
    expect((await request(`/vehicles/${oldId}`)).body.data).toMatchObject({
      notes: 'Checked in history', type: 'minibus', status: 'inactive',
    });
  });

  it('keeps both identities and present status in repository reads', async () => {
    expect(yearScopedModules).not.toHaveProperty('vehicles');
    const repository = new VehicleRepository();
    repository.db = db;
    const ids = (await repository.getAll()).map((row) => row.id);
    expect(ids).toContain(oldId);
    expect(ids).toContain(newId);
    expect((await repository.getByStatus('inactive')).map((row) => row.id)).toContain(oldId);
    expect((await repository.getByStatus('active')).map((row) => row.id)).toContain(newId);
    expect((await repository.getByLicensePlate(`H-OLD-${suffix}`))?.id).toBe(oldId);
    expect((await repository.getById(oldId))?.currentMileage).toBe('1500.00');
  });

  it('keeps authenticated REST and MCP identity reads shared', async () => {
    for (const year of [undefined, '2025-2026', '2026-2027', 'invalid']) {
      const listing = await request('/vehicles', year);
      expect(listing.status).toBe(200);
      const ids = listing.body.data.map((row: { id: string }) => row.id);
      expect(ids).toContain(oldId);
      expect(ids).toContain(newId);
      expect((await request(`/vehicles/${oldId}`, year)).body.data.id).toBe(oldId);
      expect((await request('/vehicles/count', year)).body.data.count).toBeGreaterThanOrEqual(2);
    }
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-vehicle-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'vehicles_list_vehicles', arguments: {} }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      if (result.isError) throw new Error(JSON.stringify(result.content));
      const ids = (JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id);
      expect(ids).toContain(oldId);
      expect(ids).toContain(newId);
    } finally { await transport.close(); }
  });
});
