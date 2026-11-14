import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { TeacherService } from '../../src/modules/teachers/TeacherService';
import { TeacherValidator } from '../../src/modules/teachers/TeacherValidator';
import { withEnglishMessages } from '../support/englishMessages';

// The teacher teaches Français and Informatique in CM1 · B; six exams and two
// homework were kept under Français. Saving the record without Français.
const NONE = { exams: 0, assessments: 0, attendance: 0, lessons: 0, homework: 0 };
const UNDER: Record<string, typeof NONE> = { SB01: { ...NONE, exams: 6, homework: 2 }, SB09: NONE };

function harness() {
  const deleted: string[] = [];
  const vacated: string[] = [];
  const repository = {
    getAssignmentRows: async () => [
      { classId: 'cm1', sectionId: 'cm1-b', subjectId: 'SB01' },
      { classId: 'cm1', sectionId: 'cm1-b', subjectId: 'SB09' },
    ],
    recordsUnderAssignment: async (_teacher: string, _section: string, subjectId: string) => ({
      className: 'CM1', sectionName: 'B', subjectName: subjectId === 'SB01' ? 'Français' : 'Informatique', records: UNDER[subjectId],
    }),
    vacateAssignment: async (_teacher: string, _section: string, subjectId: string) => { vacated.push(subjectId); },
    deleteAssignment: async (_teacher: string, _section: string, subjectId: string) => { deleted.push(subjectId); },
    createAssignment: async () => {},
  };
  const validator = withEnglishMessages(new TeacherValidator(repository as any, {} as any, {} as any, {} as any, {} as any));
  const service = new TeacherService(repository as any, validator, {} as any, {} as any, {} as any, {} as any);
  const replace = (subjectIds: string[], role?: string) =>
    (service as any).replaceTeacherAssignments('teacher', [{ classId: 'cm1', sectionIds: ['cm1-b'], subjectIds }], role);
  return { replace, deleted, vacated };
}

describe('taking an assignment from a teacher', () => {
  it('as an administrator, hands an assignment with records to the class’s vacant slot instead of deleting it', async () => {
    const { replace, deleted, vacated } = harness();
    await replace([], 'admin');
    expect(vacated).toEqual(['SB01']);
    expect(deleted).toEqual(['SB09']);
  });

  it('as anyone else, is refused, naming the class, the subject, what was recorded and who can do it', async () => {
    const { replace, deleted, vacated } = harness();
    const refusal = await replace(['SB09'], 'principal').catch((error: any) => error);
    expect(refusal.status ?? refusal.statusCode).toBe(409);
    expect(refusal.message).toBe('Français in CM1 · B cannot be taken from this teacher: records are kept under it (exams (6), homework (2)). '
      + 'An administrator can remove it; the records then stay with the class for the next teacher of the subject.');
    expect(deleted).toEqual([]);
    expect(vacated).toEqual([]);
  });

  it('deletes an assignment nothing was recorded under, whoever saves', async () => {
    const { replace, deleted } = harness();
    await replace(['SB01'], 'principal');
    expect(deleted).toEqual(['SB09']);
  });
});

describe('the vacant slot', () => {
  const capture = (slot: boolean) => {
    const statements: string[] = [];
    const repo = new TeacherRepository();
    (repo as any).year = { id: 'year-1', label: '2026-2027' };
    repo.db = drizzle(async (sql) => {
      statements.push(sql);
      if (sql.startsWith('select') && sql.includes('"teacher_assignments"."teacher_id" = $')) return { rows: [['ta-1', 'cm1']] };
      if (sql.startsWith('select') && sql.includes('"teacher_assignments"."teacher_id" is null')) return { rows: slot ? [['slot-1']] : [] };
      return { rows: [] };
    }) as any;
    return { statements, repo };
  };

  it('is the assignment itself, without its teacher, when the class has none yet: its records do not move', async () => {
    const { statements, repo } = capture(false);
    expect(await repo.vacateAssignment('teacher', 'cm1-b', 'SB01')).toBe('ta-1');
    const writes = statements.filter((sql) => !sql.startsWith('select'));
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/^update "teacher_assignments" set "teacher_id" = \$1/);
  });

  it('takes every record of the assignment when the class already has one, and the assignment goes', async () => {
    const { statements, repo } = capture(true);
    expect(await repo.vacateAssignment('teacher', 'cm1-b', 'SB01')).toBe('slot-1');
    const writes = statements.filter((sql) => !sql.startsWith('select')).map((sql) => sql.match(/^(update|delete from) "(\w+)"/)?.slice(1).join(' '));
    expect(writes).toEqual([
      'update exams', 'update assessments', 'update attendance', 'update routine_entries', 'update homework',
      'update massar_sheets', 'update alerts', 'delete from teacher_assignments',
    ]);
  });
});
