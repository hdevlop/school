import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { usersTable } = await import('../../src/auth');
const { disciplineIncidents } = await import('../../src/modules/discipline/disciplineSchema');
const { parents } = await import('../../src/modules/parents/parentSchema');
const { studentParents } = await import('../../src/modules/students/studentSchema');
const { DisciplineRepository } = await import('../../src/modules/discipline/DisciplineRepository');
const rollback = Symbol('rollback');

const incident = (id: string, studentId: string, reportedBy: string) => ({
  id, studentId, reportedBy,
  classId: 'history-class-2026', sectionId: 'history-section-2026-a',
  incidentAt: '2026-09-15T09:00:00.000Z', category: 'disrespect' as const, severity: 'low' as const,
  description: `History incident ${id}`, status: 'open' as const,
});

describe('Discipline ownership on the marked PostgreSQL fixture', () => {
  it('shows staff every incident, a teacher those they reported, a student their own and a parent their children\'s', async () => {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(disciplineIncidents).values([
          incident('history-incident-adam', 'history-student-01', 'history-admin'),
          incident('history-incident-salma', 'history-student-02', 'history-principal'),
          incident('history-incident-nour', 'history-student-10', 'history-admin'),
        ]);
        await tx.insert(usersTable).values({ id: 'history-parent-conduct-user', name: 'Rachid El Amrani',
          status: 'active', email: 'history-parent-conduct@history.example.test', password: crypto.randomUUID() });
        await tx.insert(parents).values({ id: 'history-parent-conduct', userId: 'history-parent-conduct-user',
          name: 'Rachid El Amrani', relationshipType: 'father' });
        await tx.insert(studentParents).values([
          { id: 'history-link-conduct-01', studentId: 'history-student-01', parentId: 'history-parent-conduct' },
          { id: 'history-link-conduct-02', studentId: 'history-student-02', parentId: 'history-parent-conduct' },
        ]);

        const { repo, inYear } = await scopedHistoryRepository(DisciplineRepository, tx as unknown as typeof db);
        const seen = async (actor: { id: string; role: string }) =>
          (await inYear('history-year-2026', () => repo.list(), actor)).map((row) => row.id).sort();

        expect(await seen({ id: 'history-admin', role: 'admin' }))
          .toEqual(['history-incident-adam', 'history-incident-nour', 'history-incident-salma']);
        expect(await seen({ id: 'history-principal', role: 'teacher' })).toEqual(['history-incident-salma']);
        expect(await seen({ id: 'history-student-01-user', role: 'student' })).toEqual(['history-incident-adam']);
        expect(await seen({ id: 'history-parent-conduct-user', role: 'parent' }))
          .toEqual(['history-incident-adam', 'history-incident-salma']);
        expect(await seen({ id: 'history-unlinked-user', role: 'parent' })).toEqual([]);
        expect(await seen({ id: 'history-student-01-user', role: 'custom-role' })).toEqual([]);
        // A record the reader cannot see is not found, rather than refused.
        expect(await inYear('history-year-2026', () => repo.getById('history-incident-nour'),
          { id: 'history-parent-conduct-user', role: 'parent' })).toBeUndefined();
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(await db.select().from(disciplineIncidents)).toEqual([]);
  });
});
