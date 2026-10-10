/**
 * The complete ownership SQL baseline: every owned repository read and write,
 * every ownership token and every `ownedIds` subquery, for every role School
 * distinguishes. Each case records every statement it sends, as exact SQL and
 * ordered parameters, so a change to ownership code can be compared byte for
 * byte against the behavior before it.
 *
 * Everything that could vary between runs is fixed here: the clock, the time
 * zone, user ids, the selected year and the database's answers.
 */
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { setSystemTime } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ownershipCondition, ownedIds } from '../../../src/auth';
import * as AlertGuards from '../../../src/modules/alerts/AlertGuards';
import * as AnnouncementGuards from '../../../src/modules/announcements/AnnouncementGuards';
import * as AssessmentGuards from '../../../src/modules/assessments/AssessmentGuards';
import * as AttendanceGuards from '../../../src/modules/attendance/AttendanceGuards';
import * as BehaviorRewardGuards from '../../../src/modules/behaviorRewards/BehaviorRewardGuards';
import * as ClassGuards from '../../../src/modules/classes/ClassGuards';
import * as DisciplineGuards from '../../../src/modules/discipline/DisciplineGuards';
import * as EventGuards from '../../../src/modules/events/EventGuards';
import * as ExamGuards from '../../../src/modules/exams/ExamGuards';
import * as GradeGuards from '../../../src/modules/grades/GradeGuards';
import * as ParentGuards from '../../../src/modules/parents/ParentGuards';
import * as SectionGuards from '../../../src/modules/sections/SectionGuards';
import * as StudentGuards from '../../../src/modules/students/StudentGuards';
import * as TeacherGuards from '../../../src/modules/teachers/TeacherGuards';
import { AlertRepository } from '../../../src/modules/alerts/AlertRepository';
import { AnnouncementRepository } from '../../../src/modules/announcements/AnnouncementRepository';
import { AssessmentRepository } from '../../../src/modules/assessments/AssessmentRepository';
import { AttendanceRepository } from '../../../src/modules/attendance/AttendanceRepository';
import { BehaviorRewardRepository } from '../../../src/modules/behaviorRewards/BehaviorRewardRepository';
import { ClassRepository } from '../../../src/modules/classes/ClassRepository';
import { DisciplineRepository } from '../../../src/modules/discipline/DisciplineRepository';
import { EventRepository } from '../../../src/modules/events/EventRepository';
import { ExamRepository } from '../../../src/modules/exams/ExamRepository';
import { GradeRepository } from '../../../src/modules/grades/GradeRepository';
import { ParentRepository } from '../../../src/modules/parents/ParentRepository';
import { ParentChildrenRepository } from '../../../src/modules/parents/ParentChildrenRepository';
import { SearchRepository } from '../../../src/modules/search/SearchRepository';
import { SectionRepository } from '../../../src/modules/sections/SectionRepository';
import { StudentRepository } from '../../../src/modules/students/StudentRepository';
import { TeacherRepository } from '../../../src/modules/teachers/TeacherRepository';

export const BASELINE_PATH = new URL('./ownership-sql-baseline.json', import.meta.url);

// ---------------------------------------------------------------------------
// Fixed inputs
// ---------------------------------------------------------------------------

export const FROZEN_TIME = '2026-03-15T10:30:00.000Z';
const USER_ID = 'user-1';
const YEAR = { id: 'year-old', label: '2025-2026', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE = [
  'admin', 'principal', 'accounting', 'counselor', 'nurse',
  'secretary', 'librarian', 'driver', 'assistant',
] as const;
const ROLES = ['teacher', 'parent', 'student', ...SCHOOL_WIDE, 'custom-role'] as const;

type Context = { hasActiveContext(): boolean; getUser(): { id: string; role: string } | null };

export const CONTEXTS: Record<string, Context> = {
  ...Object.fromEntries(ROLES.map((role) => [
    `role:${role}`,
    { hasActiveContext: () => true, getUser: () => ({ id: USER_ID, role }) },
  ])),
  anonymous: { hasActiveContext: () => true, getUser: () => null },
  'outside-request': { hasActiveContext: () => false, getUser: () => null },
};

export function freezeEnvironment() {
  process.env.TZ = 'UTC';
  setSystemTime(new Date(FROZEN_TIME));
}

// ---------------------------------------------------------------------------
// Repository reads and writes
// ---------------------------------------------------------------------------

type RepositoryCase = [name: string, create: () => any, method: string, args: unknown[]];

function inYear<T extends object>(repo: T): T {
  Object.defineProperty(repo, 'year', { value: { ...YEAR } });
  return repo;
}
const y = <T extends object>(Ctor: new () => T) => () => inYear(new Ctor());
const plain = <T extends object>(Ctor: new () => T) => () => new Ctor();

const alert = y(AlertRepository);
const announcement = y(AnnouncementRepository);
const assessment = y(AssessmentRepository);
const attendance = y(AttendanceRepository);
const reward = y(BehaviorRewardRepository);
const discipline = y(DisciplineRepository);
const event = y(EventRepository);
const exam = y(ExamRepository);
const grade = y(GradeRepository);

export const REPOSITORY_CASES: RepositoryCase[] = [
  ['alerts getAll', alert, 'getAll', []],
  ['alerts getById', alert, 'getById', ['id-1']],
  ['alerts getByType', alert, 'getByType', ['health']],
  ['alerts getByStatus', alert, 'getByStatus', ['active']],
  ['alerts getByPriority', alert, 'getByPriority', ['high']],
  ['alerts getByStudentId', alert, 'getByStudentId', ['student-1']],
  ['alerts getByTeacherId', alert, 'getByTeacherId', ['teacher-1']],
  ['alerts getByClassId', alert, 'getByClassId', ['class-1']],
  ['alerts getBySubjectId', alert, 'getBySubjectId', ['subject-1']],
  ['alerts getActiveAlerts', alert, 'getActiveAlerts', []],
  ['alerts getCriticalAlerts', alert, 'getCriticalAlerts', []],
  ['alerts getRecentAlertsByHours', alert, 'getRecentAlertsByHours', [24]],
  ['alerts getRecentAlerts', alert, 'getRecentAlerts', [5]],
  ['alerts getCount', alert, 'getCount', []],
  ['alerts getStatusCounts', alert, 'getStatusCounts', []],
  ['alerts getPriorityCounts', alert, 'getPriorityCounts', []],
  ['alerts getTypeCounts', alert, 'getTypeCounts', []],
  ['alerts checkDuplicateAlertInScope (unscoped)', alert, 'checkDuplicateAlertInScope', ['academic', 'year-old', 'student-1']],

  ['announcements getAll', announcement, 'getAll', []],
  ['announcements getById', announcement, 'getById', ['id-1']],
  ['announcements getRecent', announcement, 'getRecent', []],
  ['announcements getByAuthor', announcement, 'getByAuthor', ['user-9']],
  ['announcements getByTargetAudience', announcement, 'getByTargetAudience', ['parents']],
  ['announcements getByClass', announcement, 'getByClass', ['class-1']],
  ['announcements getPublished', announcement, 'getPublished', []],
  ['announcements getActiveForAudience', announcement, 'getActiveForAudience', ['parents', 'class-1']],
  ['announcements getUpcoming', announcement, 'getUpcoming', []],
  ['announcements getExpired', announcement, 'getExpired', []],
  ['announcements getCount', announcement, 'getCount', []],
  ['announcements getStats', announcement, 'getStats', []],
  ['announcements create', announcement, 'create', [{ id: 'new-1', title: 'T', content: 'C', userId: 'user-1' }]],

  ['assessments getById', assessment, 'getById', ['id-1']],
  ['assessments getForStudent', assessment, 'getForStudent', ['student-1']],
  ['assessments getAll in a year', assessment, 'getAll', []],
  ['assessments getAll for a section', assessment, 'getAll', [{ sectionId: 'section-1' }]],
  ['assessments getAll for a subject', assessment, 'getAll', [{ subjectId: 'subject-1' }]],
  ['assessments getAll for a teacher', assessment, 'getAll', [{ teacherId: 'teacher-1' }]],
  ['assessments getAll for a class', assessment, 'getAll', [{ classId: 'class-1' }]],
  ['assessments getUpcoming', assessment, 'getUpcoming', []],
  ['assessments getDueThisWeek', assessment, 'getDueThisWeek', []],
  ['assessments getOverdue', assessment, 'getOverdue', []],
  ['assessments getByType', assessment, 'getByType', ['quiz']],
  ['assessments getByStatus', assessment, 'getByStatus', ['scheduled']],
  ['assessments getByTeacherAssignment', assessment, 'getByTeacherAssignment', ['ta-1']],
  ['assessments getTodayAssessments', assessment, 'getTodayAssessments', []],
  ['assessments getCount', assessment, 'getCount', []],
  ['assessments create', assessment, 'create', [{ id: 'new-1', title: 'A', teacherAssignmentId: 'ta-1' }]],

  ['attendance getAll in a year', attendance, 'getAll', []],
  ['attendance getAll by type', attendance, 'getAll', [{ type: 'student' }]],
  ['attendance getAll for a student', attendance, 'getAll', [{ studentId: 'student-1' }]],
  ['attendance getAll for a staff member', attendance, 'getAll', [{ staffId: 'staff-1' }]],
  ['attendance getAll for a section', attendance, 'getAll', [{ sectionId: 'section-1' }]],
  ['attendance getById', attendance, 'getById', ['id-1']],
  ['attendance getByTeacher', attendance, 'getByTeacher', ['teacher-1']],
  ['attendance getByDate', attendance, 'getByDate', ['2026-09-25', 'student']],
  ['attendance getByTeacherId', attendance, 'getByTeacherId', ['teacher-1']],
  ['attendance getToday', attendance, 'getToday', ['student']],
  ['attendance create', attendance, 'create', [{ id: 'new-1', studentId: 'student-1', date: '2026-03-15', status: 'present', type: 'student' }]],

  ['behavior rewards getAll', reward, 'getAll', []],
  ['behavior rewards getById', reward, 'getById', ['id-1']],
  ['behavior rewards create', reward, 'create', [{ id: 'new-1', studentId: 'student-1', points: 1 }]],
  ['behavior rewards update', reward, 'update', ['id-1', { points: 2 }]],

  ['discipline list', discipline, 'list', []],
  ['discipline getById', discipline, 'getById', ['id-1']],
  ['discipline create', discipline, 'create', [{ id: 'new-1', studentId: 'student-1' }]],
  ['discipline update', discipline, 'update', ['id-1', { description: 'd' }]],

  ['classes getById', plain(ClassRepository), 'getById', ['id-1']],
  ['classes getAll in a year', y(ClassRepository), 'getAll', []],
  ['classes getInSelectedYear', y(ClassRepository), 'getInSelectedYear', ['id-1']],

  ['events getAll', event, 'getAll', []],
  ['events getById', event, 'getById', ['event-1']],
  ['events getByType', event, 'getByType', ['sports']],
  ['events getByStatus', event, 'getByStatus', ['scheduled']],
  ['events getByOrganizer', event, 'getByOrganizer', ['organizer-1']],
  ['events getByClass', event, 'getByClass', ['class-1']],
  ['events getBySection', event, 'getBySection', ['section-1']],
  ['events getByVisibility', event, 'getByVisibility', ['parents']],
  ['events getUpcoming', event, 'getUpcoming', []],
  ['events getPast', event, 'getPast', []],
  ['events getByDateRange', event, 'getByDateRange', ['2026-03-01', '2026-03-31']],
  ['events getActiveEvents', event, 'getActiveEvents', []],
  ['events getTodayEvents', event, 'getTodayEvents', []],
  ['events getEventsByParticipant', event, 'getEventsByParticipant', ['participant-1']],
  ['events getUpcomingForParent', event, 'getUpcomingForParent', ['parent-user-7']],
  ['events getEventAnalytics', event, 'getEventAnalytics', []],
  ['events getEventsByTypeCount', event, 'getEventsByTypeCount', []],
  ['events create', event, 'create', [{ id: 'new-1', title: 'E', startDate: '2026-03-20', endDate: '2026-03-20' }]],
  ['events update', event, 'update', ['event-1', { title: 'E2' }]],

  ['exams getById', exam, 'getById', ['id-1']],
  ['exams getAll in a year', exam, 'getAll', []],
  ['exams getAll for a section', exam, 'getAll', [{ sectionId: 'section-1' }]],
  ['exams getAll for a subject', exam, 'getAll', [{ subjectId: 'subject-1' }]],
  ['exams getAll for a teacher', exam, 'getAll', [{ teacherId: 'teacher-1' }]],
  ['exams getByType', exam, 'getByType', ['midterm']],
  ['exams getByStatus', exam, 'getByStatus', ['scheduled']],
  ['exams getByTeacherAssignment', exam, 'getByTeacherAssignment', ['ta-1']],
  ['exams getTodayExams', exam, 'getTodayExams', []],
  ['exams getUpcomingExams', exam, 'getUpcomingExams', []],
  ['exams getForStudent', exam, 'getForStudent', ['student-1', '2026-01-01']],
  ['exams getCount', exam, 'getCount', []],
  ['exams create', exam, 'create', [{ id: 'new-1', title: 'X', date: '2026-03-20' }]],

  ['grades getById', grade, 'getById', ['id-1']],
  ['grades getAll in a year', grade, 'getAll', []],
  ['grades getAll for a student', grade, 'getAll', [{ studentId: 'student-1' }]],
  ['grades getAll for a section', grade, 'getAll', [{ sectionId: 'section-1' }]],
  ['grades getAll for a subject', grade, 'getAll', [{ subjectId: 'subject-1' }]],
  ['grades getAll for a teacher', grade, 'getAll', [{ teacherId: 'teacher-1' }]],
  ['grades getByAssessment', grade, 'getByAssessment', ['assessment-1']],
  ['grades getByExam', grade, 'getByExam', ['exam-1']],
  ['grades getCount', grade, 'getCount', []],
  ['grades checkGradeExists (unscoped)', plain(GradeRepository), 'checkGradeExists', ['student-1', { assessmentId: 'a-1' }]],

  ['parents getAll', plain(ParentRepository), 'getAll', []],
  ['parents search', plain(ParentRepository), 'search', ['Amina']],
  ['parents getById', plain(ParentRepository), 'getById', ['id-1']],
  ['parents getByUserId', plain(ParentRepository), 'getByUserId', ['user-9']],
  ['parents getReadableByCin', plain(ParentRepository), 'getReadableByCin', ['AB123']],
  ['parents getReadableByPhone', plain(ParentRepository), 'getReadableByPhone', ['0600000000']],
  ['parents getByCin (unscoped)', plain(ParentRepository), 'getByCin', ['AB123']],
  ['parents getByPhone (unscoped)', plain(ParentRepository), 'getByPhone', ['0600000000']],
  ['parents getByEmail (unscoped)', plain(ParentRepository), 'getByEmail', ['p@school.test']],

  ['parent children in a year', y(ParentChildrenRepository), 'getChildren', ['parent-1']],
  ['parent children linked now', y(ParentChildrenRepository), 'getLinkedChildren', ['parent-1']],
  ['parent children list placements', y(ParentChildrenRepository), 'getListPlacements', [['parent-1', 'parent-2']]],

  ['search students', plain(SearchRepository), 'searchStudents', ['Adam']],
  ['search teachers', plain(SearchRepository), 'searchTeachers', ['Adam']],
  ['search parents', plain(SearchRepository), 'searchParents', ['Adam']],
  ['search global', plain(SearchRepository), 'searchGlobal', ['Adam']],

  ['sections getById', plain(SectionRepository), 'getById', ['id-1']],
  ['sections getAll in a year', y(SectionRepository), 'getAll', []],
  ['sections getInSelectedYear', y(SectionRepository), 'getInSelectedYear', ['id-1']],

  ['students getById', plain(StudentRepository), 'getById', ['id-1']],
  ['students getByUserId', plain(StudentRepository), 'getByUserId', ['user-9']],
  ['students getAll in a year', y(StudentRepository), 'getAll', [{}]],
  ['students getAll for one student', y(StudentRepository), 'getAll', [{ studentId: 'student-1' }]],
  ['students getAll on a date', y(StudentRepository), 'getAll', [{ onDate: '2025-10-01' }]],
  ['students getCount', y(StudentRepository), 'getCount', []],
  ['students getStudentsByGender', y(StudentRepository), 'getStudentsByGender', []],
  ['students getByEmail (unscoped)', plain(StudentRepository), 'getByEmail', ['a@school.test']],
  ['students getByPhone (unscoped)', plain(StudentRepository), 'getByPhone', ['0600000000']],
  ['students getByStudentCode (unscoped)', plain(StudentRepository), 'getByStudentCode', ['S-1']],

  ['teachers getAll', y(TeacherRepository), 'getAll', []],
  ['teachers getOwnedCount', y(TeacherRepository), 'getOwnedCount', []],
  ['teachers getById', y(TeacherRepository), 'getById', ['id-1']],
  ['teachers getByUserId', plain(TeacherRepository), 'getByUserId', ['user-9']],
  ['teachers getOwnedRecord', y(TeacherRepository), 'getOwnedRecord', ['id-1']],
  ['teachers getByCin (unscoped)', y(TeacherRepository), 'getByCin', ['CD456']],
  ['teachers getByEmail (unscoped)', y(TeacherRepository), 'getByEmail', ['t@school.test']],
];

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const GUARD_MODULES: Record<string, Record<string, unknown>> = {
  AlertGuards, AnnouncementGuards, AssessmentGuards, AttendanceGuards, BehaviorRewardGuards,
  ClassGuards, DisciplineGuards, EventGuards, ExamGuards, GradeGuards, ParentGuards,
  SectionGuards, StudentGuards, TeacherGuards,
};

type Token = { table: any; for: (...args: any[]) => unknown; applyScopeSplit: (...args: any[]) => unknown };
const isToken = (value: unknown): value is Token =>
  !!value && typeof value === 'object'
  && typeof (value as Token).for === 'function'
  && typeof (value as Token).applyScopeSplit === 'function'
  && !!(value as Token).table;

export const TOKENS: Array<[name: string, token: Token]> = Object.entries(GUARD_MODULES)
  .flatMap(([module, exports]) => Object.entries(exports)
    .filter(([, value]) => isToken(value))
    .map(([name, value]) => [`${module}.${name}`, value as Token] as [string, Token]))
  .sort(([a], [b]) => a.localeCompare(b));

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

export type Statement = { sql: string; params: unknown[]; method: string };
export type Outcome = { statements: Statement[]; error?: string };

/** Parameters as JSON-stable values; a Date keeps its exact instant. */
function stable(value: unknown): unknown {
  if (value instanceof Date) return { $date: Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString() };
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, stable(inner)]));
  }
  return value;
}

/**
 * Inserts and updates return one row whose first column (the id) is set.
 * `create` cases pass that id, so no generated id varies between runs.
 */
const WRITTEN_ROW = ['new-1', ...Array(79).fill(null)];

function capturingDb(statements: Statement[]) {
  return drizzle(async (sql, params, method) => {
    statements.push({ sql, params: stable(params) as unknown[], method });
    return { rows: /^\s*(insert|update)\b/i.test(sql) ? [WRITTEN_ROW] : [] };
  });
}

const errorText = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

export async function captureRepositoryCase([, create, method, args]: RepositoryCase, context: Context): Promise<Outcome> {
  const statements: Statement[] = [];
  const outcome: Outcome = { statements };
  try {
    const repo = create();
    repo.db = capturingDb(statements);
    repo._scopeCtx = context;
    await repo[method](...structuredClone(args));
  } catch (error) {
    outcome.error = errorText(error);
  }
  return outcome;
}

const renderDb = drizzle(async () => ({ rows: [] })) as any;

export function captureTokenCase(token: Token, context: Context): Outcome {
  try {
    const condition = ownershipCondition(renderDb, [token as any], context as any);
    const query = renderDb.select().from(token.table);
    const { sql, params } = (condition === undefined ? query : query.where(condition)).toSQL();
    return { statements: [{ sql, params: stable(params) as unknown[], method: condition === undefined ? 'unscoped' : 'scoped' }] };
  } catch (error) {
    return { statements: [], error: errorText(error) };
  }
}

export function captureOwnedIdsCase(token: Token, role: string): Outcome {
  try {
    const { sql, params } = (ownedIds(token as any, role, USER_ID) as any).toSQL();
    return { statements: [{ sql, params: stable(params) as unknown[], method: 'subquery' }] };
  } catch (error) {
    return { statements: [], error: errorText(error) };
  }
}

/** Every case, keyed `kind:name|context`, in a fixed order. */
export async function captureAll(): Promise<Map<string, Outcome>> {
  const cases = new Map<string, Outcome>();
  for (const repositoryCase of REPOSITORY_CASES) {
    for (const [contextName, context] of Object.entries(CONTEXTS)) {
      cases.set(`repository:${repositoryCase[0]}|${contextName}`, await captureRepositoryCase(repositoryCase, context));
    }
  }
  for (const [name, token] of TOKENS) {
    for (const [contextName, context] of Object.entries(CONTEXTS)) {
      cases.set(`token:${name}|${contextName}`, captureTokenCase(token, context));
    }
    for (const role of ROLES) {
      cases.set(`ownedIds:${name}|role:${role}`, captureOwnedIdsCase(token, role));
    }
  }
  return cases;
}

export const outcomeKey = (outcome: Outcome) =>
  createHash('sha256').update(JSON.stringify(outcome)).digest('hex').slice(0, 16);

export type Baseline = {
  frozenTime: string;
  outcomes: Record<string, Outcome>;
  cases: Record<string, string>;
};

export function toBaseline(cases: Map<string, Outcome>): Baseline {
  const outcomes: Record<string, Outcome> = {};
  const keyed: Record<string, string> = {};
  for (const [name, outcome] of cases) {
    const key = outcomeKey(outcome);
    outcomes[key] = outcome;
    keyed[name] = key;
  }
  return { frozenTime: FROZEN_TIME, outcomes, cases: keyed };
}
