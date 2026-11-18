import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, ScopeContext } from '../../src/auth';
import { homework, homeworkCompletions } from '../../src/database/schema';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';
import { HomeworkCompletion } from '../../src/modules/homework/HomeworkGuards';
import { HomeworkCompletionRepository } from '../../src/modules/homework/HomeworkCompletionRepository';
import { HomeworkRepository } from '../../src/modules/homework/HomeworkRepository';
import { saveHomeworkCompletionsDto } from '../../src/modules/homework/HomeworkDto';

/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE = ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'registrar'];
const YEAR = { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };

const db = drizzle(async () => ({ rows: [] }));
const signedIn = (role: string) => ({ hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) }) as any;
// A follow-up is always read with its homework joined, as the repository reads it.
const condition = (role: string) => db.select({ id: homeworkCompletions.id }).from(homeworkCompletions)
  .innerJoin(homework, sql`true`)
  .where(ownershipCondition(db, [HomeworkCompletion], signedIn(role))).toSQL();

describe('who a homework follow-up belongs to', () => {
  it('a teacher: the follow-up of their own homework', () => {
    const { sql, params } = condition('teacher');
    expect(sql).toContain('where assignment.id = "homework"."teacher_assignment_id" and member.user_id = $');
    expect(params).toContain('user-1');
  });

  it('a monitor and a supervisor: homework that targets a section of their classes', () => {
    expect(condition('monitor').sql).toContain('monitor_assignments');
    expect(condition('supervisor').sql).toContain('supervisor_assignments');
  });

  // A family must never read the rest of the class's follow-up, only its own child's.
  it('a parent and a pupil: their own child, or themselves, never the class', () => {
    const parent = condition('parent');
    expect(parent.sql).toContain('"homework_completions"."student_id"');
    expect(parent.sql).toContain('"student_parents"');
    expect(parent.sql).toMatch(/where "\w+"\."user_id" = \$1/);
    expect(parent.sql).not.toContain('student_enrollment_placements');

    const student = condition('student');
    expect(student.sql).toContain('"homework_completions"."student_id"');
    expect(student.sql).not.toContain('student_parents');
    expect(student.params).toContain('user-1');
  });

  it('the school-wide roles: every row; any other role: none', () => {
    for (const role of SCHOOL_WIDE) expect(condition(role).sql, role).not.toContain('1 = 0');
    for (const role of ['custom-role', 'nurse']) expect(condition(role).sql, role).toContain('1 = 0');
  });
});

async function capture<T>(Repository: new () => T, role: string, read: (repository: T) => Promise<unknown>) {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const container = Container.create();
  registerYearPropertyInjector(container);
  container.set(ScopeContext as any);
  container.set(Repository as any);
  const repository = await container.resolve(Repository as any) as T & { db: unknown };
  repository.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; }) as any;
  await container.run({ user: { id: 'user-1', role } }, () => runWithResolvedYear(container, YEAR as any, () => read(repository)));
  return statements;
}

describe('missed homework reads', () => {
  it('keep ownership, the year, the missed statuses and the pupil filter in one WHERE', async () => {
    for (const role of ['teacher', 'monitor', 'supervisor', 'student', 'parent']) {
      const [statement, ...others] = await capture(HomeworkCompletionRepository, role, (repository) => repository.missed({ studentId: 'student-1' }));
      expect(others, role).toEqual([]);
      const outer = statement.sql.slice(statement.sql.lastIndexOf('left join "subjects"'));
      expect(outer.match(/ where /g)?.length ?? 0, role).toBeGreaterThan(0);
      expect(outer, role).toContain('"homework"."academic_year_id" = $');
      expect(outer, role).toContain('"homework_completions"."status" in ($');
      expect(statement.params, role).toEqual(expect.arrayContaining(['user-1', 'year-1', 'student-1', 'incomplete', 'not_done']));
      expect(statement.params, role).not.toContain('done');
    }
  });

  it('save one row per pupil and homework, replacing what was recorded', async () => {
    const [statement] = await capture(HomeworkCompletionRepository, 'teacher', (repository) => repository.save('hw-1', [
      { studentId: 'student-1', status: 'not_done', note: 'Cahier oublié' },
      { studentId: 'student-2', status: 'done' },
    ], 'user-1'));
    expect(statement.sql).toStartWith('insert into "homework_completions"');
    expect(statement.sql).toContain('on conflict ("homework_id","student_id") do update');
    expect(statement.params).toEqual(expect.arrayContaining(['hw-1', 'student-1', 'not_done', 'Cahier oublié', 'student-2', 'done', 'user-1']));
  });

  it('save nothing for an empty follow-up', async () => {
    expect(await capture(HomeworkCompletionRepository, 'teacher', (repository) => repository.save('hw-1', [], 'user-1'))).toEqual([]);
  });
});

describe('the homework list carries the follow-up for its reader', () => {
  it('a parent: each child\'s own record, joined on that child', async () => {
    const [statement] = await capture(HomeworkRepository, 'parent', (repository) => repository.getAll({}, { parentUserId: 'user-1' }));
    expect(statement.sql).toContain('left join homework_completions completion on completion.homework_id = "homework"."id"\n    and completion.student_id = student.id');
    expect(statement.sql).not.toContain("count(*) filter (where completion.status = 'not_done')");
  });

  it('a pupil: their own record only', async () => {
    const [statement] = await capture(HomeworkRepository, 'student', (repository) => repository.getAll({}, { studentUserId: 'user-1' }));
    expect(statement.sql).toContain('where completion.homework_id = "homework"."id" and student.user_id = $');
  });

  it('staff: the counts, not the pupils', async () => {
    const [statement] = await capture(HomeworkRepository, 'teacher', (repository) => repository.getAll({}, { counts: true }));
    expect(statement.sql).toContain("count(*) filter (where completion.status = 'not_done')");
    expect(statement.sql).not.toContain('student.user_id = $');
  });
});

describe('the follow-up body', () => {
  it('takes each pupil with a known status and a short remark', () => {
    expect(saveHomeworkCompletionsDto.safeParse({ entries: [{ studentId: 's-1', status: 'incomplete', note: ' Exercice 2 manquant ' }] }).data)
      .toEqual({ entries: [{ studentId: 's-1', status: 'incomplete', note: 'Exercice 2 manquant' }] });
    expect(saveHomeworkCompletionsDto.safeParse({ entries: [{ studentId: 's-1', status: 'absent' }] }).success).toBe(false);
    expect(saveHomeworkCompletionsDto.safeParse({ entries: [{ studentId: 's-1', status: 'done', note: 'x'.repeat(301) }] }).success).toBe(false);
    expect(saveHomeworkCompletionsDto.safeParse({ entries: [{ status: 'done' }] }).success).toBe(false);
  });
});
