import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { behaviorRewards } = await import('../../src/modules/behaviorRewards/behaviorRewardSchema');
const { BehaviorRewardRepository } = await import('../../src/modules/behaviorRewards/BehaviorRewardRepository');
const rollback = Symbol('rollback');

// The fixture school is in Africa/Casablanca, UTC+1 at both year boundaries used here.
const reward = (id: string, studentId: string, behaviorAt: string, year: string, awardedBy = 'history-admin') => ({
  id, studentId, behaviorAt, awardedBy,
  classId: `history-class-${year}`, sectionId: `history-section-${year}-a`,
  category: 'respect' as const, recognitionLevel: 'appreciation' as const, rewardType: 'verbal_praise' as const,
  description: `History reward ${id}`, points: 10,
});
const cases = [
  reward('history-reward-2024', 'history-student-01', '2025-03-10T10:00:00.000Z', '2024'),
  // 22:30 on 31 August locally: still 2024-2025.
  reward('history-reward-2024-last-evening', 'history-student-02', '2025-08-31T21:30:00.000Z', '2024'),
  // 00:30 on 1 September locally: already 2025-2026, although UTC still says 31 August.
  reward('history-reward-2025-first-night', 'history-student-01', '2025-08-31T23:30:00.000Z', '2025'),
  reward('history-reward-2025-by-principal', 'history-student-05', '2025-12-01T10:00:00.000Z', '2025', 'history-principal'),
  reward('history-reward-2026', 'history-student-01', '2026-10-05T09:00:00.000Z', '2026'),
];
const byYear: Record<string, string[]> = {
  'history-year-2024': ['history-reward-2024', 'history-reward-2024-last-evening'],
  'history-year-2025': ['history-reward-2025-by-principal', 'history-reward-2025-first-night'],
  'history-year-2026': ['history-reward-2026'],
};

// The fixture has no parents: add one, with its account, linked to these students.
async function linkParent(tx: typeof db, parentId: string, studentIds: string[]) {
  const { usersTable } = await import('../../src/auth');
  const { parents } = await import('../../src/modules/parents/parentSchema');
  const { studentParents } = await import('../../src/modules/students/studentSchema');
  const userId = `${parentId}-user`;
  await tx.insert(usersTable).values({ id: userId, name: 'Khadija Bennani', status: 'active',
    email: `${parentId}@history.example.test`, password: crypto.randomUUID() });
  await tx.insert(parents).values({ id: parentId, userId, name: 'Khadija Bennani', relationshipType: 'mother' });
  await tx.insert(studentParents).values(studentIds.map((studentId) => ({
    id: `${parentId}-${studentId}`, studentId, parentId,
  })));
}

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

describe('Behavior rewards selected-year repository on the marked PostgreSQL fixture', () => {
  it('lists each year\'s rewards by the school-local day of the behavior, and only to their owners', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(behaviorRewards).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(BehaviorRewardRepository, tx);
      await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
      const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();
      for (const [yearId, expected] of Object.entries(byYear)) {
        expect(ids(await inYear(yearId, () => repo.getAll()))).toEqual(expected);
        for (const id of expected) expect((await inYear(yearId, () => repo.getById(id)))?.id).toBe(id);
      }
      expect(await inYear('history-year-2026', () => repo.getById('history-reward-2024'))).toBeUndefined();

      // A teacher sees the rewards they awarded.
      const teacher = { id: 'history-principal', role: 'teacher' };
      expect(ids(await inYear('history-year-2025', () => repo.getAll(), teacher))).toEqual(['history-reward-2025-by-principal']);
      expect(await inYear('history-year-2024', () => repo.getAll(), teacher)).toEqual([]);

      // A student sees their own rewards, year by year, and not a classmate's.
      const adam = { id: 'history-student-01-user', role: 'student' };
      expect(ids(await inYear('history-year-2024', () => repo.getAll(), adam))).toEqual(['history-reward-2024']);
      expect(ids(await inYear('history-year-2025', () => repo.getAll(), adam))).toEqual(['history-reward-2025-first-night']);
      expect(await inYear('history-year-2025', () => repo.getById('history-reward-2025-by-principal'), adam)).toBeUndefined();

      // A parent sees their linked children's rewards only.
      await linkParent(tx, 'history-parent-rewards', ['history-student-02', 'history-student-05']);
      const parent = { id: 'history-parent-rewards-user', role: 'parent' };
      expect(ids(await inYear('history-year-2024', () => repo.getAll(), parent))).toEqual(['history-reward-2024-last-evening']);
      expect(ids(await inYear('history-year-2025', () => repo.getAll(), parent))).toEqual(['history-reward-2025-by-principal']);
      expect(await inYear('history-year-2025', () => repo.getAll(), { id: 'history-unlinked-user', role: 'parent' })).toEqual([]);
      expect(await inYear('history-year-2025', () => repo.getAll(), { id: adam.id, role: 'custom-role' })).toEqual([]);
    });
  });

  it('finds the placement on the behavior\'s day in the selected year, across a transfer and a withdrawal', async () => {
    const { repo, inYear } = await scopedHistoryRepository(BehaviorRewardRepository, db);
    const placedOn = (yearId: string, studentId: string, at: string) =>
      inYear(yearId, () => repo.getStudentPlacementOn(studentId, at));
    // Omar moved from section A to section B on 15 January 2026.
    expect(await placedOn('history-year-2025', 'history-student-05', '2025-12-01T10:00:00.000Z')).toEqual({
      id: 'history-student-05', classId: 'history-class-2025', sectionId: 'history-section-2025-a', inSelectedYear: true,
    });
    expect((await placedOn('history-year-2025', 'history-student-05', '2026-02-01T10:00:00.000Z'))?.sectionId)
      .toBe('history-section-2025-b');
    // Hamza left on 1 March 2026; Aya has no 2025-2026 enrollment at all.
    expect((await placedOn('history-year-2025', 'history-student-07', '2026-03-05T10:00:00.000Z'))?.sectionId).toBeNull();
    expect((await placedOn('history-year-2025', 'history-student-08', '2025-10-01T10:00:00.000Z'))?.sectionId).toBeNull();
    // The school-local day decides the year at the boundary.
    expect((await placedOn('history-year-2025', 'history-student-01', '2025-08-31T23:30:00.000Z'))?.inSelectedYear).toBe(true);
    expect((await placedOn('history-year-2025', 'history-student-01', '2025-08-31T21:30:00.000Z'))?.inSelectedYear).toBe(false);
    expect((await placedOn('history-year-2024', 'history-student-01', '2025-08-31T21:30:00.000Z'))?.sectionId)
      .toBe('history-section-2024-a');
    expect(await placedOn('history-year-2025', 'history-student-missing', '2025-10-01T10:00:00.000Z')).toBeUndefined();
  });

  it('changes and deletes a reward only in its own year', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(behaviorRewards).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(BehaviorRewardRepository, tx);
      const id = 'history-reward-2024';
      expect(await inYear('history-year-2026', () => repo.update(id, { description: 'Wrong year' }))).toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.delete(id))).toBeUndefined();
      expect((await inYear('history-year-2024', () => repo.getById(id)))?.description).toBe(`History reward ${id}`);
      expect((await inYear('history-year-2024', () => repo.update(id, { description: 'Corrected' })))?.description)
        .toBe('Corrected');
      expect((await inYear('history-year-2024', () => repo.delete(id)))?.id).toBe(id);
      expect((await tx.select().from(behaviorRewards)).map((row) => row.id).sort())
        .toEqual(cases.map((row) => row.id).filter((row) => row !== id).sort());
    });
    expect(await db.select().from(behaviorRewards)).toEqual([]);
  });
});
