import { ImageIcon, Palette } from 'lucide-react';
import { filterNavItems, type GatedNavItem as KitGatedNavItem, type NavItem } from 'najm-kit';
import { FEATURE_ICONS } from './featureIcons';
import { PAGE_ACCESS, type PageAccess, type PageViewer } from './pageAccess';
import { sidebarEntryVisible } from '@sms/contracts/access-control';

export const THEME_SETTINGS_NAV_ID = 'settings:theme';
export const BRANDING_SETTINGS_NAV_ID = 'settings:branding';

// Who sees each sidebar page: the guard on the page's main list route, as
// PAGE_ACCESS states it. The server stays the authority: a hidden page is
// still refused by its route, and a shown one can still refuse a record.
export type GatedNavItem = KitGatedNavItem<{ access?: PageAccess }>;

export const createNavigationItems = (t: (key: string) => string, viewer: PageViewer, allFeatures = false): GatedNavItem[] => {
  // Parents and students read their own or their children's records; the
  // server shows each of them only those. Grades and attendance are in the
  // child's profile, reached from "My children" or "My profile".
  const role = viewer.role;
  const isFamily = role === 'parent' || role === 'student';
  // Fall back to English for a nav key the shared catalog does not define yet.
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const routine: GatedNavItem = { id: '/class-routines', label: tf('navigation.classRoutines', 'Routine'), icon: FEATURE_ICONS.classRoutines, href: '/class-routines', access: 'classRoutines' };
  const notifications: GatedNavItem = { id: '/notifications', label: t('notifications.inbox'), icon: FEATURE_ICONS.notifications, href: '/notifications' };
  const evaluations: GatedNavItem = {
    id: 'evaluations',
    label: t('navigation.evaluations'),
    icon: FEATURE_ICONS.evaluations,
    children: [
      { id: '/assessments', label: t('navigation.assessments'), icon: FEATURE_ICONS.assessments, href: '/assessments', access: 'assessments' },
      { id: '/exam-planning', label: t('navigation.assessmentPlanning'), icon: FEATURE_ICONS.assessmentPlanning, href: '/exam-planning', access: 'exams' },
      { id: '/exams', label: t('navigation.exams'), icon: FEATURE_ICONS.exams, href: '/exams', access: 'exams' },
    ],
  };

  if (isFamily && !allFeatures) {
    return [
      {
        id: '/students',
        label: role === 'parent' ? t('navigation.myChildren') : t('navigation.myProfile'),
        icon: FEATURE_ICONS.students,
        href: '/students',
        access: 'students',
      },
      { id: '/alerts', label: t('navigation.alerts'), icon: FEATURE_ICONS.alerts, href: '/alerts', access: 'alerts' },
      { id: '/announcements', label: t('navigation.announcements'), icon: FEATURE_ICONS.announcements, href: '/announcements', access: 'announcements' },
      {
        id: 'student-conduct',
        label: t('navigation.studentConductShort'),
        icon: FEATURE_ICONS.studentConduct,
        children: [
          { id: '/behavior-rewards', label: t('navigation.behaviorRewardsShort'), icon: FEATURE_ICONS.behaviorRewards, href: '/behavior-rewards', access: 'behaviorRewards' },
          { id: '/discipline', label: t('navigation.discipline'), icon: FEATURE_ICONS.discipline, href: '/discipline', access: 'discipline' },
        ],
      },
      evaluations,
      { id: '/calendar', label: t('navigation.calendar'), icon: FEATURE_ICONS.calendar, href: '/calendar', access: 'calendar' },
      routine,
      notifications,
    ];
  }

  return [
    { id: '/dashboard', label: t('navigation.dashboard'), icon: FEATURE_ICONS.dashboard, href: '/dashboard', access: 'dashboard' },
    { id: '/students', label: t(role === 'parent' ? 'navigation.myChildren' : role === 'student' ? 'navigation.myProfile' : 'navigation.students'), icon: FEATURE_ICONS.students, href: '/students', access: 'students' },
    { id: '/parents', label: t('navigation.parents'), icon: FEATURE_ICONS.parents, href: '/parents', access: 'parents' },
    { id: '/teachers', label: t('navigation.teachers'), icon: FEATURE_ICONS.teachers, href: '/teachers', access: 'teachers' },
    { id: '/staff', label: t('navigation.staff'), icon: FEATURE_ICONS.staff, href: '/staff', access: 'staff' },
    {
      id: 'financial',
      label: t('navigation.financial'),
      icon: FEATURE_ICONS.financial,
      children: [
        { id: '/fees', label: t('navigation.fees'), icon: FEATURE_ICONS.fees, href: '/fees', access: 'fees' },
        { id: '/expenses', label: t('navigation.expenses'), icon: FEATURE_ICONS.expenses, href: '/expenses', access: 'expenses' },
        { id: '/payroll', label: t('navigation.payroll'), icon: FEATURE_ICONS.payroll, href: '/payroll', access: 'payroll' },
        { id: '/fee-types', label: t('navigation.feeTypes'), icon: FEATURE_ICONS.feeTypes, href: '/fee-types', access: 'feeTypes' },
        { id: '/reminders', label: t('navigation.reminders'), icon: FEATURE_ICONS.reminders, href: '/reminders', access: 'reminders' },
        { id: '/financial-operations', label: t('navigation.pendingChecks'), icon: FEATURE_ICONS.financialOperations, href: '/financial-operations', access: 'financialOperations' },
      ],
    },
    {
      id: 'attendance',
      label: t('navigation.attendance'),
      icon: FEATURE_ICONS.attendance,
      children: [
        { id: '/attendance/students', label: t('navigation.studentAttendance'), icon: FEATURE_ICONS.studentAttendance, href: '/attendance/students', access: 'studentAttendance' },
        { id: '/attendance/staff', label: t('navigation.staffAttendance'), icon: FEATURE_ICONS.staffAttendance, href: '/attendance/staff', access: 'staffAttendance' },
      ],
    },
    { id: '/alerts', label: t('navigation.alerts'), icon: FEATURE_ICONS.alerts, href: '/alerts', access: 'alerts' },
    { id: '/announcements', label: t('navigation.announcements'), icon: FEATURE_ICONS.announcements, href: '/announcements', access: 'announcements' },
    {
      id: 'student-conduct',
      label: t('navigation.studentConductShort'),
      icon: FEATURE_ICONS.studentConduct,
      children: [
        { id: '/discipline', label: t('navigation.discipline'), icon: FEATURE_ICONS.discipline, href: '/discipline', access: 'discipline' },
        { id: '/behavior-rewards', label: t('navigation.behaviorRewardsShort'), icon: FEATURE_ICONS.behaviorRewards, href: '/behavior-rewards', access: 'behaviorRewards' },
      ],
    },
    evaluations,
    { id: '/grades', label: t('navigation.grades'), icon: FEATURE_ICONS.grades, href: '/grades', access: 'grades' },
    { id: '/calendar', label: t('navigation.calendar'), icon: FEATURE_ICONS.calendar, href: '/calendar', access: 'calendar' },
    routine,
    {
      id: 'academic',
      label: t('navigation.academic'),
      icon: FEATURE_ICONS.academic,
      children: [
        { id: '/classes', label: t('navigation.classes'), icon: FEATURE_ICONS.classes, href: '/classes', access: 'classes' },
        { id: '/sections', label: t('navigation.sections'), icon: FEATURE_ICONS.sections, href: '/sections', access: 'sections' },
        { id: '/cycles', label: t('navigation.cycles'), icon: FEATURE_ICONS.cycles, href: '/cycles', access: 'cycles' },
        { id: '/subjects', label: t('navigation.subjects'), icon: FEATURE_ICONS.subjects, href: '/subjects', access: 'subjects' },
      ],
    },
    {
      id: 'transport',
      label: t('navigation.transport'),
      icon: FEATURE_ICONS.transport,
      children: [
        { id: '/vehicles', label: t('navigation.vehicles'), icon: FEATURE_ICONS.vehicles, href: '/vehicles', access: 'vehicles' },
      ],
    },
    {
      id: 'access-control',
      label: tf('navigation.accessControl', 'AccessControle'),
      icon: FEATURE_ICONS.accessControl,
      children: [
        { id: '/roles', label: t('navigation.roles'), icon: FEATURE_ICONS.roles, href: '/roles', access: 'accessControl' },
        { id: '/permissions', label: tf('navigation.permissions', 'Permissions'), icon: FEATURE_ICONS.permissions, href: '/permissions', access: 'accessControl' },
        { id: '/users', label: t('navigation.users'), icon: FEATURE_ICONS.users, href: '/users', access: 'accessControl' },
      ],
    },
    {
      id: 'appearance',
      label: t('navigation.appearance'),
      icon: Palette,
      children: [
        { id: THEME_SETTINGS_NAV_ID, label: t('navigation.theme'), icon: Palette, access: 'appearance' },
        { id: BRANDING_SETTINGS_NAV_ID, label: t('navigation.branding'), icon: ImageIcon, access: 'appearance' },
      ],
    },
    notifications,
  ];
};

export const createSidebarItems = (t: (key: string) => string, viewer: PageViewer): NavItem[] =>
  filterNavItems(createNavigationItems(t, viewer), (item) =>
    (!item.access || PAGE_ACCESS[item.access](viewer)) && sidebarEntryVisible(viewer.can, item.id), ['access']);

