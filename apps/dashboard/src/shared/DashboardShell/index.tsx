'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ImageIcon, LogOut, Palette, Settings } from 'lucide-react';
import { YearScopedChatbot } from '@/features/Chat/components/YearScopedChatbot';
import { SignOutButton, useAuth, usePermissions, useRedirectOnSessionExpired } from 'najm-auth/client/react';
import { filterNavItems, isNavItemActiveOrNested, NSidebar, NSidebarProvider, useNSidebar, type GatedNavItem as KitGatedNavItem, type NavItem } from 'najm-kit';
import { NSidebarNextLink } from 'najm-kit/next';
import { clearNajmUiPreferences } from 'najm-kit/server';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { PAGE_ACCESS, type PageAccess, type PageViewer } from '@/shared/pageAccess';
import { schoolApp } from '@/najm.config';
import { ThemeSettingsSheets, type ThemeSettingsSheet } from '@/features/Settings/components/ThemeSettingsSheets';
import { ViewingYearBanner } from '@/features/AcademicYears/components/ViewingYearBanner';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';

const THEME_SETTINGS_NAV_ID = 'settings:theme';
const BRANDING_SETTINGS_NAV_ID = 'settings:branding';

// Who sees each sidebar page: the guard on the page's main list route, as
// PAGE_ACCESS states it. The server stays the authority: a hidden page is
// still refused by its route, and a shown one can still refuse a record.
type GatedNavItem = KitGatedNavItem<{ access?: PageAccess }>;

const visibleNavItems = (items: GatedNavItem[], viewer: PageViewer): NavItem[] =>
  filterNavItems(items, (item) => !item.access || PAGE_ACCESS[item.access](viewer), ['access']);

const createSidebarItems = (t: (key: string) => string, viewer: PageViewer): NavItem[] => {
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

  if (isFamily) {
    return visibleNavItems([
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
      { id: '/assessments', label: t('navigation.assessments'), icon: FEATURE_ICONS.assessments, href: '/assessments', access: 'assessments' },
      { id: '/exams', label: t('navigation.exams'), icon: FEATURE_ICONS.exams, href: '/exams', access: 'exams' },
      { id: '/calendar', label: t('navigation.calendar'), icon: FEATURE_ICONS.calendar, href: '/calendar', access: 'calendar' },
      routine,
      notifications,
    ], viewer);
  }

  return visibleNavItems([
    { id: '/', label: t('navigation.dashboard'), icon: FEATURE_ICONS.dashboard, href: '/', access: 'dashboard' },
    { id: '/students', label: t('navigation.students'), icon: FEATURE_ICONS.students, href: '/students', access: 'students' },
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
    { id: '/assessments', label: t('navigation.assessments'), icon: FEATURE_ICONS.assessments, href: '/assessments', access: 'assessments' },
    { id: '/exams', label: t('navigation.exams'), icon: FEATURE_ICONS.exams, href: '/exams', access: 'exams' },
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
  ], viewer);
};

const STUDENT_FEES_PATH = /^\/students\/[^/]+\/fees(?:\/|$)/;

function hasNavHref(items: NavItem[], href: string): boolean {
  return items.some((item) => item.href === href || (item.children ? hasNavHref(item.children, href) : false));
}

/**
 * A student's fee record lives at `/students/[id]/fees` but belongs to Fees, so
 * it highlights Fees wherever it was opened from. Parents and students have no
 * Fees item and reach it through their own profile, which stays highlighted.
 */
function sidebarActivePath(pathname: string, navItems: NavItem[]) {
  return STUDENT_FEES_PATH.test(pathname) && hasNavHref(navItems, '/fees') ? '/fees' : pathname;
}

function SidebarFooterContent({ collapsed }: Readonly<{ collapsed: boolean }>) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isExpanded = !collapsed;
  const role = (user as any)?.role;
  const canManageSettings = PAGE_ACCESS.settings({ role, can: () => false });
  const itemClassName =
    'flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => router.push(canManageSettings ? '/settings' : '/preferences')} className={itemClassName}>
          <Settings className="h-4 w-4 shrink-0" />
          {isExpanded && <span>{t('navigation.settings')}</span>}
      </button>
      <SignOutButton
        onSuccess={async () => {
          // The UI preference cookies outrank the signed-in user's stored
          // preferences, so they must not survive into the next person's
          // session on a shared machine.
          await clearNajmUiPreferences();
          router.push('/login');
        }}
      >
        <button type="button" className={itemClassName}>
          <LogOut className="h-4 w-4 shrink-0" />
          {isExpanded && <span>{t('navigation.logout')}</span>}
        </button>
      </SignOutButton>
    </div>
  );
}

/**
 * The sidebar and the page content are siblings, so the state they share has to
 * live above both — that is what `NSidebarProvider` is for, and what lets a
 * nested `NPageHeader` open the mobile drawer without the shell threading a
 * callback down to it.
 */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <NSidebarProvider mobileBreakpoint="lg">
      <DashboardShellContent>{children}</DashboardShellContent>
    </NSidebarProvider>
  );
}

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebar = useNSidebar();
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = (user as any)?.role ?? 'teacher';
  useRedirectOnSessionExpired(schoolApp.auth.loginRoute);

  const { can, permissions } = usePermissions();
  // `permissions` is the dependency: `can` reads the same session state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const navItems: NavItem[] = useMemo(() => createSidebarItems(t, { role: (user as any)?.role, can }), [user, permissions, t]);
  const [activeThemeSheet, setActiveThemeSheet] = useState<ThemeSettingsSheet | null>(null);

  return (
    <>
    <div className="flex h-screen w-full overflow-hidden   bg-background font-sans">
      <NSidebar
        // The render prop, rather than a second reading of the sidebar state:
        // the sidebar already knows whether it is collapsed and whether it is
        // rendering as the mobile drawer, where the expanded mark is correct
        // even though the desktop rail is collapsed.
        logo={({ collapsed, isMobile }) => {
          const showExpandedMark = isMobile || !collapsed;
          const mark = (
            <div className="flex min-w-0 items-center gap-2">
              <NThemeImage
                slot={showExpandedMark ? 'sidebarLogoExpanded' : 'sidebarLogoCollapsed'}
                alt="MyScolAI"
                className="h-12 w-12 min-w-12 object-contain"
              />
              {showExpandedMark && (
                <span className="truncate text-xl font-semibold leading-none text-sidebar-foreground">
                  MyScolAI
                </span>
              )}
            </div>
          );
          // At phone width the page header has no room for the year, so the
          // drawer carries it under the logo instead.
          return isMobile ? <>{mark}<ViewingYearSelector placement="sidebar" /></> : mark;
        }}
        // The drawer's header stacks the logo and the year at phone width.
        // Only the drawer renders below lg, so this never reaches the rail.
        classNames={{ sidebarHeader: 'max-sm:h-auto max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:pt-1 max-sm:pb-3' }}
        navItems={navItems}
        activePath={sidebarActivePath(pathname, navItems)}
        isActive={isNavItemActiveOrNested}
        linkComponent={NSidebarNextLink}
        onNavigate={(target) => {
          if (target === THEME_SETTINGS_NAV_ID || target === BRANDING_SETTINGS_NAV_ID) {
            sidebar?.closeMobile();
            setActiveThemeSheet(target === THEME_SETTINGS_NAV_ID ? 'theme' : 'branding');
          }
        }}
        footer={({ collapsed }) => <SidebarFooterContent collapsed={collapsed} />}
        mobileBreakpoint="lg"
        closeOnNavigate
      />

      <div className='dashboard-content flex min-w-0 flex-1 flex-col h-full min-h-0 gap-2 px-3 pt-2 pb-2 lg:px-2'>
        <ViewingYearBanner />
        {children}
      </div>


      <YearScopedChatbot
        settingsApiPath="/api/ai-settings"
        mcpApiPath="/api/mcp"
        testApiPath=""
        suggestions={[
          'List students who need attention',
          'Summarize recent fee activity',
          'Find today attendance issues',
          'Help me create a new student record',
        ]}
        theme={{ primary: 'var(--primary)', radius: 'var(--radius)' }}
      />
    </div>
    <ThemeSettingsSheets
      activeSheet={activeThemeSheet}
      onActiveSheetChange={setActiveThemeSheet}
      role={role}
    />
    </>
  );
}
