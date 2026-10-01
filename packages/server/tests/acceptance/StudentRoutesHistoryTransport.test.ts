import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';

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
const raceTrigger = `history_route_race_${suffix.replaceAll('-', '_')}`;
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

  it('refuses overlapping completed routes when different vehicles are assigned at once', async () => {
    await db.insert(fees).values({ id: `history-route-race-fee-${suffix}`, studentId: 'history-student-02',
      feeTypeId, academicYear: '2025-2026', effectiveDate: '2025-10-01',
      baseAmount: '100', grossAmount: '100', netAmount: '100' });
    await db.execute(sql.raw(`CREATE FUNCTION ${raceTrigger}() RETURNS trigger AS $$
      BEGIN
        IF NEW.vehicle_id IN ('${firstVehicle}', '${secondVehicle}') THEN PERFORM pg_sleep(0.2); END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`));
    await db.execute(sql.raw(`CREATE TRIGGER ${raceTrigger} BEFORE INSERT ON student_routes
      FOR EACH ROW EXECUTE FUNCTION ${raceTrigger}()`));
    try {
      const results = await Promise.all([firstVehicle, secondVehicle].map(vehicleId =>
        request('/student-routes', '2025-2026', 'POST', { studentId: 'history-student-02', vehicleId,
          assignmentDate: '2025-10-01', unassignmentDate: '2025-11-01', status: 'completed' })));
      expect(results.map(result => result.status).sort()).toEqual([200, 409]);
      expect(await db.select().from(studentRoutes).where(and(
        eq(studentRoutes.studentId, 'history-student-02'), eq(studentRoutes.assignmentDate, '2025-10-01'),
      ))).toHaveLength(1);
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${raceTrigger} ON student_routes`));
      await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${raceTrigger}()`));
    }
  });

  it('serializes assignments, replacements and ends for one student across different vehicles', async () => {
    const studentId = 'history-student-01';
    const [fee] = (await db.select().from(fees).where(eq(fees.feeTypeId, feeTypeId)))
      .filter(row => row.studentId === studentId && row.academicYear === '2026-2027');
    expect(fee).toBeDefined();
    const resumedAmount = (await db.select().from(feeInstallments).where(eq(feeInstallments.feeId, fee.id)))
      .filter(row => row.status === 'cancelled' && row.dueDate >= '2026-09-26')
      .reduce((total, row) => total + Number(row.amount), 0);
    await db.execute(sql.raw(`CREATE FUNCTION ${raceTrigger}() RETURNS trigger AS $$
      BEGIN
        IF NEW.vehicle_id IN ('${firstVehicle}', '${secondVehicle}') THEN PERFORM pg_sleep(0.2); END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`));
    await db.execute(sql.raw(`CREATE TRIGGER ${raceTrigger} BEFORE INSERT ON student_routes
      FOR EACH ROW EXECUTE FUNCTION ${raceTrigger}()`));
    try {
      const assigned = await Promise.all([firstVehicle, secondVehicle].map(vehicleId =>
        request('/student-routes', '2026-2027', 'POST', { studentId, vehicleId, assignmentDate: '2026-09-26' })));
      expect(assigned.map(result => result.status).sort()).toEqual([200, 409]);
      const first = assigned.find(result => result.status === 200)!.body.data;
      const assignments = await db.select().from(studentRoutes).where(and(
        eq(studentRoutes.studentId, studentId), eq(studentRoutes.assignmentDate, '2026-09-26'),
      ));
      expect(assignments).toHaveLength(1);
      const [resumedFee] = await db.select().from(fees).where(eq(fees.id, fee.id));
      expect(Number(resumedFee.netAmount)).toBe(Number(fee.netAmount) + resumedAmount);

      const targetVehicle = first.vehicleId === firstVehicle ? secondVehicle : firstVehicle;
      const moved = await Promise.all([1, 2].map(() => request(`/student-routes/${first.id}/reassign`,
        '2026-2027', 'POST', { vehicleId: targetVehicle, assignmentDate: '2026-09-27' })));
      expect(moved.map(result => result.status).sort()).toEqual([200, 409]);
      const replacement = moved.find(result => result.status === 200)!.body.data;
      expect(await db.select().from(studentRoutes).where(and(
        eq(studentRoutes.studentId, studentId), eq(studentRoutes.assignmentDate, '2026-09-27'),
      ))).toHaveLength(1);
      const [original] = await db.select().from(studentRoutes).where(eq(studentRoutes.id, first.id));
      expect([original.vehicleId, original.status, original.unassignmentDate])
        .toEqual([first.vehicleId, 'completed', '2026-09-27']);

      const ended = await Promise.all([1, 2].map(() => request(`/student-routes/${replacement.id}/unassign`,
        '2026-2027', 'POST', { unassignmentDate: '2026-09-28' })));
      expect(ended.map(result => result.status).sort()).toEqual([200, 409]);
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${raceTrigger} ON student_routes`));
      await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${raceTrigger}()`));
    }
  });

  it('restores the old route when billing its replacement fails', async () => {
    const rollbackId = `history-route-rollback-${suffix}`;
    await db.insert(studentRoutes).values({ id: rollbackId, studentId: 'history-student-02',
      vehicleId: firstVehicle, assignmentDate: '2026-09-12', status: 'active' });
    const [before] = await db.select().from(studentRoutes).where(eq(studentRoutes.id, rollbackId));
    await db.execute(sql.raw(`CREATE FUNCTION ${raceTrigger}() RETURNS trigger AS $$
      BEGIN
        IF NEW.fee_type_id = '${feeTypeId}' AND NEW.academic_year = '2026-2027'
          AND NEW.student_id = 'history-student-02' THEN RAISE EXCEPTION 'injected route billing failure'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`));
    await db.execute(sql.raw(`CREATE TRIGGER ${raceTrigger} BEFORE INSERT ON fees
      FOR EACH ROW EXECUTE FUNCTION ${raceTrigger}()`));
    try {
      const failed = await request(`/student-routes/${rollbackId}/reassign`, '2026-2027', 'POST', {
        vehicleId: secondVehicle, assignmentDate: '2026-09-20',
      });
      expect(failed.status).toBe(500);
      expect(await db.select().from(studentRoutes).where(and(
        eq(studentRoutes.studentId, 'history-student-02'), eq(studentRoutes.status, 'active'),
        inArray(studentRoutes.vehicleId, [firstVehicle, secondVehicle]),
      ))).toEqual([before]);
      expect(await db.select().from(fees).where(and(
        eq(fees.feeTypeId, feeTypeId), eq(fees.studentId, 'history-student-02'), eq(fees.academicYear, '2026-2027'),
      ))).toHaveLength(0);
    } finally {
      await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${raceTrigger} ON fees`));
      await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${raceTrigger}()`));
      await db.delete(studentRoutes).where(eq(studentRoutes.id, rollbackId));
    }
  });

  it('keeps the live capacity limit when two different students take the last seat', async () => {
    const vehicleId = `history-route-last-seat-${suffix}`;
    await db.insert(vehicles).values({ id: vehicleId, name: 'History last-seat bus', brand: 'Ford', model: 'Transit',
      year: 2024, capacity: 1, licensePlate: `H-RC-${suffix}` });
    try {
      const results = await Promise.all(['history-student-05', 'history-student-06'].map(studentId =>
        request('/student-routes', '2026-2027', 'POST', { studentId, vehicleId, assignmentDate: '2026-09-20' })));
      expect(results.map(result => result.status).sort()).toEqual([200, 409]);
      expect(await db.select().from(studentRoutes).where(eq(studentRoutes.vehicleId, vehicleId))).toHaveLength(1);
    } finally {
      await db.delete(studentRoutes).where(eq(studentRoutes.vehicleId, vehicleId));
      await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    }
  });
});
