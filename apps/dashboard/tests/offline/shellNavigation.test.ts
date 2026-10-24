import { expect, test } from 'bun:test';
import { createShellNavItems, navLabel } from '../../src/offline/shellNavigation';
import { FEATURE_ICONS } from '../../src/shared/featureIcons';

const french: Record<string, string> = { 'navigation.attendance': 'Présences', 'navigation.studentAttendance': 'Élèves', 'navigation.students': 'Élèves', 'mobileHome.title': 'Accueil' };
const t = (key: string) => french[key] ?? key;
const routes = ['/home', '/students', '/attendance/students', '/fees'].map(href => ({ href, label: `stored ${href}` }));

test('the shell draws the online sidebar groups, icons and current labels for prepared pages only', () => {
  const items = createShellNavItems(t, 'admin', routes);
  expect(items.map(item => item.id)).toEqual(['/home', '/students', 'financial', 'attendance']);
  expect(items[0]).toMatchObject({ href: '/home', label: 'Accueil', icon: FEATURE_ICONS.home });
  expect(items[1]).toMatchObject({ href: '/students', label: 'Élèves', icon: FEATURE_ICONS.students });
  // Student attendance keeps its group, so the two "Élèves" entries stay distinct.
  const attendance = items.find(item => item.id === 'attendance');
  expect(attendance).toMatchObject({ label: 'Présences', icon: FEATURE_ICONS.attendance });
  expect(attendance?.children?.map(item => item.href)).toEqual(['/attendance/students']);
  expect(items.find(item => item.id === 'financial')?.children?.map(item => item.href)).toEqual(['/fees']);
  // Appearance sheets and pages that were not prepared never appear.
  expect(items.flatMap(item => [item.id, ...(item.children ?? []).map(child => child.id)])).not.toContain('settings:theme');
  expect(navLabel(items, '/attendance/students')).toBe('Élèves');
  expect(navLabel(items, '/classes')).toBeUndefined();
});

test('family roles keep their own sidebar labels', () => {
  expect(createShellNavItems(t, 'parent', [{ href: '/students', label: 'Students' }])).toMatchObject([{ href: '/students', label: 'navigation.myChildren' }]);
});
