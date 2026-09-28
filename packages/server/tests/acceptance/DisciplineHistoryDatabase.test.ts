import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { disciplineIncidents } = await import('../../src/modules/discipline/disciplineSchema');
const { DisciplineRepository } = await import('../../src/modules/discipline/DisciplineRepository');
const rollback = Symbol('rollback');

// The fixture school is in Africa/Casablanca, UTC+1 at both year boundaries used here.
const incident = (id: string, studentId: string, incidentAt: string, year: string, reportedBy = 'history-admin') => ({
  id, studentId, incidentAt, reportedBy,
  classId: `history-class-${year}`, sectionId: `history-section-${year}-a`,
  category: 'disrespect' as const, severity: 'low' as const, status: 'open' as const,
  description: `History incident ${id}`,
});
const cases = [
  incident('history-incident-2024', 'history-student-01', '2025-03-10T10:00:00.000Z', '2024'),
  // 22:30 on 31 August locally: still 2024-2025.
  incident('history-incident-2024-last-evening', 'history-student-02', '2025-08-31T21:30:00.000Z', '2024'),
  // 00:30 on 1 September locally: already 2025-2026, although UTC still says 31 August.
  incident('history-incident-2025-first-night', 'history-student-01', '2025-08-31T23:30:00.000Z', '2025'),
  incident('history-incident-2025-by-principal', 'history-student-05', '2025-12-01T10:00:00.000Z', '2025', 'history-principal'),
  incident('history-incident-2026', 'history-student-01', '2026-09-15T09:00:00.000Z', '2026'),
];
const byYear: Record<string, string[]> = {
  'history-year-2024': ['history-incident-2024', 'history-incident-2024-last-evening'],
  'history-year-2025': ['history-incident-2025-by-principal', 'history-incident-2025-first-night'],
  'history-year-2026': ['history-incident-2026'],
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

describe('Discipline selected-year repository on the marked PostgreSQL fixture', () => {
  it('lists each year\'s incidents by the school-local day of the incident, and only to their owners', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(disciplineIncidents).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(DisciplineRepository, tx);
      await expect(repo.list()).rejects.toThrow('Resolved academic year is missing');
      const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id).sort();
      for (const [yearId, expected] of Object.entries(byYear)) {
        expect(ids(await inYear(yearId, () => repo.list()))).toEqual(expected);
        for (const id of expected) expect((await inYear(yearId, () => repo.getById(id)))?.id).toBe(id);
      }
      expect(await inYear('history-year-2026', () => repo.getById('history-incident-2024'))).toBeUndefined();

      // Ownership still applies inside each year.
      const teacher = { id: 'history-principal', role: 'teacher' };
      expect(ids(await inYear('history-year-2025', () => repo.list(), teacher))).toEqual(['history-incident-2025-by-principal']);
      expect(await inYear('history-year-2024', () => repo.list(), teacher)).toEqual([]);
      const adam = { id: 'history-student-01-user', role: 'student' };
      expect(ids(await inYear('history-year-2024', () => repo.list(), adam))).toEqual(['history-incident-2024']);
      expect(ids(await inYear('history-year-2025', () => repo.list(), adam))).toEqual(['history-incident-2025-first-night']);
    });
  });

  it('finds the placement on the incident\'s day in the selected year', async () => {
    const { repo, inYear } = await scopedHistoryRepository(DisciplineRepository, db);
    const placedOn = (yearId: string, studentId: string, at: string) =>
      inYear(yearId, () => repo.getStudentPlacementOn(studentId, at));
    // Omar moved from section A to section B on 15 January 2026.
    expect((await placedOn('history-year-2025', 'history-student-05', '2025-12-01T10:00:00.000Z'))?.sectionId)
      .toBe('history-section-2025-a');
    expect((await placedOn('history-year-2025', 'history-student-05', '2026-02-01T10:00:00.000Z'))?.sectionId)
      .toBe('history-section-2025-b');
    // Hamza left on 1 March 2026.
    expect((await placedOn('history-year-2025', 'history-student-07', '2026-03-05T10:00:00.000Z'))?.sectionId).toBeNull();
    expect((await placedOn('history-year-2025', 'history-student-01', '2025-08-31T21:30:00.000Z'))?.inSelectedYear).toBe(false);
  });

  it('changes and deletes an incident only in its own year', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.insert(disciplineIncidents).values(cases);
      const { repo, inYear } = await scopedHistoryRepository(DisciplineRepository, tx);
      const id = 'history-incident-2024';
      expect(await inYear('history-year-2026', () => repo.update(id, { description: 'Wrong year' }))).toBeUndefined();
      expect(await inYear('history-year-2026', () => repo.delete(id))).toBeUndefined();
      expect((await inYear('history-year-2024', () => repo.getById(id)))?.description).toBe(`History incident ${id}`);
      expect((await inYear('history-year-2024', () => repo.update(id, { description: 'Corrected' })))?.description)
        .toBe('Corrected');
      expect((await inYear('history-year-2024', () => repo.delete(id)))?.id).toBe(id);
      expect((await tx.select().from(disciplineIncidents)).map((row) => row.id).sort())
        .toEqual(cases.map((row) => row.id).filter((row) => row !== id).sort());
    });
    expect(await db.select().from(disciplineIncidents)).toEqual([]);
  });
});
