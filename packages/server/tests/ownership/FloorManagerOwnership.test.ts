import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, setSystemTime } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, SCHOOL_WIDE_ROLES } from '../../src/auth';
import { Alert, AlertForAudience, AlertForClass, AlertForTeacher } from '../../src/modules/alerts/AlertGuards';
import { Announcement, AnnouncementForClass } from '../../src/modules/announcements/AnnouncementGuards';
import { Assessment } from '../../src/modules/assessments/AssessmentGuards';
import { Attendance } from '../../src/modules/attendance/AttendanceGuards';
import { BehaviorReward } from '../../src/modules/behaviorRewards/BehaviorRewardGuards';
import { Class } from '../../src/modules/classes/ClassGuards';
import { Discipline } from '../../src/modules/discipline/DisciplineGuards';
import { Event } from '../../src/modules/events/EventGuards';
import { Exam } from '../../src/modules/exams/ExamGuards';
import { Grade } from '../../src/modules/grades/GradeGuards';
import { Parent } from '../../src/modules/parents/ParentGuards';
import { Section } from '../../src/modules/sections/SectionGuards';
import { Student, studentReachedInYear } from '../../src/modules/students/StudentGuards';
import { Teacher } from '../../src/modules/teachers/TeacherGuards';

const db = drizzle(async () => ({ rows: [] })) as any;
const MANAGER = 'manager-1';

function signedIn(role: string, id = MANAGER) {
  return { hasActiveContext: () => true, getUser: () => ({ id, role }) } as any;
}

function render(table: any, condition: unknown) {
  return db.select().from(table).where(condition).toSQL() as { sql: string; params: unknown[] };
}

const read = (token: any) => render(token.table, ownershipCondition(db, [token], signedIn('floor_manager')));

// The business day the assignment must hold on.
beforeAll(() => {
  process.env.TZ = 'UTC';
  setSystemTime(new Date('2026-03-15T10:30:00.000Z'));
});
afterAll(() => setSystemTime());

describe('floor manager ownership', () => {
  it('is not school-wide, unlike the surveillant général', () => {
    expect(SCHOOL_WIDE_ROLES).not.toContain('floor_manager');
    expect(SCHOOL_WIDE_ROLES).toContain('supervisor');
  });

  it('reads every resource it is granted only through its own current grade assignments', () => {
    const tokens = [
      Class, Section, Student, Parent, Attendance, Discipline, BehaviorReward, Grade, Exam, Assessment,
      Teacher, Event, Alert, AlertForClass, AnnouncementForClass,
    ];
    for (const token of tokens) {
      const { sql, params } = read(token);
      expect(sql, token.name).toContain('from floor_manager_assignments managed_grade');
      expect(sql, token.name).toContain('join staff manager on manager.id = managed_grade.staff_id');
      expect(sql, token.name).toContain("managed_grade.status = 'active'");
      expect(sql, token.name).toContain('managed_grade.start_date is null or managed_grade.start_date <=');
      expect(sql, token.name).toContain('managed_grade.end_date is null or managed_grade.end_date >=');
      expect(params, token.name).toContain(MANAGER);
      expect(params, token.name).toContain('2026-03-15');
    }
  });

  // A grade is a class name, so next year's class of that grade follows
  // without assigning it again.
  it('matches a class by its grade name, not one year\'s class row', () => {
    expect(read(Class).sql).toContain('managed_grade.class_name = "classes"."name"');
    expect(read(Section).sql).toContain('managed_class.id = "sections"."class_id"');
  });

  it('reads student attendance by its section and never staff attendance', () => {
    const { sql } = read(Attendance);
    expect(sql).toContain('"attendance"."student_id" is not null');
    expect(sql).toContain('managed_section.id = "attendance"."section_id"');
  });

  it('reads incidents and rewards of their classes, and those they wrote', () => {
    expect(read(Discipline).sql).toContain('"discipline_incidents"."reported_by" = $');
    expect(read(Discipline).sql).toContain('managed_class.id = "discipline_incidents"."class_id"');
    expect(read(BehaviorReward).sql).toContain('"behavior_rewards"."awarded_by" = $');
    expect(read(BehaviorReward).sql).toContain('managed_class.id = "behavior_rewards"."class_id"');
  });

  it('reads a grade by where the student sat on the source date', () => {
    const { sql } = read(Grade);
    expect(sql).toContain('placement.valid_from <=');
    expect(sql).toContain('managed_class.id = placement.class_id');
  });

  it('keeps private events to their organizer', () => {
    expect(read(Event).sql).toContain(`<> 'private' and`);
  });

  it('reaches staff notices like a teacher, and nothing addressed to one teacher', () => {
    expect(read(AlertForAudience).sql).toContain(`in ('all', $`);
    expect(read(Announcement).sql).toContain('"announcements"."target_audience" in ($');
    expect(read(AlertForTeacher).sql).toContain('1 = 0');
  });

  it('reads a parent only through a child now in one of their classes', () => {
    const { sql } = read(Parent);
    expect(sql).not.toContain('1 = 0');
    expect(sql).toContain('managed_link.parent_id = "parents"."id"');
    expect(sql).toContain('managed_class.id = managed_student.class_id');
    expect(sql).not.toContain('student_enrollment_placements');
  });

  it('narrows a year\'s roster to placements in their classes that year', () => {
    const roster = render(Student.table, studentReachedInYear('year-1', signedIn('floor_manager')));
    expect(roster.sql).toContain('e.academic_year_id = $');
    expect(roster.sql).toContain('managed_class.id = p.class_id');
    expect(roster.params).toContain('year-1');
    expect(studentReachedInYear('year-1', signedIn('supervisor'))).toBeUndefined();
    expect(render(Student.table, studentReachedInYear('year-1', signedIn('teacher'))).sql).toContain('teacher_assignments');
  });
});
