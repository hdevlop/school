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
const { vehicles, studentRoutes, feeTypes, fees, feeInstallments, financialAuditLogs } =
  await import('../../src/database/schema');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { server } = await import('../../src/index');
const { yearScopedModules } = await import('../../src/config/yearScope');
const { scopedHistoryRepository } = await import('../academicYears/fixtures/scopedHistoryRepository');
const { StudentRouteRepository } = await import('../../src/modules/transport/studentRoutes/StudentRouteRepository');
const base = 'http://school.local/api';
const port = 5523;
const suffix = crypto.randomUUID().slice(0, 8);
const firstVehicle = `history-route-bus-a-${suffix}`;
const secondVehicle = `history-route-bus-b-${suffix}`;
const feeTypeId = `history-route-type-${suffix}`;
const oldId = `history-route-old-${suffix}`;
const newId = `history-route-new-${suffix}`;
const spanId = `history-route-span-${suffix}`;
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
  await db.insert(vehicles).values([
    { id: firstVehicle, name: 'History route bus A', brand: 'Ford', model: 'Transit',
      year: 2024, capacity: 20, licensePlate: `H-RA-${suffix}` },
    { id: secondVehicle, name: 'History route bus B', brand: 'Ford', model: 'Transit',
      year: 2024, capacity: 20, licensePlate: `H-RB-${suffix}` },
  ]);
  await db.insert(feeTypes).values({ id: feeTypeId, name: `History route ${suffix}`,
    category: 'transport', amount: '100.00', paymentType: 'recurring', status: 'active' });
  await db.insert(studentRoutes).values([
    { id: oldId, studentId: 'history-student-02', vehicleId: firstVehicle,
      assignmentDate: '2025-11-10', unassignmentDate: '2026-03-01', status: 'completed' },
    { id: newId, studentId: 'history-student-02', vehicleId: firstVehicle,
      assignmentDate: '2026-09-05', unassignmentDate: '2026-09-10', status: 'completed' },
    { id: spanId, studentId: 'history-student-03', vehicleId: firstVehicle,
      assignmentDate: '2025-12-01', unassignmentDate: '2026-10-01', status: 'completed' },
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
  await db.delete(studentRoutes).where(inArray(studentRoutes.vehicleId, [firstVehicle, secondVehicle]));
  const createdFees = await db.select({ id: fees.id }).from(fees).where(eq(fees.feeTypeId, feeTypeId));
  const ids = createdFees.map(row => row.id);
  if (ids.length) {
    await db.delete(feeInstallments).where(inArray(feeInstallments.feeId, ids));
    await db.delete(financialAuditLogs).where(inArray(financialAuditLogs.entityId, ids));
    await db.delete(fees).where(inArray(fees.id, ids));
  }
  await db.delete(feeTypes).where(eq(feeTypes.id, feeTypeId));
  await db.delete(vehicles).where(inArray(vehicles.id, [firstVehicle, secondVehicle]));
}, 30_000);

describe('student route history on the local fixture', () => {
  it('shows a dated route in each overlapping year, including a completed interval', async () => {
    expect(yearScopedModules).toHaveProperty('student-routes');
    const { repo, inYear } = await scopedHistoryRepository(StudentRouteRepository, db);
    const years = await db.select({ id: academicYears.id, label: academicYears.label }).from(academicYears);
    const yearId = (label: string) => years.find(row => row.label === label)?.id ?? '';
    expect((await inYear(yearId('2025-2026'), () => repo.getByVehicleId(firstVehicle)))
      .map(row => row.id).sort()).toEqual([oldId, spanId].sort());
    expect((await inYear(yearId('2026-2027'), () => repo.getByVehicleId(firstVehicle)))
      .map(row => row.id).sort()).toEqual([newId, spanId].sort());
    expect(await inYear(yearId('2025-2026'), () => repo.getById(newId))).toBeNull();
    expect(await inYear(yearId('2026-2027'), () => repo.getById(oldId))).toBeNull();
  });

  it('preserves the old vehicle on reassignment and changes only the selected-year fee', async () => {
    for (const [year, shown, hidden] of [
      ['2025-2026', [oldId, spanId], newId],
      ['2026-2027', [newId, spanId], oldId],
    ] as const) {
      const list = await request('/student-routes', year);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((row: { id: string }) => row.id);
      for (const id of shown) expect(ids).toContain(id);
      expect(ids).not.toContain(hidden);
      expect((await request(`/student-routes/${hidden}`, year)).status).toBe(404);
    }
    expect((await request('/student-routes', 'invalid')).status).toBe(400);
    expect((await request('/student-routes', '2025-2026', 'POST', {
      studentId: 'history-student-02', vehicleId: secondVehicle,
      assignmentDate: '2025-12-01', unassignmentDate: '2026-02-01', status: 'completed',
    })).status).toBe(409);
    expect((await request('/student-routes', '2025-2026', 'POST', {
      studentId: 'history-student-10', vehicleId: secondVehicle,
      assignmentDate: '2025-10-10', unassignmentDate: '2025-11-01', status: 'completed',
    })).status).toBe(409);
    expect((await request('/student-routes', '2025-2026', 'POST', {
      studentId: 'history-student-01', vehicleId: firstVehicle, assignmentDate: '2026-09-15',
    })).status).toBe(409);
    const created = await request('/student-routes', '2025-2026', 'POST', {
      studentId: 'history-student-01', vehicleId: firstVehicle, assignmentDate: '2025-10-10',
    });
    expect(created.status).toBe(200);
    const createdId = created.body.data.id as string;
    const oldFee = (await db.select().from(fees).where(eq(fees.feeTypeId, feeTypeId)))
      .find(row => row.academicYear === '2025-2026');
    expect(oldFee?.studentId).toBe('history-student-01');

    const moved = await request(`/student-routes/${createdId}/reassign`, '2026-2027', 'POST', {
      vehicleId: secondVehicle, assignmentDate: '2026-09-20',
    });
    expect(moved.status).toBe(200);
    const replacementId = moved.body.data.id as string;
    expect(replacementId).not.toBe(createdId);
    const original = (await db.select().from(studentRoutes).where(eq(studentRoutes.id, createdId)))[0];
    expect(original.vehicleId).toBe(firstVehicle);
    expect(original.assignmentDate).toBe('2025-10-10');
    expect(original.unassignmentDate).toBe('2026-09-20');
    expect(original.status).toBe('completed');
    expect((await request(`/student-routes/${replacementId}`, '2025-2026')).status).toBe(404);
    expect((await request(`/student-routes/${replacementId}`, '2026-2027')).status).toBe(200);
    const newFee = (await db.select().from(fees).where(eq(fees.feeTypeId, feeTypeId)))
      .find(row => row.academicYear === '2026-2027');
    expect(newFee?.studentId).toBe('history-student-01');
    expect((await db.select().from(fees).where(eq(fees.id, oldFee!.id)))[0].netAmount)
      .toBe(oldFee!.netAmount);

    const ended = await request(`/student-routes/${replacementId}/unassign`, '2026-2027', 'POST', {
      unassignmentDate: '2026-09-25',
    });
    expect(ended.status).toBe(200);
    expect(ended.body.data.unassignmentDate).toBe('2026-09-25');
    expect((await db.select().from(fees).where(eq(fees.id, oldFee!.id)))[0].netAmount)
      .toBe(oldFee!.netAmount);
    expect((await db.select().from(fees).where(eq(fees.id, newFee!.id)))[0].netAmount)
      .not.toBe(newFee!.netAmount);

    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const client = new Client({ name: 'school-route-history-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': '2025-2026' } },
    });
    await client.connect(transport);
    try {
      const result = await client.callTool({ name: 'student-routes_get_all', arguments: {} }) as {
        content: Array<{ text: string }>; isError?: boolean;
      };
      if (result.isError) throw new Error(JSON.stringify(result.content));
      const ids = (JSON.parse(result.content[0].text) as Array<{ id: string }>).map(row => row.id);
      expect(ids).toContain(createdId);
      expect(ids).not.toContain(replacementId);
    } finally { await transport.close(); }
  });
});
