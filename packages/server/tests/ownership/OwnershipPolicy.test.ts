import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ScopeContext, Owned as NajmOwned, ownershipCondition as najmOwnershipCondition } from 'najm-auth';
import { Owned, ownershipCondition, SCHOOL_WIDE_ROLES } from '../../src/auth';
import { Assessment } from '../../src/modules/assessments/AssessmentGuards';
import {
  Attendance,
  AttendanceInTaughtSection,
  AttendanceUnderOwnAssignment,
} from '../../src/modules/attendance/AttendanceGuards';
import { BehaviorReward } from '../../src/modules/behaviorRewards/BehaviorRewardGuards';
import { Class } from '../../src/modules/classes/ClassGuards';
import { Exam } from '../../src/modules/exams/ExamGuards';
import { Grade } from '../../src/modules/grades/GradeGuards';
import { Parent } from '../../src/modules/parents/ParentGuards';
import { Section } from '../../src/modules/sections/SectionGuards';
import { Student } from '../../src/modules/students/StudentGuards';
import { Teacher } from '../../src/modules/teachers/TeacherGuards';
import { StudentRepository } from '../../src/modules/students/StudentRepository';

const TOKENS = [
  Assessment, Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment,
  BehaviorReward, Class, Exam, Grade, Parent, Section, Student, Teacher,
];
const ATTENDANCE_TEACHER_RULES = [Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment];

const db = drizzle(async () => ({ rows: [] })) as any;

function signedIn(role: string, id = 'user-1') {
  return { hasActiveContext: () => true, getUser: () => ({ id, role }) } as any;
}

function render(table: any, condition: unknown) {
  return db.select().from(table).where(condition).toSQL() as { sql: string; params: unknown[] };
}

function ownedSubqueries(sql: string) {
  return sql.match(/"id" in \(select/g)?.length ?? 0;
}

describe('school-wide ownership roles', () => {
  it('pins the staff roles that read owned resources school-wide', () => {
    // Changing this list changes who can read every student, grade and
    // attendance row. Teacher, parent and student stay ownership-scoped.
    expect([...SCHOOL_WIDE_ROLES].sort()).toEqual([
      'accounting', 'admin', 'assistant', 'counselor', 'driver',
      'librarian', 'nurse', 'principal', 'secretary',
    ]);
    expect(SCHOOL_WIDE_ROLES).not.toContain('teacher');
    expect(SCHOOL_WIDE_ROLES).not.toContain('parent');
    expect(SCHOOL_WIDE_ROLES).not.toContain('student');
  });

  it('lets every school-wide role read every owned resource unfiltered', () => {
    for (const role of SCHOOL_WIDE_ROLES) {
      for (const token of TOKENS) {
        expect(ownershipCondition(db, [token], signedIn(role))).toBeUndefined();
      }
    }
  });

  it('refuses a role that is neither school-wide nor given a rule', () => {
    const { sql } = render(Student.table, ownershipCondition(db, [Student], signedIn('custom-role')));
    expect(sql).toContain('1 = 0');
  });
});

describe('ownershipCondition', () => {
  it('leaves reads outside a request unscoped, as najm-auth did', () => {
    expect(ownershipCondition(db, [Student], undefined)).toBeUndefined();
    const inactive = { hasActiveContext: () => false, getUser: () => ({ id: 'user-1', role: 'parent' }) } as any;
    expect(ownershipCondition(db, [Student], inactive)).toBeUndefined();
  });

  it('refuses a request without a signed-in user', () => {
    const anonymous = { hasActiveContext: () => true, getUser: () => null } as any;
    expect(render(Student.table, ownershipCondition(db, [Student], anonymous)).sql).toContain('1 = 0');
  });

  it('limits a parent to linked children with one id subquery', () => {
    const { sql, params } = render(Student.table, ownershipCondition(db, [Student], signedIn('parent')));
    expect(sql).toContain('where "students"."id" in (select "students"."id" from "students"');
    expect(sql).toContain('inner join "student_parents"');
    expect(sql).toContain('"_sc_parents_2"."user_id" = $1');
    expect(params).toEqual(['user-1']);
  });

  it('gives a teacher own staff attendance or student attendance in taught sections', () => {
    const { sql, params } = render(
      Attendance.table,
      ownershipCondition(db, ATTENDANCE_TEACHER_RULES, signedIn('teacher')),
    );
    expect(ownedSubqueries(sql)).toBe(3);
    expect(sql.match(/\) or "attendance"\."id" in \(select/g)).toHaveLength(2);
    expect(sql).toContain('"attendance"."staff_id" = "_sc_staff_1"."id"');
    expect(sql).toContain('"attendance"."section_id" = "_sc_teacher_assignments_2"."section_id"');
    expect(sql).toContain('"attendance"."teacher_assignment_id" = "_sc_teacher_assignments_2"."id"');
    expect(params).toEqual(['user-1', 'user-1', 'user-1']);
  });

  it('keeps the taught-section alternatives to student rows', () => {
    for (const token of [AttendanceInTaughtSection, AttendanceUnderOwnAssignment]) {
      const { sql } = render(Attendance.table, ownershipCondition(db, [token], signedIn('teacher')));
      // The inner join on students excludes staff rows, so a teacher assigned
      // to a section never reads a colleague's staff attendance.
      expect(sql).toContain('inner join "students" "_sc_students_1" on "attendance"."student_id" = "_sc_students_1"."id"');
    }
  });

  it('does not widen a parent through the teacher-only attendance alternatives', () => {
    const { sql } = render(
      Attendance.table,
      ownershipCondition(db, ATTENDANCE_TEACHER_RULES, signedIn('parent')),
    );
    expect(ownedSubqueries(sql)).toBe(1);
    expect(sql).toContain('"_sc_parents_3"."user_id" = $1');
  });

  it('refuses a scoped role on a resource where it has no rule', () => {
    // Teacher profiles have rules only for teachers; parents see none.
    expect(render(Teacher.table, ownershipCondition(db, [Teacher], signedIn('parent'))).sql).toContain('1 = 0');
  });
});

describe('Owned repository wiring', () => {
  it('uses the published Najm ownership engine directly', () => {
    expect(Owned).toBe(NajmOwned);
    expect(ownershipCondition).toBe(najmOwnershipCondition);
  });

  it('injects the request user through the container and scopes inside a request only', async () => {
    const container = new Container();
    container.set(ScopeContext as any, {});
    container.set(StudentRepository as any, {});

    const outside: any = await container.resolve(StudentRepository as any);
    expect(outside._scopeCtx).toBeInstanceOf(ScopeContext);
    outside.db = db;
    expect(outside.ownershipCondition()).toBeUndefined();

    const statements: string[] = [];
    await container.run({ requestId: 'request-1', user: { id: 'parent-user', role: 'parent' } } as any, async () => {
      const repo: any = await container.resolve(StudentRepository as any);
      repo.db = drizzle(async (sql) => { statements.push(sql); return { rows: [] }; });
      await repo.getById('student-9');
    });
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('"students"."id" in (select "students"."id" from "students"');
    expect(statements[0]).toContain('and "students"."id" = $2');
  });
});
