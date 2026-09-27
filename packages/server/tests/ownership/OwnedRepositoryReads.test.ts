import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AssessmentRepository } from '../../src/modules/assessments/AssessmentRepository';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { BehaviorRewardRepository } from '../../src/modules/behaviorRewards/BehaviorRewardRepository';
import { ClassRepository } from '../../src/modules/classes/ClassRepository';
import { ExamRepository } from '../../src/modules/exams/ExamRepository';
import { GradeRepository } from '../../src/modules/grades/GradeRepository';
import { ParentRepository } from '../../src/modules/parents/ParentRepository';
import { SectionRepository } from '../../src/modules/sections/SectionRepository';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { StudentProfileService } from '../../src/modules/profiles/StudentProfileService';

type Read = [name: string, create: () => any, method: string, args: unknown[]];

const YEAR = { id: 'year-old', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

function signedIn(role: string) {
  return { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
}

// Runs one repository read as `role` against a SQL-capturing driver and
// returns the last statement (a few reads look up a helper row first).
async function lastStatement(create: () => any, method: string, args: unknown[], role: string) {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repo = create();
  repo.db = drizzle(async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; });
  repo._scopeCtx = signedIn(role);
  await repo[method](...args);
  return statements.at(-1)!;
}

// The string values a read was asked to filter by, including those inside a
// filters object such as { year, sectionId }.
function filterValues(args: unknown[]): string[] {
  return args.flatMap((arg) => typeof arg === 'string' ? [arg]
    : arg && typeof arg === 'object' ? filterValues(Object.values(arg)) : []);
}

// Without joins Drizzle leaves the subquery's column unqualified.
const OWNED_ID_SUBQUERY = /"(\w+)"\."id" in \(select (?:"\1"\.)?"id" from "\1"/;

// Every read that returns owned rows to a route or MCP tool. Apart from the
// unfiltered getAll lists, each either lost ownership to a second .where() or
// never applied it.
const OWNED_READS: Read[] = [
  ['assessments getById', () => new AssessmentRepository(), 'getById', ['id-1']],
  ['assessments getAll in a year', () => new AssessmentRepository(), 'getAll', [{ year: YEAR }]],
  ['assessments getUpcoming', () => new AssessmentRepository(), 'getUpcoming', []],
  ['assessments getDueThisWeek', () => new AssessmentRepository(), 'getDueThisWeek', []],
  ['assessments getOverdue', () => new AssessmentRepository(), 'getOverdue', []],
  ['assessments getByType', () => new AssessmentRepository(), 'getByType', ['quiz']],
  ['assessments getByStatus', () => new AssessmentRepository(), 'getByStatus', ['scheduled']],
  ['assessments getAll for a section', () => new AssessmentRepository(), 'getAll', [{ year: YEAR, sectionId: 'section-1' }]],
  ['assessments getByTeacherAssignment', () => new AssessmentRepository(), 'getByTeacherAssignment', ['ta-1']],
  ['assessments getAll for a subject', () => new AssessmentRepository(), 'getAll', [{ year: YEAR, subjectId: 'subject-1' }]],
  ['assessments getAll for a teacher', () => new AssessmentRepository(), 'getAll', [{ year: YEAR, teacherId: 'teacher-1' }]],
  ['assessments getTodayAssessments', () => new AssessmentRepository(), 'getTodayAssessments', []],
  ['assessments getAll for a class', () => new AssessmentRepository(), 'getAll', [{ year: YEAR, classId: 'class-1' }]],
  ['attendance getAll in a year', () => new AttendanceRepository(), 'getAll', [{ year: YEAR }]],
  ['attendance getAll by type', () => new AttendanceRepository(), 'getAll', [{ year: YEAR, type: 'student' }]],
  ['attendance getById', () => new AttendanceRepository(), 'getById', ['id-1']],
  ['attendance getAll for a student', () => new AttendanceRepository(), 'getAll', [{ year: YEAR, studentId: 'student-1' }]],
  ['attendance getAll for a staff member', () => new AttendanceRepository(), 'getAll', [{ year: YEAR, staffId: 'staff-1' }]],
  ['attendance getByTeacher in a year', () => new AttendanceRepository(), 'getByTeacher', ['teacher-1', YEAR]],
  ['attendance getByDate', () => new AttendanceRepository(), 'getByDate', ['2026-09-25', 'student']],
  ['attendance getAll for a section', () => new AttendanceRepository(), 'getAll', [{ year: YEAR, sectionId: 'section-1' }]],
  ['attendance getByTeacherId', () => new AttendanceRepository(), 'getByTeacherId', ['teacher-1']],
  ['attendance getToday', () => new AttendanceRepository(), 'getToday', ['student']],
  ['behavior rewards getAll', () => new BehaviorRewardRepository(), 'getAll', []],
  ['behavior rewards getById', () => new BehaviorRewardRepository(), 'getById', ['id-1']],
  ['classes getById', () => new ClassRepository(), 'getById', ['id-1']],
  ['classes getAll in a year', () => new ClassRepository(), 'getAll', ['2025-2026']],
  ['exams getById', () => new ExamRepository(), 'getById', ['id-1']],
  ['exams getAll in a year', () => new ExamRepository(), 'getAll', [{ year: YEAR }]],
  ['exams getByType', () => new ExamRepository(), 'getByType', ['midterm']],
  ['exams getByStatus', () => new ExamRepository(), 'getByStatus', ['scheduled']],
  ['exams getAll for a section', () => new ExamRepository(), 'getAll', [{ year: YEAR, sectionId: 'section-1' }]],
  ['exams getByTeacherAssignment', () => new ExamRepository(), 'getByTeacherAssignment', ['ta-1']],
  ['exams getAll for a subject', () => new ExamRepository(), 'getAll', [{ year: YEAR, subjectId: 'subject-1' }]],
  ['exams getAll for a teacher', () => new ExamRepository(), 'getAll', [{ year: YEAR, teacherId: 'teacher-1' }]],
  ['exams getTodayExams', () => new ExamRepository(), 'getTodayExams', []],
  ['exams getUpcomingExams', () => new ExamRepository(), 'getUpcomingExams', []],
  ['grades getById', () => new GradeRepository(), 'getById', ['id-1']],
  ['grades getAll in a year', () => new GradeRepository(), 'getAll', [{ year: YEAR }]],
  ['grades getByAssessment', () => new GradeRepository(), 'getByAssessment', ['assessment-1']],
  ['grades getByExam', () => new GradeRepository(), 'getByExam', ['exam-1']],
  ['grades getAll for a student', () => new GradeRepository(), 'getAll', [{ year: YEAR, studentId: 'student-1' }]],
  ['grades getAll for a section', () => new GradeRepository(), 'getAll', [{ year: YEAR, sectionId: 'section-1' }]],
  ['grades getAll for a subject', () => new GradeRepository(), 'getAll', [{ year: YEAR, subjectId: 'subject-1' }]],
  ['grades getAll for a teacher', () => new GradeRepository(), 'getAll', [{ year: YEAR, teacherId: 'teacher-1' }]],
  ['parents getAll', () => new ParentRepository(), 'getAll', []],
  ['parents search', () => new ParentRepository(), 'search', ['Amina']],
  ['parents getById', () => new ParentRepository(), 'getById', ['id-1']],
  ['parents getByUserId', () => new ParentRepository(), 'getByUserId', ['user-9']],
  ['parents getReadableByCin', () => new ParentRepository(), 'getReadableByCin', ['AB123']],
  ['parents getReadableByPhone', () => new ParentRepository(), 'getReadableByPhone', ['0600000000']],
  ['sections getById', () => new SectionRepository(), 'getById', ['id-1']],
  ['sections getAll in a year', () => new SectionRepository(), 'getAll', ['2025-2026']],
  ['students getById', () => new StudentRepository(), 'getById', ['id-1']],
  ['students getByUserId', () => new StudentRepository(), 'getByUserId', ['user-9']],
  ['students getAll in a year', () => new StudentRepository(), 'getAll', [{ academicYearId: 'year-old' }]],
  ['students getAll for one student', () => new StudentRepository(), 'getAll', [{ academicYearId: 'year-old', studentId: 'student-1' }]],
  ['students getAll on a date', () => new StudentRepository(), 'getAll', [{ academicYearId: 'year-old', onDate: '2025-10-01' }]],
  ['teachers getAll', () => new TeacherRepository(), 'getAll', []],
  ['teachers getById', () => new TeacherRepository(), 'getById', ['id-1']],
  ['teachers getByUserId', () => new TeacherRepository(), 'getByUserId', ['user-9']],
];

// Uniqueness and duplicate checks must see every row, whoever is signed in.
const UNSCOPED_LOOKUPS: Read[] = [
  ['students getByEmail', () => new StudentRepository(), 'getByEmail', ['a@school.test']],
  ['students getByPhone', () => new StudentRepository(), 'getByPhone', ['0600000000']],
  ['students getByStudentCode', () => new StudentRepository(), 'getByStudentCode', ['S-1']],
  ['parents getByCin', () => new ParentRepository(), 'getByCin', ['AB123']],
  ['parents getByPhone', () => new ParentRepository(), 'getByPhone', ['0600000000']],
  ['parents getByEmail', () => new ParentRepository(), 'getByEmail', ['p@school.test']],
  ['teachers getByCin', () => new TeacherRepository(), 'getByCin', ['CD456']],
  ['teachers getByEmail', () => new TeacherRepository(), 'getByEmail', ['t@school.test']],
  ['grades checkGradeExists', () => new GradeRepository(), 'checkGradeExists', ['student-1', { assessmentId: 'a-1' }]],
];

describe('owned repository reads', () => {
  // Every owned token has a teacher rule, so one role exercises them all.
  // A later .where() replaces an earlier one in Drizzle, so the ownership
  // subquery and the method's own filter values both reaching the final
  // statement shows neither was dropped.
  for (const [name, create, method, args] of OWNED_READS) {
    it(`${name} keeps the teacher's ownership next to its own filter`, async () => {
      const { sql, params } = await lastStatement(create, method, args, 'teacher');
      expect(sql).toMatch(OWNED_ID_SUBQUERY);
      expect(params).toContain('user-1');
      for (const value of filterValues(args)) {
        expect(params.some((param) => String(param).includes(value))).toBe(true);
      }
    });
  }

  it('reads a principal school-wide without an ownership subquery', async () => {
    const { sql, params } = await lastStatement(() => new StudentRepository(), 'getById', ['student-9'], 'principal');
    expect(sql).not.toMatch(OWNED_ID_SUBQUERY);
    expect(sql).toContain('where "students"."id" = $1');
    expect(params).toEqual(['student-9', 1]);
  });

  it('keeps a parent read of one student to that parent\'s children', async () => {
    const { sql, params } = await lastStatement(() => new StudentRepository(), 'getById', ['student-9'], 'parent');
    expect(sql).toContain('where ("students"."id" in (select "students"."id" from "students" inner join "student_parents"');
    expect(sql).toContain(') and "students"."id" = $2)');
    expect(params).toEqual(['user-1', 'student-9', 1]);
  });

  it('keeps a filtered attendance list inside ownership when a type is given', async () => {
    const { sql, params } = await lastStatement(() => new AttendanceRepository(), 'getAll', [{ year: YEAR, type: 'student' }], 'teacher');
    expect(sql.match(/"attendance"\."id" in \(select/g)).toHaveLength(3);
    expect(sql).toContain('and "attendance"."type" = $7)');
    expect(params).toEqual(['user-1', 'user-1', 'user-1', 'year-old', '2025-09-01', '2026-08-31', 'student']);
  });

  for (const [name, create, method, args] of UNSCOPED_LOOKUPS) {
    it(`${name} stays school-wide for uniqueness checks`, async () => {
      const { sql } = await lastStatement(create, method, args, 'parent');
      expect(sql).not.toMatch(OWNED_ID_SUBQUERY);
    });
  }
});

describe('student profile tabs', () => {
  const notReadable = () => { throw new Error('Student not found'); };

  function profile(calls: string[]) {
    const record = (name: string) => async () => { calls.push(name); return []; };
    return new StudentProfileService(
      { ensureReadable: async () => notReadable(), getById: async () => notReadable() } as any,
      {} as any,
      {} as any,
      { getByStudent: record('fees') } as any,
      { getAll: record('attendance') } as any,
      { getAll: record('assessments') } as any,
      { getAll: record('exams') } as any,
      { getByStudent: record('grades') } as any,
      { getByStudentId: record('transport') } as any,
    );
  }

  it('refuses every tab for a student the user cannot read before loading it', async () => {
    const calls: string[] = [];
    const service = profile(calls);
    const year = { id: 'year-old', label: '2025-2026' } as any;
    await expect(service.getOverview('student-9', year)).rejects.toThrow('Student not found');
    await expect(service.getFinancial('student-9', year)).rejects.toThrow('Student not found');
    await expect(service.getTransport('student-9')).rejects.toThrow('Student not found');
    await expect(service.getAttendanceSummary('student-9', year)).rejects.toThrow('Student not found');
    await expect(service.getAcademic('student-9', year)).rejects.toThrow('Student not found');
    expect(calls).toEqual([]);
  });
});
