import { Bell, ClipboardList, FileText, GraduationCap, Layers3, UsersRound } from 'lucide-react';
import { compareClassNames } from '@sms/contracts';
import type { RegistrarDashboardGrades, RegistrarGradeAverage } from '@sms/contracts/registrar-dashboard';
import { PAGE_ACCESS, type PageViewer } from '@/shared/pageAccess';
import type { QuickAction } from '../components/Teacher/QuickActionsCard';
import { isFutureMonth } from './monthTrend';

export const REGISTRAR_DASHBOARD_LINKS = {
  students: '/students',
  grades: '/grades',
  assessments: '/assessments',
  exams: '/exams',
  classes: '/classes',
  notifications: '/notifications',
} as const;

const action = (key: string, icon: QuickAction['icon'], href: string): QuickAction => ({
  key, icon, href,
  label: `dashboard.registrar.quickActions.${key}`,
  hint: `dashboard.registrar.quickActions.${key}Hint`,
});

/** Use the destinations' page guards so shortcuts never lead to an inaccessible page. */
export function registrarQuickActions(viewer: PageViewer): QuickAction[] {
  return [
    ...(PAGE_ACCESS.students(viewer) ? [action('students', UsersRound, REGISTRAR_DASHBOARD_LINKS.students)] : []),
    ...(PAGE_ACCESS.grades(viewer) ? [action('grades', GraduationCap, REGISTRAR_DASHBOARD_LINKS.grades)] : []),
    ...(PAGE_ACCESS.assessments(viewer) ? [action('assessments', ClipboardList, REGISTRAR_DASHBOARD_LINKS.assessments)] : []),
    ...(PAGE_ACCESS.exams(viewer) ? [action('exams', FileText, REGISTRAR_DASHBOARD_LINKS.exams)] : []),
    ...(PAGE_ACCESS.classes(viewer) ? [action('classes', Layers3, REGISTRAR_DASHBOARD_LINKS.classes)] : []),
    action('notifications', Bell, REGISTRAR_DASHBOARD_LINKS.notifications),
  ];
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SUMMER_MONTHS = new Set(['jul', 'aug']);

/**
 * The school months of the year, as the other trend charts show them. A month
 * with no grades, or one still to come, stays a gap instead of reading as 0%.
 */
export function gradeTrendRows(monthly: RegistrarDashboardGrades['monthly'], businessDate: string | undefined) {
  return monthly.flatMap((row) => {
    const monthKey = MONTH_KEYS[Number(row.month.split('-')[1]) - 1];
    if (!monthKey || SUMMER_MONTHS.has(monthKey)) return [];
    const happened = !isFutureMonth(row.month, businessDate) && row.graded > 0;
    return [{ month: row.month, monthKey, average: happened ? row.average : null, graded: happened ? row.graded : 0 }];
  });
}

/** Classes read in school order, lowest level first. */
export const classesInSchoolOrder = (rows: readonly RegistrarGradeAverage[]) =>
  [...rows].sort((left, right) => compareClassNames(left.name, right.name));

/** Subjects are compared with each other, so the highest average leads. */
export const subjectsByAverage = (rows: readonly RegistrarGradeAverage[]) =>
  [...rows].sort((left, right) => right.average - left.average || left.name.localeCompare(right.name));
