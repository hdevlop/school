'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { Chatbot } from 'najm-chatbot/react';
import { SignOutButton, useAuth } from 'najm-auth/client/react';
import { NSidebar, NSidebarProvider, type NavItem } from 'najm-kit';
import { clearNajmUiPreferences } from 'najm-kit/server';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';

const LinkAdapter = ({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
}) => {
  const pathname = usePathname();
  const hrefPath = href.split(/[?#]/)[0] || '/';

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (pathname === hrefPath) {
      event.preventDefault();
    }

    onClick?.(event);
  };

  return (
    <Link href={href} prefetch={false} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
};

const createSidebarItems = (t: (key: string) => string, role: string): NavItem[] => {
  const isAdmin = role === 'admin';
  const canUseTeacherRoutes = role === 'teacher' || isAdmin;
  // Fall back to English for a nav key the shared catalog does not define yet.
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

return [
    { id: '/notifications', label: t('notifications.inbox'), icon: FEATURE_ICONS.notifications, href: '/notifications' },
    ...(canUseTeacherRoutes
      ? [
        { id: '/', label: t('navigation.dashboard'), icon: FEATURE_ICONS.dashboard, href: '/' },
        { id: '/students', label: t('navigation.students'), icon: FEATURE_ICONS.students, href: '/students' },
      ]
      : []),
    ...(canUseTeacherRoutes ? [{ id: '/parents', label: t('navigation.parents'), icon: FEATURE_ICONS.parents, href: '/parents' }] : []),
    ...(isAdmin
      ? [
        { id: '/teachers', label: t('navigation.teachers'), icon: FEATURE_ICONS.teachers, href: '/teachers' },
        { id: '/staff', label: t('navigation.staff'), icon: FEATURE_ICONS.staff, href: '/staff' },
      ]
      : []),
    ...(!isAdmin && role === 'teacher' ? [{ id: '/teachers', label: t('navigation.teachers'), icon: FEATURE_ICONS.teachers, href: '/teachers' }] : []),
    ...(isAdmin
      ? [
        {
          id: 'financial',
          label: t('navigation.financial'),
          icon: FEATURE_ICONS.financial,
          children: [
            { id: '/fees', label: t('navigation.fees'), icon: FEATURE_ICONS.fees, href: '/fees' },
            { id: '/expenses', label: t('navigation.expenses'), icon: FEATURE_ICONS.expenses, href: '/expenses' },
            { id: '/payroll', label: t('navigation.payroll'), icon: FEATURE_ICONS.payroll, href: '/payroll' },
            { id: '/fee-types', label: t('navigation.feeTypes'), icon: FEATURE_ICONS.feeTypes, href: '/fee-types' },
            { id: '/reminders', label: t('navigation.reminders'), icon: FEATURE_ICONS.reminders, href: '/reminders' },
            { id: '/financial-operations', label: 'Operations', icon: FEATURE_ICONS.financialOperations, href: '/financial-operations' },
          ],
        },
      ]
      : []),
    ...(canUseTeacherRoutes
      ? [
        {
          id: 'attendance',
          label: t('navigation.attendance'),
          icon: FEATURE_ICONS.attendance,
          children: [
            { id: '/attendance/students', label: t('navigation.studentAttendance'), icon: FEATURE_ICONS.studentAttendance, href: '/attendance/students' },
            ...(isAdmin
              ? [{ id: '/attendance/staff', label: t('navigation.staffAttendance'), icon: FEATURE_ICONS.staffAttendance, href: '/attendance/staff' }]
              : []),
          ],
        },
        { id: '/announcements', label: t('navigation.announcements'), icon: FEATURE_ICONS.announcements, href: '/announcements' },
        {
          id: 'student-conduct',
          label: t('navigation.studentConductShort'),
          icon: FEATURE_ICONS.studentConduct,
          children: [
            { id: '/discipline', label: t('navigation.discipline'), icon: FEATURE_ICONS.discipline, href: '/discipline' },
            { id: '/behavior-rewards', label: t('navigation.behaviorRewardsShort'), icon: FEATURE_ICONS.behaviorRewards, href: '/behavior-rewards' },
          ],
        },
        { id: '/assessments', label: t('navigation.assessments'), icon: FEATURE_ICONS.assessments, href: '/assessments' },
        { id: '/exams', label: t('navigation.exams'), icon: FEATURE_ICONS.exams, href: '/exams' },
        { id: '/grades', label: t('navigation.grades'), icon: FEATURE_ICONS.grades, href: '/grades' },
        { id: '/calendar', label: t('navigation.calendar'), icon: FEATURE_ICONS.calendar, href: '/calendar' },
        { id: '/class-routines', label: tf('navigation.classRoutines', 'Routine'), icon: FEATURE_ICONS.classRoutines, href: '/class-routines' },
        {
          id: 'academic',
          label: t('navigation.academic'),
          icon: FEATURE_ICONS.academic,
          children: [
            { id: '/classes', label: t('navigation.classes'), icon: FEATURE_ICONS.classes, href: '/classes' },
            { id: '/sections', label: t('navigation.sections'), icon: FEATURE_ICONS.sections, href: '/sections' },
            { id: '/cycles', label: t('navigation.cycles'), icon: FEATURE_ICONS.cycles, href: '/cycles' },
            { id: '/subjects', label: t('navigation.subjects'), icon: FEATURE_ICONS.subjects, href: '/subjects' },
          ],
        },
      ]
      : []),
    ...(isAdmin
      ? [
        {
          id: 'transport',
          label: t('navigation.transport'),
          icon: FEATURE_ICONS.transport,
          children: [
            { id: '/vehicles', label: t('navigation.vehicles'), icon: FEATURE_ICONS.vehicles, href: '/vehicles' },
          ],
        },
      ]
      : []),
    ...(isAdmin
      ? [
        {
          id: 'access-control',
          label: tf('navigation.accessControl', 'Access Control'),
          icon: FEATURE_ICONS.accessControl,
          children: [
            { id: '/roles', label: t('navigation.roles'), icon: FEATURE_ICONS.roles, href: '/roles' },
            { id: '/permissions', label: tf('navigation.permissions', 'Permissions'), icon: FEATURE_ICONS.permissions, href: '/permissions' },
            { id: '/users', label: t('navigation.users'), icon: FEATURE_ICONS.users, href: '/users' },
          ],
        },
      ]
      : []),
  ];
};

function isSidebarItemActive(item: NavItem, activePath: string) {
  if (!item.href) return false;
  if (item.href === '/') return activePath === '/';
  return activePath === item.href || activePath.startsWith(`${item.href}/`);
}

function SidebarFooterContent({ collapsed }: Readonly<{ collapsed: boolean }>) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isExpanded = !collapsed;
  const role = (user as any)?.role;
  const canManageSettings = role === 'admin' || role === 'principal';
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
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = (user as any)?.role ?? 'teacher';

  const navItems: NavItem[] = useMemo(() => createSidebarItems(t, role), [role, t]);

  return (
    <div className="flex h-screen w-full overflow-hidden  gap-2 bg-background font-sans">
      <NSidebar
        // The render prop, rather than a second reading of the sidebar state:
        // the sidebar already knows whether it is collapsed and whether it is
        // rendering as the mobile drawer, where the expanded mark is correct
        // even though the desktop rail is collapsed.
        logo={({ collapsed, isMobile }) => {
          const showExpandedMark = isMobile || !collapsed;
          return (
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
        }}
        navItems={navItems}
        activePath={pathname}
        isActive={isSidebarItemActive}
        linkComponent={LinkAdapter}
        footer={({ collapsed }) => <SidebarFooterContent collapsed={collapsed} />}
        mobileBreakpoint="lg"
        closeOnNavigate
      />

      <div className='flex flex-col w-full h-full min-h-0 gap-2 py-2'>
        {children}
      </div>


      <Chatbot
        apiPath="/api/chat"
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
  );
}
