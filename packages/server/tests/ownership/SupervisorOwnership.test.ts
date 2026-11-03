import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, SCHOOL_WIDE_ROLES } from '../../src/auth';
import { Alert, AlertForClass } from '../../src/modules/alerts/AlertGuards';
import { AnnouncementForClass } from '../../src/modules/announcements/AnnouncementGuards';
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
const context = { hasActiveContext: () => true, getUser: () => ({ id: 'supervisor-1', role: 'supervisor' }) } as any;

describe('supervisor class assignments', () => {
  it('requires assignments instead of granting school-wide access', () => {
    expect(SCHOOL_WIDE_ROLES).not.toContain('supervisor');
    for (const token of [Class, Section, Student, Parent, Teacher, Attendance, Discipline,
      BehaviorReward, Grade, Exam, Assessment, Event, Alert, AlertForClass, AnnouncementForClass]) {
      const condition = ownershipCondition(db, [token], context);
      expect(condition, token.name).toBeDefined();
      const { sql, params } = db.select().from(token.table).where(condition).toSQL();
      expect(sql, token.name).toContain('supervisor_assignments');
      expect(sql, token.name).toContain("supervised.status = 'active'");
      expect(sql, token.name).toContain('supervised.start_date is null or supervised.start_date <=');
      expect(sql, token.name).toContain('supervised.end_date is null or supervised.end_date >=');
      expect(params, token.name).toContain('supervisor-1');
    }
  });

  it('narrows historical rosters to an assigned class in that year', () => {
    const condition = studentReachedInYear('year-1', context);
    expect(condition).toBeDefined();
    const { sql, params } = db.select().from(Student.table).where(condition).toSQL();
    expect(sql).toContain('supervised.class_id = p.class_id');
    expect(sql).toContain('e.academic_year_id =');
    expect(params).toContain('year-1');
  });

  it('does not retain access to incidents solely because the supervisor wrote them', () => {
    for (const token of [Discipline, BehaviorReward]) {
      const { sql } = db.select().from(token.table).where(ownershipCondition(db, [token], context)).toSQL();
      expect(sql).not.toContain('"reported_by" =');
      expect(sql).not.toContain('"awarded_by" =');
    }
  });
});
