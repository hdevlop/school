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
const { maintenance, vehicles } = await import('../../src/database/schema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { server } = await import('../../src/index');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { scopedHistoryRepository } = await import('../academicYears/fixtures/scopedHistoryRepository');
const { MaintenanceRepository } = await import('../../src/modules/transport/maintenance/MaintenanceRepository');
const base = 'http://school.local/api';
const port = 5521;
const suffix = crypto.randomUUID().slice(0, 8);
const vehicleId = `history-maintenance-vehicle-${suffix}`;
const oldId = `history-maintenance-old-${suffix}`;
const newId = `history-maintenance-new-${suffix}`;
const completedId = `history-maintenance-completed-${suffix}`;
const mileageId = `history-maintenance-mileage-${suffix}`;
let token: string;

async function request(path: string, year?: string, method = 'GET', body?: object) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(year ? { 'X-Academic-Year': year } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await db.insert(vehicles).values({
    id: vehicleId, name: 'History maintenance vehicle', brand: 'Ford', model: 'Transit',
    year: 2024, capacity: 20, licensePlate: `H-M-${suffix}`, currentMileage: '1000',
  });
  await db.insert(maintenance).values([
    { id: oldId, vehicleId, type: 'inspection', title: 'Old planned',
      status: 'scheduled', scheduledDate: '2025-11-10', dueHours: '1100', cost: '100.00' },
    { id: newId, vehicleId, type: 'repair', title: 'New planned',
      status: 'scheduled', scheduledDate: '2026-11-10', dueHours: '1200', cost: '200.00' },
    { id: completedId, vehicleId, type: 'oilChange', title: 'Old completed',
      status: 'completed', scheduledDate: '2026-10-01', completedAt: '2025-12-15T10:00:00.000Z',
      cost: '300.00' },
    { id: mileageId, vehicleId, type: 'filterChange', title: 'Mileage only',
      status: 'scheduled', dueHours: '1000', cost: '40.00' },
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
  await db.delete(maintenance).where(eq(maintenance.vehicleId, vehicleId));
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
});

describe('maintenance history on the local fixture', () => {
  it('attributes planned and completed records by their dates and keeps mileage jobs shared', async () => {
    expect(yearScopedModules).toHaveProperty('vehicle-maintenance');
    const { repo, inYear } = await scopedHistoryRepository(MaintenanceRepository, db);
    const years = await db.select({ id: academicYears.id, label: academicYears.label }).from(academicYears);
    const yearId = (label: string) => {
      const id = years.find((row) => row.label === label)?.id;
      if (!id) throw new Error(`Missing fixture year ${label}`);
      return id;
    };
    const old = await inYear(yearId('2025-2026'), () => repo.getByVehicleId(vehicleId));
    expect(old.map((row) => row.id).sort()).toEqual([oldId, completedId, mileageId].sort());
    const newer = await inYear(yearId('2026-2027'), () => repo.getByVehicleId(vehicleId));
    expect(newer.map((row) => row.id).sort()).toEqual([newId, mileageId].sort());
    expect((await inYear(yearId('2025-2026'), () => repo.getById(newId)))).toBeUndefined();
    expect((await inYear(yearId('2025-2026'), () => repo.getCount())).count).toBeGreaterThanOrEqual(3);
    expect((await inYear(yearId('2025-2026'), () => repo.getMaintenanceCostAnalytics())).totalCost)
      .toBeGreaterThanOrEqual(440);
    expect((await repo.getByVehicleIdAcrossYears(vehicleId)).length).toBe(4);
  });

  it('scopes admin REST and MCP while keeping live mileage alerts across years', async () => {
    for (const [year, expected, hidden] of [
      ['2025-2026', [oldId, completedId, mileageId], newId],
      ['2026-2027', [newId, mileageId], oldId],
    ] as const) {
      const list = await request('/maintenance', year);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((row: { id: string }) => row.id);
      for (const id of expected) expect(ids).toContain(id);
      expect(ids).not.toContain(hidden);
      expect((await request(`/maintenance/${hidden}`, year)).status).toBe(404);
      expect((await request(`/maintenance/${hidden}`, year, 'DELETE')).status).toBe(404);
      expect((await request('/maintenance/alerts', year)).status).toBe(200);
      const overdue = await request('/maintenance/overdue', year);
      expect(overdue.body.data.map((row: { id: string }) => row.id)).toContain(mileageId);
    }
    expect((await request('/maintenance', 'invalid')).status).toBe(400);
    expect((await request('/maintenance/count', '2025-2026')).body.data.count)
      .toBeGreaterThanOrEqual(3);
    const invalidCreate = await request('/maintenance', '2025-2026', 'POST', {
      vehicleId, type: 'repair', title: 'Wrong year', scheduledDate: '2026-11-01',
    });
    expect(invalidCreate.status).toBe(409);
    const newRow = await request('/maintenance', '2025-2026', 'POST', {
      vehicleId, type: 'other', title: 'Historical correction', scheduledDate: '2025-10-10',
    });
    expect(newRow.status).toBe(200);
    const createdId = newRow.body.data.id as string;
    expect((await request(`/maintenance/${createdId}`, '2025-2026')).status).toBe(200);
    expect((await request(`/maintenance/${createdId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/maintenance/${createdId}`, '2025-2026', 'PUT', {
      scheduledDate: '2026-11-01',
    })).status).toBe(409);
    expect((await request(`/maintenance/${createdId}`, '2026-2027', 'PUT', {
      title: 'Wrong year edit',
    })).status).toBe(404);
    expect((await request(`/maintenance/${createdId}`, '2025-2026', 'PUT', {
      scheduledDate: '2025-10-11',
    })).status).toBe(200);
    expect((await request(`/maintenance/${createdId}`, '2025-2026', 'DELETE')).status).toBe(200);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-maintenance-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'vehicle-maintenance_get_maintenances', arguments: {} }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      if (result.isError) throw new Error(JSON.stringify(result.content));
      const ids = (JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id);
      expect(ids).toContain(oldId);
      expect(ids).not.toContain(newId);
    } finally { await transport.close(); }
    expect((await db.select().from(maintenance).where(inArray(maintenance.id,
      [oldId, newId, completedId, mileageId]))).length).toBe(4);
  });
});
