import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!rawUrl || !adminPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { refuels, vehicles, drivers, staff } = await import('../../src/database/schema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { server } = await import('../../src/index');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { scopedHistoryRepository } = await import('../academicYears/fixtures/scopedHistoryRepository');
const { RefuelRepository } = await import('../../src/modules/transport/refuels/RefuelRepository');
const base = 'http://school.local/api';
const port = 5522;
const suffix = crypto.randomUUID().slice(0, 8);
const vehicleId = `history-refuel-vehicle-${suffix}`;
const staffId = `history-refuel-staff-${suffix}`;
const driverId = `history-refuel-driver-${suffix}`;
const oldId = `history-refuel-old-${suffix}`;
const newId = `history-refuel-new-${suffix}`;
const voucher = `HISTORY-REFUEL-${suffix}`;
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
  await db.insert(vehicles).values({ id: vehicleId, name: 'History fuel bus', brand: 'Ford',
    model: 'Transit', year: 2024, capacity: 20, licensePlate: `H-R-${suffix}` });
  await db.insert(staff).values({ id: staffId, employeeCode: `H-REFUEL-${suffix}`,
    name: 'History fuel driver', role: 'driver', hireDate: '2025-10-01',
    status: 'active', cin: `H-REFUEL-${suffix}` });
  await db.insert(drivers).values({ id: driverId, staffId, licenseNumber: `H-REFUEL-${suffix}`,
    licenseType: 'B', licenseExpiry: '2030-01-01' });
  await db.insert(refuels).values([
    { id: oldId, vehicleId, drivers: driverId, datetime: '2025-11-10T10:00:00.000Z',
      liters: '10.00', costPerLiter: '10.00', totalCost: '100.00', voucherNumber: voucher,
      mileageAtRefuel: '1000' },
    { id: newId, vehicleId, drivers: driverId, datetime: '2026-11-10T10:00:00.000Z',
      liters: '20.00', costPerLiter: '10.00', totalCost: '200.00', mileageAtRefuel: '2000' },
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
  await db.delete(refuels).where(eq(refuels.vehicleId, vehicleId));
  await db.delete(drivers).where(eq(drivers.id, driverId));
  await db.delete(staff).where(eq(staff.id, staffId));
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
});

describe('refuel history on the local fixture', () => {
  it('attributes records, costs and vehicle reports to the selected year', async () => {
    expect(yearScopedModules).toHaveProperty('vehicle-refuels');
    const { repo, inYear } = await scopedHistoryRepository(RefuelRepository, db);
    const years = await db.select({ id: academicYears.id, label: academicYears.label }).from(academicYears);
    const yearId = (label: string) => {
      const id = years.find((row) => row.label === label)?.id;
      if (!id) throw new Error(`Missing fixture year ${label}`);
      return id;
    };
    expect((await inYear(yearId('2025-2026'), () => repo.getByVehicleId(vehicleId)))
      .map((row) => row.id)).toEqual([oldId]);
    expect((await inYear(yearId('2026-2027'), () => repo.getByVehicleId(vehicleId)))
      .map((row) => row.id)).toEqual([newId]);
    expect(await inYear(yearId('2025-2026'), () => repo.getById(newId))).toBeNull();
    expect((await inYear(yearId('2025-2026'), () => repo.getVehicleFuelCosts(vehicleId)))
      .map((row) => row.totalCost)).toEqual(['100.00']);
    expect((await inYear(yearId('2026-2027'), () => repo.getVehicleFuelCosts(vehicleId)))
      .map((row) => row.totalCost)).toEqual(['200.00']);
    expect((await inYear(yearId('2025-2026'), () => repo.getFuelConsumptionAnalytics()))
      .consumptionByVehicle.find((row) => row.vehicleId === vehicleId)?.totalLiters).toBe('10.00');
    expect((await inYear(yearId('2026-2027'), () => repo.getDriverRefuelStats(driverId)))
      .totalCost).toBe('200.00');
    expect((await repo.getByVoucherNumberAcrossYears(voucher))?.id).toBe(oldId);
  });

  it('scopes authenticated REST and MCP, including historical edits and voucher uniqueness', async () => {
    for (const [year, shown, hidden] of [
      ['2025-2026', oldId, newId], ['2026-2027', newId, oldId],
    ] as const) {
      const list = await request('/refuels', year);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((row: { id: string }) => row.id);
      expect(ids).toContain(shown);
      expect(ids).not.toContain(hidden);
      expect((await request(`/refuels/${hidden}`, year)).status).toBe(404);
      expect((await request(`/refuels/${hidden}`, year, 'DELETE')).status).toBe(404);
    }
    expect((await request('/refuels', 'invalid')).status).toBe(400);
    const baseRow = { vehicleId, drivers: driverId, liters: '5.00', costPerLiter: '10.00' };
    expect((await request('/refuels', '2025-2026', 'POST', {
      ...baseRow, datetime: '2026-11-11T10:00:00.000Z',
    })).status).toBe(409);
    expect((await request('/refuels', '2026-2027', 'POST', {
      ...baseRow, datetime: '2026-11-11T10:00:00.000Z', voucherNumber: voucher,
    })).status).toBe(409);
    const created = await request('/refuels', '2025-2026', 'POST', {
      ...baseRow, datetime: '2025-11-11T10:00:00.000Z',
    });
    expect(created.status).toBe(200);
    const createdId = created.body.data.id as string;
    expect(created.body.data.totalCost).toBe('50.00');
    expect((await request(`/refuels/${createdId}`, '2026-2027')).status).toBe(404);
    expect((await request(`/refuels/${createdId}`, '2025-2026', 'PUT', {
      datetime: '2026-11-11T10:00:00.000Z',
    })).status).toBe(409);
    expect((await request(`/refuels/${createdId}`, '2025-2026', 'DELETE')).status).toBe(200);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-refuel-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'vehicle-refuels_get_refuels', arguments: {} }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      if (result.isError) throw new Error(JSON.stringify(result.content));
      const ids = (JSON.parse(result.content[0].text) as Array<{ id: string }>).map((row) => row.id);
      expect(ids).toContain(oldId);
      expect(ids).not.toContain(newId);
    } finally { await transport.close(); }
    expect((await db.select().from(refuels).where(eq(refuels.vehicleId, vehicleId))).length).toBe(2);
  });
});
