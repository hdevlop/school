import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
// A controlled business day inside 2026-2027, independent of the machine clock.
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { db } = await import('../../src/database/db');
const { events, parents, staff, studentParents, students, users } = await import('../../src/database/schema');
const { EventRepository } = await import('../../src/modules/events/EventRepository');
const rollback = Symbol('rollback');

const OMAR = 'history-student-05';
const parentId = 'history-profiles-db-parent';
const parentUserId = 'history-profiles-db-parent-user';
const teacherUserId = 'history-profiles-db-teacher-user';
const id = (name: string) => `history-profiles-db-${name}`;

// Omar sits in 2026-2027 section A; nobody is placed in section B that year.
const EVENTS = [
  { id: id('school'), title: 'School open day', startDate: '2026-10-05' },
  { id: id('section-a'), title: 'Section A parents meeting', startDate: '2026-10-06',
    visibility: 'parents' as const, sectionId: 'history-section-2026-a' },
  { id: id('section-b'), title: 'Section B outing', startDate: '2026-10-07', sectionId: 'history-section-2026-b' },
  { id: id('staff'), title: 'Staff training', startDate: '2026-10-08', visibility: 'staff' as const },
  { id: id('teachers'), title: 'Teachers council', startDate: '2026-10-09', visibility: 'teachers' as const },
  { id: id('private'), title: 'Private board', startDate: '2026-10-10', visibility: 'private' as const },
  { id: id('cancelled'), title: 'Cancelled fair', startDate: '2026-10-11', status: 'cancelled' as const },
  { id: id('past'), title: 'Back to school', startDate: '2026-09-20' },
].map((event) => ({ type: 'academic' as const, endDate: event.startDate, ...event }));

async function withParentAndEvents(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      const tx = transaction as unknown as typeof db;
      // parents.user_id is NOT NULL, and the fixture teacher has no account.
      await tx.insert(users).values([
        { id: parentUserId, name: 'History profiles parent', email: 'profiles-db-parent@history.example.test',
          password: 'not-used', status: 'active', emailVerified: true },
        { id: teacherUserId, name: 'History profiles teacher', email: 'profiles-db-teacher@history.example.test',
          password: 'not-used', status: 'active', emailVerified: true },
      ]);
      await tx.insert(parents).values({ id: parentId, userId: parentUserId, name: 'History profiles parent',
        relationshipType: 'guardian' });
      await tx.insert(studentParents).values({ id: id('link'), studentId: OMAR, parentId });
      await tx.update(staff).set({ userId: teacherUserId }).where(eq(staff.id, 'history-staff-teacher'));
      await tx.insert(events).values(EVENTS);
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe('parent profile events on the marked PostgreSQL fixture', () => {
  it("lists the upcoming events that parent's account sees, within the reader's own", async () => {
    await withParentAndEvents(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(EventRepository, tx);
      const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
      const forParent = (year: string, actor?: { id: string; role: string }) =>
        inYear(year, () => repo.getUpcomingForParent(parentUserId), actor);
      await expect(repo.getUpcomingForParent(parentUserId)).rejects.toThrow('Resolved academic year is missing');

      // The school's own event and the event of Omar's section for parents;
      // not another section's, not staff, teacher or private ones, not a
      // cancelled or past one.
      const expected = [id('school'), id('section-a')];
      expect(ids(await forParent('history-year-2026'))).toEqual(expected);
      expect(ids(await forParent('history-year-2026', { id: parentUserId, role: 'parent' }))).toEqual(expected);
      expect(ids(await forParent('history-year-2026', { id: 'history-principal', role: 'principal' }))).toEqual(expected);
      // A teacher's own view has no parents' events.
      expect(ids(await forParent('history-year-2026', { id: teacherUserId, role: 'teacher' }))).toEqual([id('school')]);
      expect(await forParent('history-year-2026', { id: 'history-nobody', role: 'visitor' })).toEqual([]);
      // A year that ended before the business day has nothing upcoming.
      expect(await forParent('history-year-2025')).toEqual([]);

      // The same reader's school-wide list has the others: the parent rule is what narrows it.
      const everything = ids(await inYear('history-year-2026', () => repo.getUpcoming()));
      expect(everything).toEqual(expect.arrayContaining([id('section-b'), id('staff'), id('teachers'), id('private')]));
      expect(everything).not.toContain(id('cancelled'));
      expect(everything).not.toContain(id('past'));
    });
  });

  it("follows the child's placement on the event's day, not the current section", async () => {
    await withParentAndEvents(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(EventRepository, tx);
      // Omar's current section says B; his 2026-2027 placement is still A.
      await tx.update(students).set({ sectionId: 'history-section-2026-b' }).where(eq(students.id, OMAR));
      const rows = await inYear('history-year-2026', () => repo.getUpcomingForParent(parentUserId));
      expect(rows.map((row) => row.id)).toEqual([id('school'), id('section-a')]);
    });
  });
});
