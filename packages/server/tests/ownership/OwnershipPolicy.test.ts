import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ScopeContext, Owned as NajmOwned, ownershipCondition as najmOwnershipCondition } from 'najm-auth';
import { Owned, ownershipCondition, SCHOOL_WIDE_ROLES, own, join, when } from '../../src/auth';
import {
  Alert,
  AlertForAudience,
  AlertForClass,
  AlertForTeacher,
  AlertUnderOwnAssignment,
} from '../../src/modules/alerts/AlertGuards';
import {
  Announcement,
  AnnouncementByAuthor,
  AnnouncementForClass,
} from '../../src/modules/announcements/AnnouncementGuards';
import { alerts, students } from '../../src/database/schema';
import { Assessment } from '../../src/modules/assessments/AssessmentGuards';
import {
  Attendance,
  AttendanceInTaughtSection,
  AttendanceUnderOwnAssignment,
} from '../../src/modules/attendance/AttendanceGuards';
import { BehaviorReward } from '../../src/modules/behaviorRewards/BehaviorRewardGuards';
import { Discipline } from '../../src/modules/discipline/DisciplineGuards';
import { Class } from '../../src/modules/classes/ClassGuards';
import { Exam } from '../../src/modules/exams/ExamGuards';
import { Grade } from '../../src/modules/grades/GradeGuards';
import { Parent } from '../../src/modules/parents/ParentGuards';
import { Section } from '../../src/modules/sections/SectionGuards';
import { Student } from '../../src/modules/students/StudentGuards';
import { Teacher } from '../../src/modules/teachers/TeacherGuards';
import { StudentRepository } from '../../src/modules/students/StudentRepository';

const ALERT_RULES = [Alert, AlertForTeacher, AlertUnderOwnAssignment, AlertForClass, AlertForAudience];
const ANNOUNCEMENT_RULES = [Announcement, AnnouncementForClass, AnnouncementByAuthor];
const TOKENS = [
  ...ALERT_RULES, ...ANNOUNCEMENT_RULES,
  Assessment, Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment,
  BehaviorReward, Class, Discipline, Exam, Grade, Parent, Section, Student, Teacher,
];
const ATTENDANCE_TEACHER_RULES = [Attendance, AttendanceInTaughtSection, AttendanceUnderOwnAssignment];

// An alert without a target audience: reminders go to parents, system alerts to staff only.
const ALERT_AUDIENCE = 'coalesce("alerts"."target_audience", case "alerts"."type" '
  + 'when \'reminder\' then \'parents\' when \'system\' then null else \'all\' end)';
const NAMES_NOBODY = '("alerts"."student_id" is null and "alerts"."teacher_id" is null '
  + 'and "alerts"."teacher_assignment_id" is null)';

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

describe('when() rules', () => {
  it('narrows a join chain by a condition on the owned row', () => {
    const { sql, params } = render(alerts, ownershipCondition(db, [Alert], signedIn('parent')));
    expect(sql).toContain('inner join "student_parents"');
    expect(sql).toContain(`where ("_sc_parents_3"."user_id" = $1 and ${ALERT_AUDIENCE} in ('all', $2))`);
    expect(params).toEqual(['user-1', 'parents']);
  });

  it('is the whole rule when it stands alone, with no join to the user', () => {
    const { sql, params } = render(alerts, ownershipCondition(db, [AlertForAudience], signedIn('teacher')));
    expect(sql).not.toContain('join');
    expect(sql).toContain(`${NAMES_NOBODY} and "alerts"."class_id" is null and ${ALERT_AUDIENCE} in ('all', $1)`);
    expect(params).toEqual(['teachers']);
  });

  it('still requires a join chain to end at the user', () => {
    expect(() => own(alerts).for('parent', join(alerts.studentId, students.id), when(isNull(alerts.classId))))
      .toThrow('Ownership chain must end with where()');
  });

  it('leaves school-wide roles unfiltered and other roles refused', () => {
    expect(ownershipCondition(db, [AlertForAudience], signedIn('principal'))).toBeUndefined();
    expect(render(alerts, ownershipCondition(db, [AlertForAudience], signedIn('custom-role'))).sql).toContain('1 = 0');
  });
});

describe('alert ownership', () => {
  it('gives a teacher five ways to an alert and a parent or student three', () => {
    const count = (role: string) => ownedSubqueries(render(alerts, ownershipCondition(db, ALERT_RULES, signedIn(role))).sql);
    expect(count('teacher')).toBe(5);
    expect(count('parent')).toBe(3);
    expect(count('student')).toBe(3);
  });

  it('reaches an alert that names a teacher only when its audience includes teachers', () => {
    const { sql, params } = render(alerts, ownershipCondition(db, [AlertForTeacher], signedIn('teacher')));
    expect(sql).toContain('inner join "teachers" "_sc_teachers_1" on "alerts"."teacher_id" = "_sc_teachers_1"."id"');
    expect(sql).toContain(`${ALERT_AUDIENCE} in ('all', $2)`);
    expect(params).toEqual(['user-1', 'teachers']);
  });

  it('keeps a class alert that names a person away from the rest of the class', () => {
    // Otherwise every parent in the class would read an alert about one child.
    const { sql } = render(alerts, ownershipCondition(db, [AlertForClass], signedIn('parent')));
    expect(sql).toContain('on "alerts"."class_id" = "_sc_students_1"."class_id"');
    expect(sql).toContain(NAMES_NOBODY);
  });
});

describe('announcement ownership', () => {
  it('shows an audience only live announcements addressed to it', () => {
    const { sql, params } = render(Announcement.table, ownershipCondition(db, [Announcement], signedIn('parent')));
    expect(sql).toContain('"announcements"."is_published" = $1');
    expect(sql).toContain('("announcements"."publish_date" is null or "announcements"."publish_date" <= $2)');
    expect(sql).toContain('("announcements"."expiry_date" is null or "announcements"."expiry_date" > $3)');
    expect(sql).toContain('"announcements"."target_audience" in ($4, $5)');
    expect(params[0]).toBe(true);
    expect(params.slice(3)).toEqual(['all', 'parents']);
  });

  it('reaches a class announcement through the Class rules', () => {
    const { sql, params } = render(Announcement.table, ownershipCondition(db, [AnnouncementForClass], signedIn('parent')));
    expect(sql).toContain('"announcements"."target_audience" = $4');
    expect(sql).toContain('exists (select 1 from (select "classes"."id" from "classes" inner join "students"');
    expect(sql).toContain('"_sc_parents_3"."user_id" = $5) as member_class');
    expect(sql).toContain('"announcements"."class_ids" @> jsonb_build_array(member_class.id)');
    expect(sql).toContain('or "announcements"."class_id" = member_class.id');
    expect(params.slice(3)).toEqual(['class', 'user-1']);
  });

  it('shows authors what they wrote, drafts included', () => {
    const { sql, params } = render(Announcement.table, ownershipCondition(db, [AnnouncementByAuthor], signedIn('teacher')));
    expect(sql).toContain('where "announcements"."user_id" = $1)');
    expect(sql).not.toContain('"announcements"."is_published"');
    expect(params).toEqual(['user-1']);
  });
});

describe('conduct record ownership', () => {
  const CONDUCT = [
    { token: BehaviorReward, table: 'behavior_rewards', author: 'awarded_by' },
    { token: Discipline, table: 'discipline_incidents', author: 'reported_by' },
  ];

  it('gives a teacher the records they wrote', () => {
    for (const { token, table, author } of CONDUCT) {
      const { sql, params } = render(token.table, ownershipCondition(db, [token], signedIn('teacher')));
      expect(sql).toContain(`"${table}"."${author}" = $1`);
      expect(params).toEqual(['user-1']);
    }
  });

  it('gives a student the records about themselves', () => {
    for (const { token, table } of CONDUCT) {
      const { sql, params } = render(token.table, ownershipCondition(db, [token], signedIn('student')));
      expect(sql).toContain(`inner join "students" "_sc_students_1" on "${table}"."student_id" = "_sc_students_1"."id"`);
      expect(sql).toContain('"_sc_students_1"."user_id" = $1');
      expect(params).toEqual(['user-1']);
    }
  });

  it('gives a parent the records about their linked children', () => {
    for (const { token, table } of CONDUCT) {
      const { sql, params } = render(token.table, ownershipCondition(db, [token], signedIn('parent')));
      expect(sql).toContain(`on "${table}"."student_id" = "_sc_students_1"."id"`);
      expect(sql).toContain('inner join "student_parents"');
      expect(sql).toContain('"_sc_parents_3"."user_id" = $1');
      expect(params).toEqual(['user-1']);
    }
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
    expect(outside.ownedWhere()).toBeUndefined();

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
