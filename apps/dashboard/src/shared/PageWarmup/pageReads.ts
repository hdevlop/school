// The reads each warmed page opens with, built from the definitions its own
// hooks use, so a warmed answer lands under the key the page reads. Loaded
// only when a warm-up starts, after the page on screen has finished loading.

import type { QueryClient } from '@tanstack/react-query';
import { yearScopedQueryOptions, type YearScopedRead } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import type { YearScope } from '@/features/AcademicYears/utils/yearScope';
import { alertListRead } from '@/features/Alerts/hooks/useAlerts';
import { announcementListRead } from '@/features/Announcements/hooks/useAnnouncements';
import { assessmentListRead } from '@/features/Assessments/hooks/useAssessments';
import { staffAttendanceRead, studentAttendanceListRead } from '@/features/Attendance/hooks/useAttendance';
import { behaviorRewardListRead } from '@/features/BehaviorRewards/hooks/useBehaviorRewards';
import { classListRead } from '@/features/Classes/hooks/useClasses';
import { disciplineListRead } from '@/features/Discipline/hooks/useDiscipline';
import { eventListRead } from '@/features/Events/hooks/useEvents';
import { examListRead } from '@/features/Exams/hooks/useExams';
import { expenseListRead } from '@/features/Financial/Expenses/hooks/useExpenses';
import { feeListRead, feeSummaryRead } from '@/features/Financial/Fees/hooks/useFees';
import { resolveFeeRosterSelection } from '@/features/Financial/Fees/utils/feeRosterSelection';
import type { MassarRound, MassarSheetRow } from '@sms/contracts';
import { massarRead } from '@/features/Massar/hooks/useMassar';
import { classOrder } from '@/features/Massar/config/massarModel';
import { parentListRead } from '@/features/Parents/hooks/useParents';
import { sectionListRead } from '@/features/Sections/hooks/useSections';
import { studentListRead, studentsOnDateRead } from '@/features/Students/hooks/useStudents';
import { teacherListRead } from '@/features/Teachers/hooks/useTeachers';
import { getFeeTypesApi } from '@/services/feeTypeApi';
import { getStaffAttendanceRosterApi } from '@/services/staffApi';
import { getActiveStaffRolesApi } from '@/services/staffRolesApi';
import { getSubjectsApi } from '@/services/subjectApi';

export type WarmupContext = {
  client: QueryClient;
  scope: YearScope;
  /** The day a register opens on: today, kept inside the viewed year. */
  registerDate: string;
  /** That day when the viewed year's calendar holds it: the student register then lists who was placed on it. */
  rosterDay: string | undefined;
  /** The students page reads fee types only for someone who can add a student. */
  canCreateStudents: boolean;
  /** The Massar page reads the year's setup only for someone who manages Massar. */
  canManageMassar: boolean;
};

// An answer this recent is not asked for again: the page on screen, or an
// earlier warmed page, has just read it.
const FRESH_MS = 30_000;

type Warm = (context: WarmupContext) => Promise<unknown>[];

const year = (read: YearScopedRead): Warm => ({ client, scope }) =>
  [client.fetchQuery({ ...yearScopedQueryOptions(read, scope), staleTime: FRESH_MS })];

// The key `useEntityCRUD(entity).useGetAll()` caches its list under.
const entityList = (entity: string, fetch: () => Promise<unknown>): Warm => ({ client }) =>
  [client.fetchQuery({ queryKey: [entity], queryFn: fetch, staleTime: FRESH_MS })];

const reads = (...warms: Warm[]): Warm => (context) => warms.flatMap((warm) => warm(context));

const classesAndSections = reads(year(classListRead), year(sectionListRead));
const feeTypes = entityList('feeTypes', getFeeTypesApi);
const subjects = entityList('subjects', getSubjectsApi);

// The fees page opens on its default class and section, chosen from the lists.
// "All classes" is warmed too: the whole school's list is the one people
// switch to, and it is the slowest the server builds.
const feesPage: Warm = (context) => {
  const [classes, sections] = classesAndSections(context);
  const list = Promise.all([classes, sections]).then(([classList, sectionList]: any[]) => {
    const { classId, sectionId } = resolveFeeRosterSelection(classList?.data ?? [], sectionList?.data ?? [], null);
    if (!classId || classId === 'all') return undefined;
    return year(feeListRead({ classId, sectionId: sectionId || undefined }))(context)[0];
  });
  // Asked after the opening list, so the page's own first answer comes first.
  const allClasses = list.catch(() => undefined).then(() => year(feeListRead())(context)[0]);
  return [classes, sections, list, allClasses, ...feeTypes(context), ...year(feeSummaryRead())(context)];
};

// The Massar page opens on the latest Contrôle, its first class and that class's first subject:
// the same choice is made here, so the sheet on screen when it opens is already read.
const massarPage: Warm = (context) => {
  const rounds = year(massarRead('/rounds'))(context)[0];
  const opening = rounds.then(async (answer) => {
    const list = ((answer as { data?: MassarRound[] } | undefined)?.data ?? []);
    const latest = [...list].sort((a, b) => a.term - b.term || a.exam - b.exam).at(-1);
    if (!latest) return undefined;
    const answered = await year(massarRead(`/sheets?roundId=${encodeURIComponent(latest.id)}`))(context)[0] as { data?: MassarSheetRow[] } | undefined;
    const sheets = answered?.data ?? [], firstClass = [...new Set(sheets.map((sheet) => sheet.className))].sort(classOrder)[0];
    const first = sheets.find((sheet) => sheet.className === firstClass);
    return first ? year(massarRead(`/sheets/${encodeURIComponent(first.id)}`))(context)[0] : undefined;
  });
  return [rounds, opening, ...year(massarRead('/availability'))(context), ...(context.canManageMassar ? year(massarRead('/setup'))(context) : [])];
};

const PAGE_READS: Record<string, Warm> = {
  '/massar': massarPage,
  '/attendance/students': (context) => [
    ...classesAndSections(context),
    ...year(studentAttendanceListRead)(context),
    ...year(context.rosterDay ? studentsOnDateRead(context.rosterDay) : studentListRead)(context),
  ],
  '/students': (context) => [
    ...classesAndSections(context),
    ...year(studentListRead)(context),
    ...(context.canCreateStudents ? feeTypes(context) : []),
  ],
  '/fees': feesPage,
  // Grades are read per exam once one is picked; the pickers and the roster are what open.
  '/grades': (context) => [
    ...reads(subjects, classesAndSections, year(teacherListRead), year(examListRead), year(studentListRead))(context),
    // Notes reads Massar's parts behind its own permission, which opening the page already took.
    ...year(massarRead('/sources', '/massar-grades'))(context),
  ],
  '/attendance/staff': (context) => [
    ...entityList(`staff-attendance-roster:${context.registerDate}`, () => getStaffAttendanceRosterApi(context.registerDate))(context),
    ...entityList('staff-roles-active', getActiveStaffRolesApi)(context),
    ...year(staffAttendanceRead(context.registerDate))(context),
  ],
  '/assessments': reads(classesAndSections, year(assessmentListRead)),
  '/announcements': reads(year(classListRead), year(announcementListRead)),
  '/alerts': reads(classesAndSections, year(alertListRead)),
  '/discipline': reads(classesAndSections, year(disciplineListRead)),
  '/behavior-rewards': reads(classesAndSections, year(behaviorRewardListRead)),
  '/parents': reads(classesAndSections, year(parentListRead)),
  '/teachers': reads(subjects, year(teacherListRead), year(classListRead)),
  '/expenses': year(expenseListRead),
  '/calendar': reads(year(eventListRead), year(announcementListRead)),
};

/** Pages with opening reads; the warm-up's priority list names only these. */
export const WARMABLE_PAGES = Object.keys(PAGE_READS);

/**
 * Reads `href`'s opening data into the cache. Settles when every read has
 * answered; a refused or failed read is left for the page to ask again.
 */
export async function warmPageData(href: string, context: WarmupContext): Promise<void> {
  const warm = PAGE_READS[href];
  if (warm) await Promise.allSettled(warm(context));
}
