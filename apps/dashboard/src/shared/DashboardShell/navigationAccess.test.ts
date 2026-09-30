import { describe, expect, it } from 'bun:test';
import { visibleNavItems, type GatedNavItem, type NavViewer } from './navigationAccess';

// najm-auth's matcher, reduced to what these grants use.
const viewer = (role: string, permissions: string[]): NavViewer => ({
  role,
  can: (permission) => permissions.includes(permission) || permissions.includes('*:*'),
});

const menu: GatedNavItem[] = [
  { id: '/', label: 'Dashboard', access: 'dashboard' },
  { id: '/students', label: 'Students', access: 'students' },
  {
    id: 'financial',
    label: 'Financial',
    children: [
      { id: '/fees', label: 'Fees', access: 'fees' },
      { id: '/payroll', label: 'Payroll', access: 'payroll' },
      { id: '/reminders', label: 'Reminders', access: 'reminders' },
      { id: '/financial-operations', label: 'Operations', access: 'financialOperations' },
    ],
  },
  { id: '/alerts', label: 'Alerts', access: 'alerts' },
  { id: '/roles', label: 'Roles', access: 'accessControl' },
  { id: '/notifications', label: 'Notifications' },
];

const ids = (items: ReturnType<typeof visibleNavItems>): string[] =>
  items.flatMap((item) => [item.id, ...(item.children ? ids(item.children) : [])]);

describe('sidebar pages follow the route guards', () => {
  it('gives accounting the finance pages its role group admits, and nothing its grants do not', () => {
    expect(ids(visibleNavItems(menu, viewer('accounting', [])))).toEqual([
      '/', 'financial', '/fees', '/reminders', '/notifications',
    ]);
  });

  it('gives the principal the finance pages and what the principal is granted, not admin-only pages', () => {
    expect(ids(visibleNavItems(menu, viewer('principal', ['read:students', 'read:alerts'])))).toEqual([
      '/', '/students', 'financial', '/fees', '/reminders', '/alerts', '/notifications',
    ]);
  });

  it('shows the administrator everything', () => {
    expect(ids(visibleNavItems(menu, viewer('admin', ['*:*'])))).toEqual([
      '/', '/students', 'financial', '/fees', '/payroll', '/reminders', '/financial-operations', '/alerts', '/roles', '/notifications',
    ]);
  });

  it('drops a group with no visible page, and a page the grants do not reach', () => {
    expect(ids(visibleNavItems(menu, viewer('parent', ['read:students'])))).toEqual(['/students', '/notifications']);
  });

  it('shows only unrestricted pages before the session is known', () => {
    expect(ids(visibleNavItems(menu, { role: undefined, can: () => false }))).toEqual(['/notifications']);
  });
});
