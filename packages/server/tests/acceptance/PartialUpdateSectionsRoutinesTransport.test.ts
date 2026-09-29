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
const { routinePeriods, routineSchedules, sections } = await import('../../src/database/schema');
const { server } = await import('../../src/index');
const base = 'http://school.local/api';
const port = 5532;
const suffix = crypto.randomUUID().slice(0, 8);
const sectionId = 'history-section-2025-a';
let token: string;

async function update(path: string, body: Record<string, unknown>, year = '2025-2026') {
  const response = await server.fetch(new Request(`${base}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'X-Academic-Year': year,
      'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: response.status, body: await response.json() as Record<string, any> };
}

beforeAll(async () => {
  await server.listen(port);
  const response = await server.fetch(new Request(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@history.example.test', password: adminPassword }),
  }));
  const body = await response.json() as Record<string, any>;
  expect(response.status).toBe(200);
  token = body.data?.accessToken ?? body.accessToken;
  if (!token) throw new Error('History admin login returned no access token');
});
afterAll(async () => { await server.stop(); });

describe('section and timetable partial updates over authenticated REST', () => {
  it('preserves a section capacity and status when changing its name', async () => {
    const [original] = await db.select({ name: sections.name,
      maxStudents: sections.maxStudents, status: sections.status })
      .from(sections).where(eq(sections.id, sectionId));
    try {
      await db.update(sections).set({ maxStudents: 48, status: 'inactive' })
        .where(eq(sections.id, sectionId));
      const updated = await update(`/sections/${sectionId}`, { name: `H${suffix}` });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ name: sections.name,
        maxStudents: sections.maxStudents, status: sections.status })
        .from(sections).where(eq(sections.id, sectionId));
      expect(saved).toEqual({ name: `H${suffix}`, maxStudents: 48, status: 'inactive' });
    } finally {
      await db.update(sections).set(original).where(eq(sections.id, sectionId));
    }
  });

  it('preserves break and active flags when changing a period name', async () => {
    const id = `history-partial-period-${suffix}`;
    await db.insert(routinePeriods).values({ id, name: 'History break', startTime: '20:00',
      endTime: '21:00', sortOrder: 1000 + parseInt(suffix.slice(0, 4), 16),
      isBreak: true, isActive: false });
    try {
      const updated = await update(`/class-routines/periods/${id}`, { name: 'History evening break' });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ name: routinePeriods.name, isBreak: routinePeriods.isBreak,
        isActive: routinePeriods.isActive }).from(routinePeriods).where(eq(routinePeriods.id, id));
      expect(saved).toEqual({ name: 'History evening break', isBreak: true, isActive: false });
    } finally {
      await db.delete(routinePeriods).where(eq(routinePeriods.id, id));
    }
  });

  it('preserves custom active days when changing a schedule name', async () => {
    const id = `history-partial-routine-${suffix}`;
    await db.insert(routineSchedules).values({ id, sectionId, academicYear: '2025-2026',
      name: 'History custom days', status: 'archived', activeDays: ['monday', 'wednesday'] });
    try {
      const updated = await update(`/class-routines/${id}`, { name: 'History renamed days' });
      expect(updated.status).toBe(200);
      const [saved] = await db.select({ name: routineSchedules.name,
        activeDays: routineSchedules.activeDays }).from(routineSchedules)
        .where(eq(routineSchedules.id, id));
      expect(saved).toEqual({ name: 'History renamed days', activeDays: ['monday', 'wednesday'] });
    } finally {
      await db.delete(routineSchedules).where(eq(routineSchedules.id, id));
    }
  });
});
