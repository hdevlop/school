import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, ScopeContext } from '../../src/auth';
import { homework } from '../../src/database/schema';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';
import { Homework, HomeworkForPlacedParent, HomeworkForPlacedStudent } from '../../src/modules/homework/HomeworkGuards';
import { HomeworkRepository } from '../../src/modules/homework/HomeworkRepository';
import { HomeworkAttachmentRepository } from '../../src/modules/homework/HomeworkAttachmentRepository';

const TOKENS = [Homework, HomeworkForPlacedStudent, HomeworkForPlacedParent];
/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE = ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'registrar'];
const YEAR = { id: 'year-1', label: '2026-2027', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };

const db = drizzle(async () => ({ rows: [] }));
const signedIn = (role: string) => ({ hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) }) as any;
const condition = (role: string) =>
  db.select({ id: homework.id }).from(homework).where(ownershipCondition(db, TOKENS, signedIn(role))).toSQL();

describe('who a homework belongs to', () => {
  it('a teacher: the homework of their own assignments', () => {
    const { sql, params } = condition('teacher');
    expect(sql).toContain('"homework"."teacher_assignment_id"');
    expect(sql).toContain('"teacher_assignments"');
    expect(sql).toMatch(/inner join "staff" "\w+" on .+ where "\w+"\."user_id" = \$1/);
    expect(params).toContain('user-1');
    expect(sql).not.toContain('student_enrollments');
  });

  it('a monitor and a supervisor: homework that targets a section of their classes', () => {
    const monitor = condition('monitor');
    expect(monitor.sql).toContain('jsonb_array_elements_text(coalesce("homework"."section_ids"');
    expect(monitor.sql).toContain('monitor_assignments');
    const supervisor = condition('supervisor');
    expect(supervisor.sql).toContain('jsonb_array_elements_text(coalesce("homework"."section_ids"');
    expect(supervisor.sql).toContain('supervisor_assignments');
    expect(supervisor.sql).not.toContain('monitor_assignments');
    for (const { params } of [monitor, supervisor]) expect(params).toContain('user-1');
  });

  it('a pupil and a parent: homework of a section the pupil sat in on the day it was given', () => {
    const student = condition('student');
    expect(student.sql).toContain('student.user_id = $');
    expect(student.sql).toContain('placement.valid_from <= "homework"."date"');
    expect(student.sql).toContain('(placement.valid_to is null or placement.valid_to > "homework"."date")');
    expect(student.sql).toContain('enrollment.academic_year_id = "homework"."academic_year_id"');
    expect(student.sql).toContain('@> jsonb_build_array(placement.section_id)');
    expect(student.sql).not.toContain('student_parents');

    const parent = condition('parent');
    expect(parent.sql).toContain('join student_parents link on link.student_id = student.id');
    expect(parent.sql).toContain('parent.user_id = $');
    expect(parent.sql).toContain('placement.valid_from <= "homework"."date"');
    expect(parent.params).toContain('user-1');
  });

  it('the school-wide roles: every row; any other role: none', () => {
    for (const role of SCHOOL_WIDE) {
      const { sql } = condition(role);
      expect(sql, role).not.toContain('teacher_assignments');
      expect(sql, role).not.toContain('1 = 0');
    }
    for (const role of ['custom-role', 'nurse']) expect(condition(role).sql, role).toContain('1 = 0');
  });
});

describe('homework reads', () => {
  async function capture(role: string, read: (repository: HomeworkRepository) => Promise<unknown>) {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const container = Container.create();
    registerYearPropertyInjector(container);
    container.set(ScopeContext as any);
    container.set(HomeworkRepository);
    const repository = await container.resolve(HomeworkRepository);
    repository.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; }) as any;
    await container.run({ user: { id: 'user-1', role } }, () => runWithResolvedYear(container, YEAR as any, () => read(repository)));
    return statements;
  }

  it('refuse to run outside a selected year', async () => {
    const container = Container.create();
    registerYearPropertyInjector(container);
    container.set(ScopeContext as any);
    container.set(HomeworkRepository);
    const repository = await container.resolve(HomeworkRepository);
    repository.db = drizzle(async () => ({ rows: [] })) as any;
    await expect(repository.getAll()).rejects.toThrow('Resolved academic year is missing');
  });

  // Ownership, the year and the read's own filter are one WHERE: a second
  // .where() would silently replace the first.
  it.each([
    ['getAll', (repository: HomeworkRepository) => repository.getAll(), []],
    ['getAll for a section', (repository: HomeworkRepository) => repository.getAll({ sectionId: 'section-1' }), ['section-1']],
    ['getAll for a student', (repository: HomeworkRepository) => repository.getAll({ studentId: 'student-1' }), ['student-1']],
    ['getById', (repository: HomeworkRepository) => repository.getById('hw-1'), ['hw-1']],
  ] as const)('%s keeps ownership, the year and its filter in one condition, for every limited role', async (_name, read, filters) => {
    for (const role of ['teacher', 'monitor', 'supervisor', 'student', 'parent']) {
      const [statement, ...others] = await capture(role, read);
      expect(others, role).toEqual([]);
      expect(statement.sql.match(/ where /g)?.length ?? 0, role).toBeGreaterThan(0);
      // The outer WHERE holds the reader, the year and the filter together.
      const outer = statement.sql.slice(statement.sql.lastIndexOf('left join "classes"'));
      expect(outer, role).toContain('"homework"."academic_year_id" = $');
      expect(statement.params, role).toEqual(expect.arrayContaining(['user-1', 'year-1', ...filters]));
      if (role === 'teacher') expect(outer).toMatch(/inner join "staff" "\w+" on .+ where "\w+"\."user_id" = \$1/);
      if (role === 'student') expect(outer).toContain('student.user_id = $');
      if (role === 'parent') expect(outer).toContain('parent.user_id = $');
    }
  });

  it('give a parent only their own children and their own confirmations', async () => {
    const [statement] = await capture('parent', (repository) => repository.getAll({}, { parentUserId: 'user-1' }));
    expect(statement.sql).toContain('seen.parent_user_id = $');
    expect(statement.sql).toContain('where parent.user_id = $');
    expect(statement.sql).not.toContain('count(distinct seen.student_id)');
    // The reader's id is the only user id anywhere in the statement.
    expect(statement.params.filter((value) => typeof value === 'string' && value.startsWith('user-'))
      .every((value) => value === 'user-1')).toBe(true);
  });

  it('give staff the count of families that saw it, and no child list', async () => {
    const [statement] = await capture('teacher', (repository) => repository.getAll({}, { counts: true }));
    expect(statement.sql).toContain('count(distinct seen.student_id)');
    expect(statement.sql).toContain('count(distinct enrollment.student_id)');
    expect(statement.sql).not.toContain('seen.parent_user_id');
  });

  it('never send the stored path of a file', async () => {
    const [statement] = await capture('teacher', (repository) => repository.getAll());
    expect(statement.sql).toContain('from homework_attachments attachment');
    expect(statement.sql).not.toContain('file_hash');
  });

  it('write only inside the selected year', async () => {
    const updates = await capture('teacher', (repository) => repository.update('hw-1', { title: 'New title' }));
    expect(updates[0].sql).toStartWith('update "homework"');
    expect(updates[0].params).toEqual(expect.arrayContaining(['hw-1', 'year-1']));
    const deletes = await capture('teacher', (repository) => repository.delete('hw-1'));
    expect(deletes[0].sql).toStartWith('delete from "homework"');
    expect(deletes[0].params).toEqual(expect.arrayContaining(['hw-1', 'year-1']));
    const inserts = await capture('teacher', (repository) => repository.create({ teacherAssignmentId: 'ta-1', date: '2026-11-13', title: 'Ex. 4' } as any).catch(() => null));
    expect(inserts[0].sql).toStartWith('insert into "homework"');
    expect(inserts[0].params).toContain('year-1');
  });
});

describe('the teacher quota', () => {
  it('sums the files a teacher still holds in one year', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repository = new HomeworkAttachmentRepository();
    repository.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; }) as any;
    expect(await repository.liveBytesOfTeacher('teacher-1', 'year-1')).toBe(0);
    const [{ sql, params }] = statements;
    expect(sql).toContain('"homework_attachments"."purged_at" is null');
    expect(sql).toContain('"teacher_assignments"."teacher_id" = $');
    expect(sql).toContain('"homework"."academic_year_id" = $');
    expect(params).toEqual(['teacher-1', 'year-1']);
  });
});
