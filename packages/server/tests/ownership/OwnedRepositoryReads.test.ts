import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { AlertRepository } from '../../src/modules/alerts/AlertRepository';
import { AnnouncementRepository } from '../../src/modules/announcements/AnnouncementRepository';
import { AssessmentRepository } from '../../src/modules/assessments/AssessmentRepository';
import { AttendanceRepository } from '../../src/modules/attendance/AttendanceRepository';
import { BehaviorRewardRepository } from '../../src/modules/behaviorRewards/BehaviorRewardRepository';
import { ClassRepository } from '../../src/modules/classes/ClassRepository';
import { DisciplineRepository } from '../../src/modules/discipline/DisciplineRepository';
import { ExamRepository } from '../../src/modules/exams/ExamRepository';
import { EventRepository } from '../../src/modules/events/EventRepository';
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

// Migrated repositories read the academic year the request selected.
function inYear<T extends object>(repo: T): T {
  Object.defineProperty(repo, 'year', { value: { ...YEAR, label: '2025-2026' } });
  return repo;
}
const alertRepo = () => inYear(new AlertRepository());
const announcementRepo = () => inYear(new AnnouncementRepository());
const assessmentRepo = () => inYear(new AssessmentRepository());
const attendanceRepo = () => inYear(new AttendanceRepository());

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
  ['alerts getAll', alertRepo, 'getAll', []],
  ['alerts getById', alertRepo, 'getById', ['id-1']],
  ['alerts getByType', alertRepo, 'getByType', ['health']],
  ['alerts getByStatus', alertRepo, 'getByStatus', ['active']],
  ['alerts getByPriority', alertRepo, 'getByPriority', ['high']],
  ['alerts getByStudentId', alertRepo, 'getByStudentId', ['student-1']],
  ['alerts getByTeacherId', alertRepo, 'getByTeacherId', ['teacher-1']],
  ['alerts getByClassId', alertRepo, 'getByClassId', ['class-1']],
  ['alerts getBySubjectId', alertRepo, 'getBySubjectId', ['subject-1']],
  ['alerts getActiveAlerts', alertRepo, 'getActiveAlerts', []],
  ['alerts getCriticalAlerts', alertRepo, 'getCriticalAlerts', []],
  ['alerts getRecentAlertsByHours', alertRepo, 'getRecentAlertsByHours', [24]],
  ['alerts getRecentAlerts', alertRepo, 'getRecentAlerts', [5]],
  ['alerts getCount', alertRepo, 'getCount', []],
  ['alerts getStatusCounts', alertRepo, 'getStatusCounts', []],
  ['alerts getPriorityCounts', alertRepo, 'getPriorityCounts', []],
  ['alerts getTypeCounts', alertRepo, 'getTypeCounts', []],
  ['announcements getAll', announcementRepo, 'getAll', []],
  ['announcements getById', announcementRepo, 'getById', ['id-1']],
  ['announcements getRecent', announcementRepo, 'getRecent', []],
  ['announcements getByAuthor', announcementRepo, 'getByAuthor', ['user-9']],
  ['announcements getByTargetAudience', announcementRepo, 'getByTargetAudience', ['parents']],
  ['announcements getByClass', announcementRepo, 'getByClass', ['class-1']],
  ['announcements getPublished', announcementRepo, 'getPublished', []],
  ['announcements getActiveForAudience', announcementRepo, 'getActiveForAudience', ['parents', 'class-1']],
  ['announcements getUpcoming', announcementRepo, 'getUpcoming', []],
  ['announcements getExpired', announcementRepo, 'getExpired', []],
  ['announcements getCount', announcementRepo, 'getCount', []],
  ['announcements getStats', announcementRepo, 'getStats', []],
  ['assessments getById', assessmentRepo, 'getById', ['id-1']],
  ['assessments getForStudent', assessmentRepo, 'getForStudent', ['student-1']],
  ['assessments getAll in a year', assessmentRepo, 'getAll', []],
  ['assessments getUpcoming', assessmentRepo, 'getUpcoming', []],
  ['assessments getDueThisWeek', assessmentRepo, 'getDueThisWeek', []],
  ['assessments getOverdue', assessmentRepo, 'getOverdue', []],
  ['assessments getByType', assessmentRepo, 'getByType', ['quiz']],
  ['assessments getByStatus', assessmentRepo, 'getByStatus', ['scheduled']],
  ['assessments getAll for a section', assessmentRepo, 'getAll', [{ sectionId: 'section-1' }]],
  ['assessments getByTeacherAssignment', assessmentRepo, 'getByTeacherAssignment', ['ta-1']],
  ['assessments getAll for a subject', assessmentRepo, 'getAll', [{ subjectId: 'subject-1' }]],
  ['assessments getAll for a teacher', assessmentRepo, 'getAll', [{ teacherId: 'teacher-1' }]],
  ['assessments getTodayAssessments', assessmentRepo, 'getTodayAssessments', []],
  ['assessments getAll for a class', assessmentRepo, 'getAll', [{ classId: 'class-1' }]],
  ['attendance getAll in a year', attendanceRepo, 'getAll', []],
  ['attendance getAll by type', attendanceRepo, 'getAll', [{ type: 'student' }]],
  ['attendance getById', attendanceRepo, 'getById', ['id-1']],
  ['attendance getAll for a student', attendanceRepo, 'getAll', [{ studentId: 'student-1' }]],
  ['attendance getAll for a staff member', attendanceRepo, 'getAll', [{ staffId: 'staff-1' }]],
  ['attendance getByTeacher in a year', attendanceRepo, 'getByTeacher', ['teacher-1']],
  ['attendance getByDate', attendanceRepo, 'getByDate', ['2026-09-25', 'student']],
  ['attendance getAll for a section', attendanceRepo, 'getAll', [{ sectionId: 'section-1' }]],
  ['attendance getByTeacherId', attendanceRepo, 'getByTeacherId', ['teacher-1']],
  ['attendance getToday', attendanceRepo, 'getToday', ['student']],
  ['behavior rewards getAll', () => inYear(new BehaviorRewardRepository()), 'getAll', []],
  ['behavior rewards getById', () => inYear(new BehaviorRewardRepository()), 'getById', ['id-1']],
  ['discipline list', () => inYear(new DisciplineRepository()), 'list', []],
  ['discipline getById', () => inYear(new DisciplineRepository()), 'getById', ['id-1']],
  ['classes getById', () => new ClassRepository(), 'getById', ['id-1']],
  ['classes getAll in a year', () => inYear(new ClassRepository()), 'getAll', []],
  ['classes getInSelectedYear', () => inYear(new ClassRepository()), 'getInSelectedYear', ['id-1']],
  ['exams getById', () => inYear(new ExamRepository()), 'getById', ['id-1']],
  ['exams getAll in a year', () => inYear(new ExamRepository()), 'getAll', []],
  ['exams getByType', () => inYear(new ExamRepository()), 'getByType', ['midterm']],
  ['exams getByStatus', () => inYear(new ExamRepository()), 'getByStatus', ['scheduled']],
  ['exams getAll for a section', () => inYear(new ExamRepository()), 'getAll', [{ sectionId: 'section-1' }]],
  ['exams getByTeacherAssignment', () => inYear(new ExamRepository()), 'getByTeacherAssignment', ['ta-1']],
  ['exams getAll for a subject', () => inYear(new ExamRepository()), 'getAll', [{ subjectId: 'subject-1' }]],
  ['exams getAll for a teacher', () => inYear(new ExamRepository()), 'getAll', [{ teacherId: 'teacher-1' }]],
  ['exams getTodayExams', () => inYear(new ExamRepository()), 'getTodayExams', []],
  ['exams getUpcomingExams', () => inYear(new ExamRepository()), 'getUpcomingExams', []],
  ['exams getForStudent', () => inYear(new ExamRepository()), 'getForStudent', ['student-1', '2026-01-01']],
  ['events getAll', () => inYear(new EventRepository()), 'getAll', []],
  ['events getById', () => inYear(new EventRepository()), 'getById', ['event-1']],
  ['events getByType', () => inYear(new EventRepository()), 'getByType', ['sports']],
  ['events getByClass', () => inYear(new EventRepository()), 'getByClass', ['class-1']],
  ['events getUpcoming', () => inYear(new EventRepository()), 'getUpcoming', []],
  ['events getEventsByParticipant', () => inYear(new EventRepository()), 'getEventsByParticipant', ['participant-1']],
  ['grades getById', () => inYear(new GradeRepository()), 'getById', ['id-1']],
  ['grades getAll in a year', () => inYear(new GradeRepository()), 'getAll', []],
  ['grades getByAssessment', () => inYear(new GradeRepository()), 'getByAssessment', ['assessment-1']],
  ['grades getByExam', () => inYear(new GradeRepository()), 'getByExam', ['exam-1']],
  ['grades getAll for a student', () => inYear(new GradeRepository()), 'getAll', [{ studentId: 'student-1' }]],
  ['grades getAll for a section', () => inYear(new GradeRepository()), 'getAll', [{ sectionId: 'section-1' }]],
  ['grades getAll for a subject', () => inYear(new GradeRepository()), 'getAll', [{ subjectId: 'subject-1' }]],
  ['grades getAll for a teacher', () => inYear(new GradeRepository()), 'getAll', [{ teacherId: 'teacher-1' }]],
  ['parents getAll', () => new ParentRepository(), 'getAll', []],
  ['parents search', () => new ParentRepository(), 'search', ['Amina']],
  ['parents getById', () => new ParentRepository(), 'getById', ['id-1']],
  ['parents getByUserId', () => new ParentRepository(), 'getByUserId', ['user-9']],
  ['parents getReadableByCin', () => new ParentRepository(), 'getReadableByCin', ['AB123']],
  ['parents getReadableByPhone', () => new ParentRepository(), 'getReadableByPhone', ['0600000000']],
  ['sections getById', () => new SectionRepository(), 'getById', ['id-1']],
  ['sections getAll in a year', () => inYear(new SectionRepository()), 'getAll', []],
  ['sections getInSelectedYear', () => inYear(new SectionRepository()), 'getInSelectedYear', ['id-1']],
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
  ['alerts checkDuplicateAlertInScope', alertRepo, 'checkDuplicateAlertInScope', ['academic', 'year-old', 'student-1']],
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

  it('reads alerts and announcements school-wide for a principal', async () => {
    for (const create of [alertRepo, announcementRepo]) {
      const { sql } = await lastStatement(create, 'getAll', [], 'principal');
      expect(sql).not.toMatch(OWNED_ID_SUBQUERY);
    }
  });

  it('keeps a parent\'s alerts about one student inside the parent\'s children and the year', async () => {
    const { sql, params } = await lastStatement(alertRepo, 'getByStudentId', ['student-9'], 'parent');
    expect(sql.match(/"alerts"\."id" in \(select/g)).toHaveLength(3);
    expect(sql).toContain('and "alerts"."student_id" = $');
    expect(params).toContain('student-9');
    expect(params).toContain('year-old');
  });

  it('keeps a teacher\'s behavior rewards inside the year by the school-local day of the behavior', async () => {
    const { sql, params } = await lastStatement(() => inYear(new BehaviorRewardRepository()), 'getAll', [], 'teacher');
    expect(sql).toMatch(OWNED_ID_SUBQUERY);
    expect(sql).toContain('"behavior_rewards"."behavior_at" >= ($');
    expect(sql).toContain('::date::timestamp at time zone coalesce((select "settings"."time_zone" from "settings"');
    expect(sql).toContain('"behavior_rewards"."behavior_at" < (($');
    expect(params).toEqual(expect.arrayContaining(['user-1', '2025-09-01', '2026-08-31']));
  });

  it('keeps one discipline incident inside a parent\'s children and the year by the incident\'s local day', async () => {
    const { sql, params } = await lastStatement(() => inYear(new DisciplineRepository()), 'getById', ['id-1'], 'parent');
    expect(sql).toMatch(OWNED_ID_SUBQUERY);
    expect(sql).toContain('"discipline_incidents"."incident_at" >= ($');
    expect(sql).toContain('"discipline_incidents"."incident_at" < (($');
    expect(sql).toContain('and "discipline_incidents"."id" = $');
    expect(params).toEqual(expect.arrayContaining(['user-1', '2025-09-01', '2026-08-31', 'id-1']));
  });

  it('shows a parent an exam only when a child was placed in a target section on its date', async () => {
    const { sql, params } = await lastStatement(() => inYear(new ExamRepository()), 'getById', ['id-1'], 'parent');
    expect(sql).toContain('placement.valid_from <= "exams"."date"');
    expect(sql).toContain('join student_parents link on link.student_id = student.id');
    expect(sql).not.toContain('"students"."section_id"');
    expect(sql).toContain('"exams"."academic_year_id" = $');
    expect(sql).toContain('and "exams"."id" = $');
    expect(params).toEqual(expect.arrayContaining(['user-1', 'year-old', 'id-1']));
  });

  it('shows a teacher the grades of their sources and of students placed in a section they teach on the source date', async () => {
    const { sql, params } = await lastStatement(() => inYear(new GradeRepository()), 'getAll', [], 'teacher');
    expect(sql).toContain('assignment.id = coalesce(');
    expect(sql).toContain('placement.section_id = assignment.section_id');
    expect(sql).toContain('placement.valid_from <= coalesce(');
    // The current section only for a student with no dated enrollment at all.
    expect(sql).toContain('not exists (select 1 from student_enrollments enrollment where enrollment.student_id = "grades"."student_id")');
    expect(sql).toContain('"grades"."academic_year_id" = $');
    expect(params).toEqual(expect.arrayContaining(['user-1', 'year-old']));
  });

  it('shows a parent public and parent events, a class event only for a child placed in it that day, in the year', async () => {
    const { sql, params } = await lastStatement(() => inYear(new EventRepository()), 'getAll', [], 'parent');
    expect(sql).toContain(`coalesce("events"."visibility", 'public') in ('public', 'parents')`);
    expect(sql).toContain('placement.valid_from <= "events"."start_date"');
    expect(sql).toContain('join student_parents link on link.student_id = student.id');
    expect(sql).toContain('"events"."start_date" <= $');
    expect(sql).toContain('"events"."end_date" >= $');
    expect(params).toEqual(expect.arrayContaining(['user-1', '2026-08-31', '2025-09-01']));
  });

  it('keeps a filtered attendance list inside ownership when a type is given', async () => {
    const { sql, params } = await lastStatement(attendanceRepo, 'getAll', [{ type: 'student' }], 'teacher');
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
