import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { parents, staff, studentParents, students, users } = await import('../../src/database/schema');
const { ParentChildrenRepository } = await import('../../src/modules/parents/ParentChildrenRepository');
const { ParentRepository } = await import('../../src/modules/parents/ParentRepository');
const rollback = Symbol('rollback');

const OMAR = 'history-student-05';
const MARIAM = 'history-student-04';
const AYA = 'history-student-08';
const parentId = 'history-parents-db-parent';
const parentUserId = 'history-parents-db-parent-user';
const teacherUserId = 'history-parents-db-teacher-user';

type Child = {
  id: string;
  class: { id: string | null } | null;
  section: { id: string | null } | null;
  enrollment: { status: string | null; leftOn: string | null } | null;
};
// Each child's class, section and enrollment status in the year, by id.
const placements = (children: Child[]) => Object.fromEntries(children.map((child) => [child.id, [
  child.class?.id ?? null, child.section?.id ?? null, child.enrollment?.status ?? null,
]]));

async function withFamily(run: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      const tx = transaction as unknown as typeof db;
      // parents.user_id is NOT NULL: the parent needs an account first.
      await tx.insert(users).values([
        { id: parentUserId, name: 'History parent', email: 'parents-db-parent@history.example.test',
          password: 'not-used', status: 'active', emailVerified: true },
        { id: teacherUserId, name: 'History teacher', email: 'parents-db-teacher@history.example.test',
          password: 'not-used', status: 'active', emailVerified: true },
      ]);
      await tx.insert(parents).values({ id: parentId, userId: parentUserId, name: 'History family parent',
        relationshipType: 'guardian' });
      await tx.insert(studentParents).values([OMAR, MARIAM, AYA].map((studentId) => ({
        id: `history-parents-db-link-${studentId.slice(-2)}`, studentId, parentId,
      })));
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe('parent children on the marked PostgreSQL fixture', () => {
  it("places every linked child by that year's latest placement, and none when not enrolled", async () => {
    await withFamily(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(ParentChildrenRepository, tx);
      await expect(repo.getChildren(parentId)).rejects.toThrow('Resolved academic year is missing');

      const year2024 = await inYear('history-year-2024', () => repo.getChildren(parentId)) as Child[];
      const year2025 = await inYear('history-year-2025', () => repo.getChildren(parentId)) as Child[];
      const year2026 = await inYear('history-year-2026', () => repo.getChildren(parentId)) as Child[];

      // Aya Chraibi, Mariam Idrissi, Omar Bennis: every link, by name, in every year.
      for (const children of [year2024, year2025, year2026]) {
        expect(children.map((child) => child.id)).toEqual([AYA, MARIAM, OMAR]);
      }
      expect(placements(year2024)).toEqual({
        [AYA]: [null, null, null],
        [MARIAM]: ['history-class-2024', 'history-section-2024-a', 'active'],
        [OMAR]: ['history-class-2024', 'history-section-2024-a', 'active'],
      });
      // Omar's latest 2025-2026 placement is section B after his transfer;
      // Aya's fee in that year is no enrollment.
      expect(placements(year2025)).toEqual({
        [AYA]: [null, null, null],
        [MARIAM]: ['history-class-2025', 'history-section-2025-a', 'graduated'],
        [OMAR]: ['history-class-2025', 'history-section-2025-b', 'active'],
      });
      expect(year2025.find((child) => child.id === MARIAM)?.enrollment?.leftOn).toBe('2026-07-01');
      expect(placements(year2026)).toEqual({
        [AYA]: ['history-class-2026', 'history-section-2026-a', 'active'],
        [MARIAM]: [null, null, null],
        [OMAR]: ['history-class-2026', 'history-section-2026-a', 'active'],
      });

      // The current-link read keeps today's projection whatever the year.
      const linked = await inYear('history-year-2026', () => repo.getLinkedChildren(parentId));
      const projection = await tx.select({ id: students.id, classId: students.classId }).from(students)
        .where(eq(students.id, OMAR));
      expect(linked.find((child) => child.id === OMAR)?.class?.id).toBe(projection[0].classId);
    });
  });

  it('lists only the children each reader may read as students', async () => {
    await withFamily(async (tx) => {
      const { repo, inYear } = await scopedHistoryRepository(ParentChildrenRepository, tx);
      const ids = (children: Array<{ id: string }>) => children.map((child) => child.id);
      const current = (actor: { id: string; role: string }) =>
        inYear('history-year-2026', () => repo.getChildren(parentId), actor);

      // The fixture teacher teaches section A of every year. Aya and Omar
      // are placed there in 2026; Mariam was taught only in earlier years.
      // A changed current projection must not replace the year's placement.
      await tx.update(staff).set({ userId: teacherUserId }).where(eq(staff.id, 'history-staff-teacher'));
      await tx.update(students).set({ sectionId: 'history-section-2026-b' }).where(eq(students.id, AYA));

      expect(ids(await current({ id: parentUserId, role: 'parent' }))).toEqual([AYA, MARIAM, OMAR]);
      expect(ids(await current({ id: 'history-principal', role: 'principal' }))).toEqual([AYA, MARIAM, OMAR]);
      const taught = ids(await current({ id: teacherUserId, role: 'teacher' }));
      expect(taught).toEqual([AYA, OMAR]);
      expect(ids(await inYear('history-year-2025', () => repo.getChildren(parentId),
        { id: teacherUserId, role: 'teacher' }))).toEqual([MARIAM]);
      expect(await current({ id: 'history-nobody', role: 'visitor' })).toEqual([]);
      const linkedForTeacher = ids(await inYear('history-year-2026',
        () => repo.getLinkedChildren(parentId), { id: teacherUserId, role: 'teacher' }));
      expect(linkedForTeacher).toEqual([AYA, OMAR]);
    });
  });

  it('sees any remaining link before a delete-all, and none once they are gone', async () => {
    await withFamily(async (tx) => {
      const repo = new ParentRepository();
      repo.db = tx;
      expect(await repo.hasAnyLinks()).toBe(true);
      await tx.delete(studentParents).where(eq(studentParents.parentId, parentId));
      expect(await repo.hasAnyLinks()).toBe(false);
    });
  });
});
