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
const { vehicles, vehicleAssignments, drivers, staff } = await import('../../src/database/schema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { server } = await import('../../src/index');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { scopedHistoryRepository } = await import('../academicYears/fixtures/scopedHistoryRepository');
const { VehicleAssignmentRepository } =
  await import('../../src/modules/transport/vehicleAssignments/VehicleAssignmentRepository');
const base = 'http://school.local/api';
const port = 5524;
const suffix = crypto.randomUUID().slice(0, 8);
const vehicleA = `history-driver-bus-a-${suffix}`;
const vehicleB = `history-driver-bus-b-${suffix}`;
const driverA = `history-driver-a-${suffix}`;
const driverB = `history-driver-b-${suffix}`;
const staffA = `history-driver-staff-a-${suffix}`;
const staffB = `history-driver-staff-b-${suffix}`;
const oldId = `history-driver-old-${suffix}`;
const historicId = `history-driver-historic-${suffix}`;
let token: string;
let createdVehicleId: string | undefined;

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
  await db.insert(vehicles).values([
    { id: vehicleA, name: 'History driver bus A', brand: 'Ford', model: 'Transit',
      year: 2024, capacity: 20, licensePlate: `H-DA-${suffix}` },
    { id: vehicleB, name: 'History driver bus B', brand: 'Ford', model: 'Transit',
      year: 2024, capacity: 20, licensePlate: `H-DB-${suffix}` },
  ]);
  await db.insert(staff).values([
    { id: staffA, employeeCode: `H-DA-${suffix}`, name: 'History driver A',
      role: 'driver', hireDate: '2025-09-01', cin: `H-DA-${suffix}` },
    { id: staffB, employeeCode: `H-DB-${suffix}`, name: 'History driver B',
      role: 'driver', hireDate: '2025-09-01', cin: `H-DB-${suffix}` },
  ]);
  await db.insert(drivers).values([
    { id: driverA, staffId: staffA, licenseNumber: `H-DA-${suffix}`,
      licenseType: 'B', licenseExpiry: '2030-01-01' },
    { id: driverB, staffId: staffB, licenseNumber: `H-DB-${suffix}`,
      licenseType: 'B', licenseExpiry: '2030-01-01' },
  ]);
  await db.insert(vehicleAssignments).values([
    { id: oldId, vehicleId: vehicleA, driverId: driverA,
      assignmentDate: '2025-10-01', status: 'active' },
    { id: historicId, vehicleId: vehicleB, driverId: driverB,
      assignmentDate: '2025-11-01', unassignmentDate: '2026-03-01', status: 'completed' },
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
}, 30_000);

afterAll(async () => {
  await server.stop();
  const ids = [vehicleA, vehicleB, createdVehicleId].filter((id): id is string => !!id);
  await db.delete(vehicleAssignments).where(inArray(vehicleAssignments.vehicleId, ids));
  await db.delete(drivers).where(inArray(drivers.id, [driverA, driverB]));
  await db.delete(staff).where(inArray(staff.id, [staffA, staffB]));
  await db.delete(vehicles).where(inArray(vehicles.id, ids));
}, 30_000);

describe('vehicle assignment history on the local fixture', () => {
  it('scopes overlapping intervals and preserves shared current driver identity', async () => {
    expect(yearScopedModules).toHaveProperty('vehicle-assignments');
    const { repo, inYear } = await scopedHistoryRepository(VehicleAssignmentRepository, db);
    const years = await db.select({ id: academicYears.id, label: academicYears.label }).from(academicYears);
    const yearId = (label: string) => years.find(row => row.label === label)?.id ?? '';
    expect((await inYear(yearId('2025-2026'), () => repo.getByVehicleId(vehicleA)))
      .map(row => row.id)).toEqual([oldId]);
    expect((await inYear(yearId('2026-2027'), () => repo.getByVehicleId(vehicleA)))
      .map(row => row.id)).toEqual([oldId]);
    expect(await inYear(yearId('2026-2027'), () => repo.getById(historicId))).toBeNull();
    expect((await repo.getActiveAssignmentByVehicleAcrossYears(vehicleA))?.driverId).toBe(driverA);
    const shared = await request(`/vehicles/${vehicleA}`, 'invalid');
    expect(shared.status).toBe(200);
    expect(shared.body.data.activeAssignment.id).toBe(oldId);
  });

  it('keeps the prior driver row when reassigning through REST and reads it through MCP', async () => {
    expect((await request('/vehicle-assignments', 'invalid')).status).toBe(400);
    for (const [year, shown, hidden] of [
      ['2025-2026', [oldId, historicId], undefined],
      ['2026-2027', [oldId], historicId],
    ] as const) {
      const list = await request('/vehicle-assignments', year);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((row: { id: string }) => row.id);
      for (const id of shown) expect(ids).toContain(id);
      if (hidden) expect(ids).not.toContain(hidden);
    }
    expect((await request('/vehicle-assignments', '2025-2026', 'POST', {
      vehicleId: vehicleB, driverId: driverA, assignmentDate: '2026-09-10',
    })).status).toBe(409);
    expect((await request('/vehicle-assignments', '2025-2026', 'POST', {
      vehicleId: vehicleB, driverId: driverA,
      assignmentDate: '2025-12-01', unassignmentDate: '2026-02-01', status: 'completed',
    })).status).toBe(409);
    const moved = await request('/vehicle-assignments/assign', '2026-2027', 'POST', {
      vehicleId: vehicleA, driverId: driverB, assignmentDate: '2026-09-20',
    });
    expect(moved.status).toBe(200);
    const newId = moved.body.data.id as string;
    expect(newId).not.toBe(oldId);
    const original = (await db.select().from(vehicleAssignments)
      .where(eq(vehicleAssignments.id, oldId)))[0];
    expect(original.driverId).toBe(driverA);
    expect(original.assignmentDate).toBe('2025-10-01');
    expect(original.unassignmentDate).toBe('2026-09-20');
    expect(original.status).toBe('completed');
    expect((await request(`/vehicle-assignments/${newId}`, '2025-2026')).status).toBe(404);
    expect((await request(`/vehicle-assignments/${newId}`, '2026-2027')).status).toBe(200);
    expect((await request(`/vehicles/${vehicleA}`, '2025-2026')).body.data.driver.id).toBe(driverB);

    const created = await request('/vehicles', 'invalid', 'POST', {
      name: 'History vehicle with driver', brand: 'Ford', model: 'Transit',
      year: 2024, type: 'fullbus', capacity: 20, licensePlate: `H-DC-${suffix}`,
      driverId: driverA, assignmentDate: '2025-12-01',
    });
    expect(created.status).toBe(200);
    createdVehicleId = created.body.data.id as string;
    expect((await request(`/vehicle-assignments/vehicle/${createdVehicleId}`, '2025-2026'))
      .body.data).toHaveLength(1);
    expect((await request(`/vehicle-assignments/vehicle/${createdVehicleId}`, '2026-2027'))
      .body.data).toHaveLength(1);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-driver-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'vehicle-assignments_get_all', arguments: {} }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      if (result.isError) throw new Error(JSON.stringify(result.content));
      const ids = (JSON.parse(result.content[0].text) as Array<{ id: string }>).map(row => row.id);
      expect(ids).toContain(oldId);
      expect(ids).not.toContain(newId);
    } finally { await transport.close(); }
  });
});
