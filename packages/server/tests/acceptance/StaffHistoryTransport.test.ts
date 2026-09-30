import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { asc, eq, inArray } from 'drizzle-orm';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!rawUrl || !adminPassword || !principalPassword) throw new Error('History fixture env is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// The server clock says 2026-09-28; the school's day is the day before.
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { db } = await import('../../src/database/db');
const { attendance, cleanerAssignments, drivers, staff, staffRoles, vehicleAssignments, vehicles, zones } =
  await import('../../src/database/schema');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { server } = await import('../../src/index');

const base = 'http://school.local/api';
const port = 5529;
const TODAY = '2026-09-27';
const suffix = crypto.randomUUID().slice(0, 8);
const id = (name: string) => `history-staff-${name}-${suffix}`;
const ZONE_HALL = id('hall');
const ZONE_YARD = id('yard');
const ZONE_FREE = id('free');
const CLEANER = id('cleaner');
const HOURLY = id('hourly');
const NEWCOMER = id('newcomer');
const DRIVER_STAFF = id('driver');
const DRIVER = id('driver-profile');
const BUS_A = id('bus-a');
const BUS_B = id('bus-b');
const STAFF_IDS = [CLEANER, HOURLY, NEWCOMER, DRIVER_STAFF];
let adminToken: string;
let principalToken: string;
const addedRoles: string[] = [];

async function login(email: string, password: string) {
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  const token = body.data?.accessToken ?? body.accessToken ?? body.data?.tokens?.accessToken;
  expect(typeof token).toBe('string');
  return token as string;
}

async function request(path: string, year?: string, method = 'GET', data?: unknown, token = adminToken) {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`,
      ...(year ? { 'X-Academic-Year': year } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function cleanerRows() {
  return (await db.select().from(cleanerAssignments).where(eq(cleanerAssignments.staffId, CLEANER))
    .orderBy(asc(cleanerAssignments.startDate), asc(cleanerAssignments.createdAt)))
    .map((row) => [row.id.startsWith('history-') ? row.id : 'new', row.zoneId, row.status, row.startDate, row.endDate]);
}

async function busRows() {
  return (await db.select().from(vehicleAssignments).where(eq(vehicleAssignments.driverId, DRIVER))
    .orderBy(asc(vehicleAssignments.assignmentDate)))
    .map((row) => [row.id.startsWith('history-') ? row.id : 'new', row.vehicleId, row.status, row.assignmentDate, row.unassignmentDate]);
}

beforeAll(async () => {
  // The fixture may lack these catalog roles; remove only the ones added here.
  for (const [code, label] of [['cleaner', 'Cleaner'], ['driver', 'Driver'], ['security', 'Security']]) {
    const [added] = await db.insert(staffRoles).values({ code, label }).onConflictDoNothing()
      .returning({ code: staffRoles.code });
    if (added) addedRoles.push(added.code);
  }
  await db.insert(zones).values([
    { id: ZONE_HALL, name: `History hall ${suffix}` },
    { id: ZONE_YARD, name: `History yard ${suffix}` },
    { id: ZONE_FREE, name: `History free ${suffix}` },
  ]);
  await db.insert(vehicles).values([
    { id: BUS_A, name: 'History staff bus A', brand: 'Ford', model: 'Transit', year: 2024, capacity: 20,
      licensePlate: `H-SA-${suffix}` },
    { id: BUS_B, name: 'History staff bus B', brand: 'Ford', model: 'Transit', year: 2024, capacity: 20,
      licensePlate: `H-SB-${suffix}` },
  ]);
  await db.insert(staff).values([
    { id: CLEANER, employeeCode: `H-CL-${suffix}`, name: 'History cleaner', role: 'cleaner', hireDate: '2024-09-01' },
    { id: HOURLY, employeeCode: `H-HR-${suffix}`, name: 'History hourly', role: 'cleaner', hireDate: '2024-09-01',
      compensationMode: 'hourly', hourlyRate: '50', workloadHours: 20, status: 'inactive', endDate: '2026-06-30' },
    { id: NEWCOMER, employeeCode: `H-NW-${suffix}`, name: 'History newcomer', role: 'cleaner', hireDate: '2026-09-28' },
    { id: DRIVER_STAFF, employeeCode: `H-DR-${suffix}`, name: 'History staff driver', role: 'driver', hireDate: '2024-09-01' },
  ]);
  await db.insert(drivers).values({ id: DRIVER, staffId: DRIVER_STAFF, licenseNumber: `H-SD-${suffix}`,
    licenseType: 'B', licenseExpiry: '2030-01-01' });
  await db.insert(cleanerAssignments).values([
    { id: id('clean-2024'), staffId: CLEANER, zoneId: ZONE_HALL, status: 'completed', startDate: '2024-09-01', endDate: '2025-06-30' },
    { id: id('clean-now'), staffId: CLEANER, zoneId: ZONE_HALL, status: 'active', startDate: '2025-09-01' },
  ]);
  await db.insert(vehicleAssignments).values([
    { id: id('bus-2024'), vehicleId: BUS_A, driverId: DRIVER, assignmentDate: '2024-09-01',
      unassignmentDate: '2025-07-01', status: 'completed' },
    { id: id('bus-now'), vehicleId: BUS_A, driverId: DRIVER, assignmentDate: '2025-09-01', status: 'active' },
  ]);
  await server.listen(port);
  adminToken = await login('admin@history.example.test', adminPassword);
  principalToken = await login('principal@history.example.test', principalPassword);
}, 30_000);

afterAll(async () => {
  await server.stop();
  await db.delete(vehicleAssignments).where(inArray(vehicleAssignments.vehicleId, [BUS_A, BUS_B]));
  await db.delete(drivers).where(eq(drivers.id, DRIVER));
  await db.delete(attendance).where(inArray(attendance.staffId, STAFF_IDS));
  await db.delete(cleanerAssignments).where(inArray(cleanerAssignments.staffId, STAFF_IDS));
  await db.delete(staff).where(inArray(staff.id, STAFF_IDS));
  await db.delete(vehicles).where(inArray(vehicles.id, [BUS_A, BUS_B]));
  await db.delete(zones).where(inArray(zones.id, [ZONE_HALL, ZONE_YARD, ZONE_FREE]));
  if (addedRoles.length) await db.delete(staffRoles).where(inArray(staffRoles.code, addedRoles));
  expect(await db.select().from(staff).where(inArray(staff.id, STAFF_IDS))).toEqual([]);
}, 30_000);

describe('staff over the history fixture', () => {
  it('is one shared identity in every selected year, with its dated assignments marked', async () => {
    expect(yearScopedModules).not.toHaveProperty('staff');
    const reads = await Promise.all([undefined, '2024-2025', '2025-2026', '2026-2027']
      .map((year) => request(`/staff/${CLEANER}`, year)));
    for (const read of reads) {
      expect(read.status, JSON.stringify(read.body)).toBe(200);
      expect(read.body.data).toEqual(reads[0].body.data);
    }
    expect(reads[0].body.data.assignments.map((row: { id: string; current: boolean }) => [row.id, row.current]).sort())
      .toEqual([[id('clean-2024'), false], [id('clean-now'), true]]);
    const driver = await request(`/staff/${DRIVER_STAFF}`);
    expect(driver.body.data.assignments.map((row: Record<string, unknown>) => [row.id, row.startDate, row.endDate, row.current]).sort())
      .toEqual([[id('bus-2024'), '2024-09-01', '2025-07-01', false], [id('bus-now'), '2025-09-01', null, true]]);
    expect((await request(`/staff/${CLEANER}`, undefined, 'GET', undefined, principalToken)).status).toBe(403);
  });

  // Every save deleted the assignments of every year and inserted the request again.
  it("moves a cleaner from today and keeps the zone's history", async () => {
    const moved = await request(`/staff/${CLEANER}`, '2024-2025', 'PUT', { assignments: [{ zoneId: ZONE_YARD }] });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(await cleanerRows()).toEqual([
      [id('clean-2024'), ZONE_HALL, 'completed', '2024-09-01', '2025-06-30'],
      [id('clean-now'), ZONE_HALL, 'completed', '2025-09-01', TODAY],
      ['new', ZONE_YARD, 'active', TODAY, null],
    ]);
    expect((await request(`/staff/${CLEANER}`)).body.data.assignments
      .filter((row: { current: boolean }) => row.current).map((row: { zoneId: string }) => row.zoneId)).toEqual([ZONE_YARD]);
  });

  // Every save deleted the driver's vehicle rows in every year and inserted
  // them again as active from today, so the ended one came back as current.
  it("keeps a driver's vehicle history through saves and reassigns from today", async () => {
    const before = await busRows();
    const unchanged = await request(`/staff/${DRIVER_STAFF}`, undefined, 'PUT', { phone: '212600000001',
      assignments: [{ vehicleId: BUS_A, status: 'completed' }, { vehicleId: BUS_A, status: 'active' }] });
    expect(unchanged.status, JSON.stringify(unchanged.body)).toBe(200);
    expect(await busRows()).toEqual(before);

    const moved = await request(`/staff/${DRIVER_STAFF}`, undefined, 'PUT', { assignments: [{ vehicleId: BUS_B }] });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(await busRows()).toEqual([
      [id('bus-2024'), BUS_A, 'completed', '2024-09-01', '2025-07-01'],
      [id('bus-now'), BUS_A, 'completed', '2025-09-01', TODAY],
      ['new', BUS_B, 'active', TODAY, null],
    ]);

    const two = await request(`/staff/${DRIVER_STAFF}`, undefined, 'PUT', { assignments: [{ vehicleId: BUS_A }, { vehicleId: BUS_B }] });
    expect(two.status).toBe(400);
    const leave = await request(`/staff/${DRIVER_STAFF}`, undefined, 'PUT', { role: 'security' });
    expect(leave.status).toBe(409);
    expect((await db.select().from(drivers).where(eq(drivers.id, DRIVER))).length).toBe(1);
  });

  it('changes only the fields an update names', async () => {
    const response = await request(`/staff/${HOURLY}`, undefined, 'PUT', { phone: '212600000002' });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const [row] = await db.select().from(staff).where(eq(staff.id, HOURLY));
    expect([row.phone, row.status, row.compensationMode, row.hourlyRate, row.endDate])
      .toEqual(['212600000002', 'inactive', 'hourly', '50.00', '2026-06-30']);
  });

  it("lists the attendance roster for the school's day", async () => {
    const today = await request('/staff/attendance-roster', '2025-2026');
    expect(today.status).toBe(200);
    const ids = today.body.data.map((row: { id: string }) => row.id);
    expect(ids).toContain(CLEANER);
    expect(ids).not.toContain(NEWCOMER);
    const tomorrow = await request('/staff/attendance-roster?date=2026-09-28');
    expect(tomorrow.body.data.map((row: { id: string }) => row.id)).toContain(NEWCOMER);
  });

  it('refuses deletes that would erase history, before touching anything', async () => {
    await db.insert(attendance).values({ id: id('mark'), type: 'staff', staffId: CLEANER, date: '2025-10-01',
      status: 'present', academicYearId: 'history-year-2025' });
    const refused = await request(`/staff/${CLEANER}`, undefined, 'DELETE');
    expect(refused.status).toBe(409);
    expect((await cleanerRows()).length).toBe(3);

    const zone = await request(`/zones/${ZONE_HALL}`, undefined, 'DELETE');
    expect(zone.status).toBe(409);
    expect((await request(`/zones/${ZONE_FREE}`, undefined, 'DELETE')).status).toBe(200);
  });

  it('gives MCP the same shared staff, with no year input', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-staff-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${adminToken}`, 'X-Academic-Year': '2024-2025' } },
    });
    await client.connect(transport);
    try {
      const tools = (await client.listTools()).tools.filter((tool) => tool.name.startsWith('staff_'));
      expect(tools.length).toBeGreaterThan(5);
      for (const tool of tools) expect(tool.inputSchema.properties ?? {}).not.toHaveProperty('academicYear');
      const update = await client.callTool({ name: 'staff_update', arguments: { id: HOURLY, phone: '212600000003' } }) as
        { content: Array<{ text: string }>; isError?: boolean };
      expect(update.isError, update.content[0]?.text).not.toBe(true);
      const [row] = await db.select().from(staff).where(eq(staff.id, HOURLY));
      expect([row.phone, row.status, row.compensationMode]).toEqual(['212600000003', 'inactive', 'hourly']);
      const read = await client.callTool({ name: 'staff_get_staff_member', arguments: { id: CLEANER } }) as
        { content: Array<{ text: string }>; isError?: boolean };
      expect(read.isError).not.toBe(true);
      expect(JSON.parse(read.content[0].text).id).toBe(CLEANER);
    } finally {
      await transport.close();
    }
  });
});
