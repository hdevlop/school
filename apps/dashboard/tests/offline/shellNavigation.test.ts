import { expect, test } from 'bun:test';
import { createShellNavItems, navLabel } from '../../src/offline/shellNavigation';
import { FEATURE_ICONS } from '../../src/shared/featureIcons';

const french: Record<string, string> = { 'navigation.attendance': 'Présences', 'navigation.studentAttendance': 'Élèves', 'navigation.students': 'Élèves', 'mobileHome.title': 'Accueil' };
const t = (key: string) => french[key] ?? key;
const routes = ['/home', '/students', '/attendance/students', '/fees'].map(href => ({ href, label: `stored ${href}` }));

test('the shell draws the online sidebar groups, icons and current labels for prepared pages only', () => {
  const items = createShellNavItems(t, 'admin', routes);
  expect(items.map(item => item.id)).toEqual(['/home', '/students', '/fees', '/attendance/students']);
  expect(items[0]).toMatchObject({ href: '/home', label: 'Accueil', icon: FEATURE_ICONS.home });
  expect(items[1]).toMatchObject({ href: '/students', label: 'Élèves', icon: FEATURE_ICONS.students });
  // Single destinations keep the group's label and icon as a direct link.
  const attendance = items.find(item => item.href === '/attendance/students');
  expect(attendance).toMatchObject({ label: 'Présences', icon: FEATURE_ICONS.attendance });
  expect(attendance?.children).toBeUndefined();
  expect(items.find(item => item.href === '/fees')).toMatchObject({ label: t('navigation.financial'), icon: FEATURE_ICONS.financial });
  // Appearance sheets and pages that were not prepared never appear.
  expect(items.flatMap(item => [item.id, ...(item.children ?? []).map(child => child.id)])).not.toContain('settings:theme');
  expect(navLabel(items, '/attendance/students')).toBe('Présences');
  expect(navLabel(items, '/classes')).toBeUndefined();
});

test('family roles keep their own sidebar labels', () => {
  expect(createShellNavItems(t, 'parent', [{ href: '/students', label: 'Students' }])).toMatchObject([{ href: '/students', label: 'navigation.myChildren' }]);
});

test('the evaluations group only includes pages actually prepared offline', () => {
  const items = createShellNavItems(t, 'teacher', [{ href: '/assessments', label: 'Assessments' }, { href: '/exams', label: 'Exams' }]);
  expect(items.find(item => item.id === 'evaluations')?.children?.map(item => item.href)).toEqual(['/assessments', '/exams']);
  expect(navLabel(items, '/exam-planning')).toBeUndefined();
});
