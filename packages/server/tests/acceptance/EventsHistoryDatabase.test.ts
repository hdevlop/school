import { describe, expect, it } from 'bun:test';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { events } = await import('../../src/modules/events/eventSchema');
const { EventRepository } = await import('../../src/modules/events/EventRepository');
const { sql } = await import('drizzle-orm');
const rollback = Symbol('rollback');

type Audience = 'public' | 'private' | 'teachers' | 'students' | 'parents' | 'staff';
const event = (id: string, startDate: string, endDate = startDate, visibility: Audience = 'public',
  target: { classIds?: string[]; sectionId?: string; organizerId?: string } = {}) => ({
  id, startDate, endDate, visibility, title: `History event ${id}`, type: 'academic' as const,
  classId: target.classIds?.[0] ?? null, classIds: target.classIds ?? null,
  sectionId: target.sectionId ?? null, organizerId: target.organizerId ?? null,
});
// Every student sits in section A of each year, except Omar (S05), who moves to
// section B on 15 January 2026; Aya (S08) has no 2025-2026 enrollment.
const cases = [
  event('history-event-2024', '2024-11-10'),
  // 30 August to 2 September 2025 overlaps both years.
  event('history-event-boundary', '2025-08-30', '2025-09-02'),
  event('history-event-2025', '2025-10-10'),
  event('history-event-teachers', '2025-10-15', undefined, 'teachers'),
  event('history-event-parents', '2025-10-16', undefined, 'parents'),
  event('history-event-students', '2025-10-17', undefined, 'students'),
  event('history-event-private', '2025-10-18', undefined, 'private', { organizerId: 'history-principal' }),
  event('history-event-class-2025', '2025-10-20', undefined, 'public', { classIds: ['history-class-2025'] }),
  event('history-event-section-b', '2026-02-10', undefined, 'public', { sectionId: 'history-section-2025-b' }),
  event('history-event-2026', '2026-10-15'),
];
const byYear: Record<string, string[]> = {
  'history-year-2024': ['history-event-2024', 'history-event-boundary'],
  'history-year-2025': ['history-event-2025', 'history-event-boundary', 'history-event-class-2025',
    'history-event-parents', 'history-event-private', 'history-event-section-b', 'history-event-students',
    'history-event-teachers'],
  'history-year-2026': ['history-event-2026'],
};

async function inRolledBackTransaction(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx as unknown as typeof db);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();

describe('Events selected-year repository on the marked PostgreSQL fixture', () => {
  it('reads each year\'s events by overlap with its reporting interval', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(events).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(EventRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      for (const [yearId, expected] of Object.entries(byYear)) {
        expect(ids(await inYear(yearId, () => repo.getAll()))).toEqual(expected);
        for (const id of expected) expect((await inYear(yearId, () => repo.getById(id)))?.id).toBe(id);
      }
      expect(await inYear('history-year-2026', () => repo.getById('history-event-2025'))).toBeUndefined();
      expect(ids(await inYear('history-year-2025', () => repo.getByClass('history-class-2025'))))
        .toEqual(['history-event-class-2025']);
      expect((await inYear('history-year-2025', () => repo.getEventAnalytics())).totalEvents).toBe(8);
    });
  });

  it('shows each role its audience, and class events only to the students placed in them that day', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(events).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(EventRepository, tx);
      const seen = async (id: string, role: string) =>
        ids(await inYear('history-year-2025', () => repo.getAll(), { id, role }));
      const schoolWide = ['history-event-2025', 'history-event-boundary', 'history-event-class-2025',
        'history-event-section-b'];

      // A teacher: public, teacher events and their own private one.
      expect(await seen('history-principal', 'teacher'))
        .toEqual([...schoolWide, 'history-event-private', 'history-event-teachers'].sort());
      expect(await seen('history-unlinked-user', 'teacher')).toEqual([...schoolWide, 'history-event-teachers'].sort());
      // Omar sat in class 2025 in October and in section B in February; Adam stayed in A.
      expect(await seen('history-student-05-user', 'student')).toEqual([...schoolWide, 'history-event-students'].sort());
      expect(await seen('history-student-01-user', 'student')).toEqual(['history-event-2025', 'history-event-boundary',
        'history-event-class-2025', 'history-event-students']);
      expect(await seen('history-student-08-user', 'student'))
        .toEqual(['history-event-2025', 'history-event-boundary', 'history-event-students']);

      await tx.execute(sql`insert into users (id, name, email, password, status)
        values ('history-event-parent-user', 'Parent of Omar', 'history-event-parent@example.test',
                'unused-fixture-hash', 'active')`);
      await tx.execute(sql`insert into parents (id, user_id, name, relationship_type)
        values ('history-event-parent', 'history-event-parent-user', 'Parent of Omar', 'father')`);
      await tx.execute(sql`insert into student_parents (id, student_id, parent_id)
        values ('history-event-parent-link', 'history-student-05', 'history-event-parent')`);
      expect(await seen('history-event-parent-user', 'parent')).toEqual([...schoolWide, 'history-event-parents'].sort());
      expect(await seen('history-unlinked-user', 'parent')).toEqual(['history-event-2025', 'history-event-boundary',
        'history-event-parents']);
      expect(await inYear('history-year-2025', () => repo.getById('history-event-private'),
        { id: 'history-event-parent-user', role: 'parent' })).toBeUndefined();
      expect(await seen('history-student-01-user', 'custom-role')).toEqual([]);
    });
  });

  it('limits updates and deletion to the selected year', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(events).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(EventRepository, tx);
      expect(await inYear('history-year-2026', () => repo.update('history-event-2025', { title: 'Wrong year' })))
        .toBeUndefined();
      await inYear('history-year-2026', () => repo.delete('history-event-2025'));
      expect((await inYear('history-year-2025', () => repo.getById('history-event-2025')))?.title)
        .toBe('History event history-event-2025');
      expect((await inYear('history-year-2025', () => repo.update('history-event-2025', { title: 'Corrected' })))?.title)
        .toBe('Corrected');
      expect(inYear('history-year-2025', async () => repo.overlapsSelectedYear('2026-08-31', '2026-09-03')))
        .resolves.toBe(true);
      expect(inYear('history-year-2025', async () => repo.overlapsSelectedYear('2026-09-01', '2026-09-03')))
        .resolves.toBe(false);
      await inYear('history-year-2024', () => repo.deleteAll());
      expect(ids(await tx.select().from(events))).toEqual(byYear['history-year-2025']
        .filter((id) => id !== 'history-event-boundary').concat('history-event-2026').sort());
    });
    expect(await db.select().from(events)).toEqual([]);
  });
});
