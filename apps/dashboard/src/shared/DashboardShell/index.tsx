'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  Banknote,
  BellRing,
  BookMarked,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  ClipboardList,
  FileText,
  GraduationCap,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Megaphone,
  Receipt,
  School,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Tag,
  TrendingDown,
  UserCheck,
  UserCog,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Chatbot } from 'najm-chatbot/react';
import { SignOutButton, useAuth } from 'najm-auth/client/react';
import { NSidebar, NSidebarProvider, useNSidebar, type NavItem } from 'najm-kit';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from '@/hooks/useLanguage';
import { clearSchoolUiPreferences } from '@/preferences/clearUiPreferences';

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
  // Fall back to English until new nav keys are compiled into the server locales.
  const tf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

return [
    ...(canUseTeacherRoutes
      ? [
        { id: '/', label: t('navigation.dashboard'), icon: LayoutDashboard, href: '/' },
        { id: '/students', label: t('navigation.students'), icon: UserRound, href: '/students' },
      ]
      : []),
    ...(canUseTeacherRoutes ? [{ id: '/parents', label: t('navigation.parents'), icon: UsersRound, href: '/parents' }] : []),
    ...(isAdmin
      ? [
        { id: '/teachers', label: t('navigation.teachers'), icon: GraduationCap, href: '/teachers' },
        { id: '/staff', label: t('navigation.staff'), icon: UserCog, href: '/staff' },
      ]
      : []),
    ...(!isAdmin && role === 'teacher' ? [{ id: '/teachers', label: t('navigation.teachers'), icon: GraduationCap, href: '/teachers' }] : []),
    ...(isAdmin
      ? [
        {
          id: 'financial',
          label: t('navigation.financial'),
          icon: Banknote,
          children: [
            { id: '/fees', label: t('navigation.fees'), icon: Receipt, href: '/fees' },
            { id: '/expenses', label: t('navigation.expenses'), icon: TrendingDown, href: '/expenses' },
            { id: '/payroll', label: t('navigation.payroll'), icon: HandCoins, href: '/payroll' },
            { id: '/fee-types', label: t('navigation.feeTypes'), icon: Tag, href: '/fee-types' },
            { id: '/reminders', label: t('navigation.reminders'), icon: BellRing, href: '/reminders' },
            { id: '/financial-operations', label: 'Operations', icon: LineChart, href: '/financial-operations' },
          ],
        },
      ]
      : []),
    ...(canUseTeacherRoutes
      ? [
        {
          id: 'attendance',
          label: t('navigation.attendance'),
          icon: CalendarCheck,
          children: [
            { id: '/attendance/students', label: t('navigation.studentAttendance'), icon: UserCheck, href: '/attendance/students' },
            ...(isAdmin
              ? [{ id: '/attendance/staff', label: t('navigation.staffAttendance'), icon: UserCog, href: '/attendance/staff' }]
              : []),
          ],
        },
        { id: '/announcements', label: t('navigation.announcements'), icon: Megaphone, href: '/announcements' },
        {
          id: 'student-conduct',
          label: t('navigation.studentConduct'),
          icon: ShieldCheck,
          children: [
            { id: '/discipline', label: t('navigation.discipline'), icon: ShieldAlert, href: '/discipline' },
            { id: '/behavior-rewards', label: t('navigation.behaviorRewards'), icon: Award, href: '/behavior-rewards' },
          ],
        },
        { id: '/assessments', label: t('navigation.assessments'), icon: ClipboardList, href: '/assessments' },
        { id: '/exams', label: t('navigation.exams'), icon: FileText, href: '/exams' },
        { id: '/grades', label: t('navigation.grades'), icon: Award, href: '/grades' },
        { id: '/calendar', label: t('navigation.calendar'), icon: CalendarDays, href: '/calendar' },
        { id: '/class-routines', label: tf('navigation.classRoutines', 'Routine'), icon: CalendarClock, href: '/class-routines' },
        {
          id: 'academic',
          label: t('navigation.academic'),
          icon: BookMarked,
          children: [
            { id: '/classes', label: t('navigation.classes'), icon: School, href: '/classes' },
            { id: '/sections', label: t('navigation.sections'), icon: LayoutGrid, href: '/sections' },
            { id: '/cycles', label: t('navigation.cycles'), icon: CalendarRange, href: '/cycles' },
            { id: '/subjects', label: t('navigation.subjects'), icon: BookOpen, href: '/subjects' },
          ],
        },
      ]
      : []),
    ...(isAdmin
      ? [
        {
          id: 'transport',
          label: t('navigation.transport'),
          icon: Bus,
          children: [
            { id: '/vehicles', label: t('navigation.vehicles'), icon: Bus, href: '/vehicles' },
          ],
        },
      ]
      : []),
    ...(isAdmin
      ? [
        {
          id: 'access-control',
          label: tf('navigation.accessControl', 'Access Control'),
          icon: ShieldCheck,
          children: [
            { id: '/roles', label: t('navigation.roles'), icon: ShieldCheck, href: '/roles' },
            { id: '/permissions', label: tf('navigation.permissions', 'Permissions'), icon: KeyRound, href: '/permissions' },
            { id: '/users', label: t('navigation.users'), icon: UserCog, href: '/users' },
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

function SidebarFooterContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  // The provider is the one source for collapsed state, so the footer reads it
  // rather than being handed an approximation of it from the shell.
  const isExpanded = !useNSidebar()?.collapsed;
  const role = (user as any)?.role;
  const canSeeSettings = role === 'admin' || role === 'principal';
  const itemClassName =
    'flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

  return (
    <div className="flex flex-col gap-1">
      {canSeeSettings && (
        <button type="button" onClick={() => router.push('/settings')} className={itemClassName}>
          <Settings className="h-4 w-4 shrink-0" />
          {isExpanded && <span>{t('navigation.settings')}</span>}
        </button>
      )}
      <SignOutButton
        onSuccess={async () => {
          // The UI preference cookies outrank the signed-in user's stored
          // preferences, so they must not survive into the next person's
          // session on a shared machine.
          await clearSchoolUiPreferences();
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
        footer={<SidebarFooterContent />}
        widths={{ expanded: 264 }}
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
