import { expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { FEATURE_ICONS, type FeatureIconKey } from '@/shared/featureIcons';
import { createNavigationItems } from '@/shared/schoolNavigation';

const sourceRoot = fileURLToPath(new URL('../../src/', import.meta.url));
const featureFile = (view: string) => join(sourceRoot, 'features', `${view}.tsx`);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [join(dir, entry.name)] : []);
}

function components(file: string, name: string) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const icons: string[] = [];
  function visit(node: ts.Node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === name) {
      const icon = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'icon');
      icons.push(icon && ts.isJsxAttribute(icon) && icon.initializer ? icon.initializer.getText(source) : 'missing');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return icons;
}

// Alternate audiences and detail views must retain the route's sidebar mark.
const routeViews: Record<string, string[]> = {
  '/dashboard': ['Dashboard/index', 'Dashboard/components/Teacher/index'],
  '/students': ['Students/components/StudentsTable', 'Students/components/StudentProfile/index'],
  '/parents': ['Parents/components/ParentsTable'],
  '/teachers': ['Teachers/components/TeachersTable', 'Teachers/components/view/TeacherView'],
  '/staff': ['Staff/components/StaffTable'],
  '/fees': ['Financial/Fees/components/FeesTable'],
  '/expenses': ['Financial/Expenses/components/ExpensesTable'],
  '/payroll': ['Financial/Payroll/components/PayrollTable'],
  '/fee-types': ['Financial/FeeTypes/components/FeeTypesTable'],
  '/reminders': ['Reports/RemindersPage'],
  '/financial-operations': ['Financial/Operations/FinancialOperationsPage'],
  '/attendance/students': ['Attendance/components/StudentAttendanceTable'],
  '/attendance/staff': ['Attendance/components/StaffAttendanceTable'],
  '/alerts': ['Alerts/components/AlertsTable'],
  '/announcements': ['Announcements/components/AnnouncementsTable'],
  '/discipline': ['Discipline/components/DisciplineTable'],
  '/behavior-rewards': ['BehaviorRewards/components/BehaviorRewardsTable'],
  '/assessments': ['Assessments/components/AssessmentsTable'],
  '/exams': ['Exams/components/ExamsTable'],
  '/exam-planning': ['Exams/planning/ExamPlanningPage'],
  '/grades': ['Grades/components/GradesTable'],
  '/calendar': ['Calendar/CalendarPage'],
  '/class-routines': ['ClassRoutines/components/ClassRoutinePage', 'ClassRoutines/components/TeacherRoutinePage'],
  '/classes': ['Classes/components/ClassesTable'],
  '/sections': ['Sections/components/SectionsTable'],
  '/cycles': ['Cycles/components/CyclesTable'],
  '/subjects': ['Subjects/components/SubjectsTable'],
  '/insurance': ['Students/insurance/InsuranceRegisterPage'],
  '/vehicles': ['Vehicles/components/VehiclesTable'],
  '/roles': ['Roles/components/RolesTable'],
  '/permissions': ['Permissions/components/PermissionsTable'],
  '/users': ['Users/components/UsersTable'],
  '/notifications': ['Notifications/NotificationsPage'],
};

test('every page header chooses its icon from the shared feature registry', () => {
  let headers = 0;
  for (const file of sourceFiles(sourceRoot)) {
    // SchoolPageHeader wraps NPageHeader and passes on its caller's icon, so
    // the pages that use it are checked instead of the wrapper itself.
    if (file.endsWith('SchoolPageHeader.tsx')) continue;
    for (const icon of [...components(file, 'NPageHeader'), ...components(file, 'SchoolPageHeader')]) {
      expect(icon, file).toMatch(/^\{FEATURE_ICONS\.\w+\}$/);
      const key = icon.slice('{FEATURE_ICONS.'.length, -1) as FeatureIconKey;
      expect(FEATURE_ICONS[key], file).toBeDefined();
      headers++;
    }
  }
  expect(headers).toBeGreaterThan(40);
});

test('sidebar routes, page headers and all page-level empty states keep the same icon', () => {
  const nav = createNavigationItems(key => key, { role: 'admin', can: () => true }, true);
  const items = nav.flatMap(item => [item, ...(item.children ?? [])]);
  for (const [route, views] of Object.entries(routeViews)) {
    const item = items.find(candidate => candidate.href === route);
    expect(item?.icon, route).toBeDefined();
    for (const view of views) {
      const file = featureFile(view);
      const headers = components(file, 'NPageHeader');
      expect(headers, view).toHaveLength(1);
      const key = headers[0].slice('{FEATURE_ICONS.'.length, -1) as FeatureIconKey;
      expect(item!.icon, `${route}: ${view}`).toBe(FEATURE_ICONS[key]);
      for (const icon of components(file, 'NEmptyState')) expect(icon, view).toBe(headers[0]);
    }
  }
});

test('standalone lists supply the feature icon even when no records exist', () => {
  for (const [view, feature] of [
    ['VisitRequests/components/VisitRequestsTable', 'visitRequests'],
    ['Users/components/UserView', 'users'],
    ['Financial/Payment/components/PaymentsTable', 'payments'],
    ['Financial/Installment/components/InstallmentsTable', 'installments'],
  ]) {
    const emptyStates = components(featureFile(view), 'NEmptyState');
    expect(emptyStates.length, view).toBeGreaterThan(0);
    for (const icon of emptyStates) expect(icon, view).toBe(`{FEATURE_ICONS.${feature}}`);
  }
});
