'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { YearScopedChatbot } from '@/features/Chat/components/YearScopedChatbot';
import { SignOutButton, useAuth, usePermissions, useRedirectOnSessionExpired } from 'najm-auth/client/react';
import { cn, isNavItemActiveOrNested, NSidebar, NSidebarProvider, useCardViewport, useMediaQuery, useNSidebar, type NavItem } from 'najm-kit';
import { NSidebarNextLink } from 'najm-kit/next';
import { clearNajmUiPreferences } from 'najm-kit/server';
import { NThemeImage } from 'najm-theme/react';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { sidebarEntryVisible } from '@sms/contracts/access-control';
import { PAGE_ACCESS } from '@/shared/pageAccess';
import { BRANDING_SETTINGS_NAV_ID, THEME_SETTINGS_NAV_ID, createSidebarItems } from '@/shared/schoolNavigation';
import { schoolApp } from '@/najm.config';
import { ThemeSettingsSheets, type ThemeSettingsSheet } from '@/features/Settings/components/ThemeSettingsSheets';
import { SchoolSettingsSheet } from '@/features/Settings/components/SchoolSettingsSheet';
import { ViewingYearBanner } from '@/features/AcademicYears/components/ViewingYearBanner';
import { ViewingYearSelector } from '@/features/AcademicYears/components/ViewingYearSelector';
import { PushPromptBanner } from '@/features/Notifications/PushPromptBanner';
import { NavigationActionsProvider } from './NavigationActions';

const STUDENT_FEES_PATH = /^\/students\/[^/]+\/fees(?:\/|$)/;

function hasNavHref(items: NavItem[], href: string): boolean {
  return items.some((item) => item.href === href || (item.children ? hasNavHref(item.children, href) : false));
}

/**
 * A student's fee record lives at `/students/[id]/fees` but belongs to Fees, so
 * it highlights Fees wherever it was opened from. Parents and students have no
 * Fees item and reach it through their own profile, which stays highlighted.
 */
function sidebarActivePath(pathname: string, navItems: NavItem[], isMobile: boolean) {
  if (pathname === '/home') return isMobile ? '/home' : '/dashboard';
  return STUDENT_FEES_PATH.test(pathname) && hasNavHref(navItems, '/fees') ? '/fees' : pathname;
}

function SidebarFooterContent({ collapsed, onOpenSettings }: Readonly<{ collapsed: boolean; onOpenSettings: () => void }>) {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { t } = useTranslation();
  const isExpanded = !collapsed;
  const role = (user as any)?.role;
  const canManageSettings = PAGE_ACCESS.settings({ role, can });
  const itemClassName =
    'flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

  return (
    <div className="flex flex-col gap-1">
      {sidebarEntryVisible(can, 'settings:preferences') && <button type="button" aria-label={t('navigation.settings')} title={collapsed ? t('navigation.settings') : undefined} onClick={() => (canManageSettings ? onOpenSettings() : router.push('/preferences'))} className={itemClassName}>
          <Settings className="h-4 w-4 shrink-0" />
          {isExpanded && <span>{t('navigation.settings')}</span>}
      </button>}
      <SignOutButton
        onSuccess={async () => {
          // The UI preference cookies outrank the signed-in user's stored
          // preferences, so they must not survive into the next person's
          // session on a shared machine.
          await clearNajmUiPreferences();
          // A document navigation, not router.push: the client router would
          // keep this page in its cache and history, and Back would restore a
          // dashboard whose requests are now refused, stuck on its loader.
          window.location.replace('/login');
        }}
      >
        <button type="button" aria-label={t('navigation.logout')} title={collapsed ? t('navigation.logout') : undefined} className={itemClassName}>
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
    <NSidebarProvider mobileBreakpoint="md">
      <DashboardShellContent>{children}</DashboardShellContent>
    </NSidebarProvider>
  );
}

function DashboardShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebar = useNSidebar();
  const compactSidebar = useMediaQuery('(max-width: 1279px)');
  const isMobile = useCardViewport();
  const isHome = pathname === '/home';
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = (user as any)?.role ?? 'teacher';
  useRedirectOnSessionExpired(schoolApp.auth.loginRoute);

  const { can } = usePermissions();
  const navItems: NavItem[] = [
    ...(isMobile ? [{ id: '/home', href: '/home', label: t('mobileHome.title'), icon: FEATURE_ICONS.home }] : []),
    ...createSidebarItems(t, { role: (user as any)?.role, can }),
  ];
  const [activeThemeSheet, setActiveThemeSheet] = useState<ThemeSettingsSheet | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canManageSettings = PAGE_ACCESS.settings({ role: (user as any)?.role, can });

  return (
    <NavigationActionsProvider value={{ openThemeSettings: (sheet) => { sidebar?.closeMobile(); setActiveThemeSheet(sheet); } }}>
    <div className="flex h-dvh w-full overflow-hidden bg-background font-sans">
      <NSidebar
        // Phones use the drawer; tablets and small laptops retain the icon rail.
        collapsed={compactSidebar || sidebar?.collapsed}
        onCollapsedChange={sidebar?.setCollapsed}
        showCollapseButton={!compactSidebar}
        hamburgerLabel={t('navigation.openSidebar')}
        closeLabel={t('navigation.closeSidebar')}
        collapseLabel={t('navigation.collapseSidebar')}
        expandLabel={t('navigation.expandSidebar')}
        // The render prop, rather than a second reading of the sidebar state:
        // the sidebar already knows whether it is collapsed and whether it is
        // rendering as the mobile drawer, where the expanded mark is correct
        // even though the desktop rail is collapsed.
        logo={({ collapsed, isMobile }) => {
          const showExpandedMark = isMobile || !collapsed;
          const mark = (
            <div className="flex w-full min-w-0 items-center justify-center">
              <NThemeImage
                slot={showExpandedMark ? 'sidebarLogoExpanded' : 'sidebarLogoCollapsed'}
                alt="MyScolAI"
                className={showExpandedMark ? 'h-20 w-20 min-w-20 object-contain' : 'h-12 w-12 min-w-12 object-contain'}
              />
            </div>
          );
          // At phone width the page header has no room for the year, so the
          // drawer carries it under the logo instead.
          return isMobile ? <>{mark}<ViewingYearSelector placement="sidebar" /></> : mark;
        }}
        // The expanded phone drawer stacks the logo and year; the compact
        // rail renders only its logo in the same header slot.
        classNames={{
          sidebarHeader: 'h-24 min-h-24 border-b-0 max-sm:h-auto max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:pt-1 max-sm:pb-3',
          sidebarItem: '[[data-slot=popover-content]_&]:[--sidebar-foreground:var(--popover-foreground)]',
        }}
        navItems={navItems}
        activePath={sidebarActivePath(pathname, navItems, isMobile)}
        isActive={isNavItemActiveOrNested}
        linkComponent={NSidebarNextLink}
        onNavigate={(target) => {
          if (target === THEME_SETTINGS_NAV_ID || target === BRANDING_SETTINGS_NAV_ID) {
            sidebar?.closeMobile();
            setActiveThemeSheet(target === THEME_SETTINGS_NAV_ID ? 'theme' : 'branding');
          }
        }}
        footer={({ collapsed }) => (
          <SidebarFooterContent
            collapsed={collapsed}
            onOpenSettings={() => { sidebar?.closeMobile(); setSettingsOpen(true); }}
          />
        )}
        mobileBreakpoint="md"
        closeOnNavigate
      />

      <div className={cn('dashboard-content flex min-w-0 flex-1 flex-col h-full min-h-0', isHome ? 'gap-0 lg:gap-2 lg:px-2 lg:pt-2 lg:pb-2' : 'gap-2 px-3 pt-2 pb-2 lg:px-2')}>
        <ViewingYearBanner />
        <PushPromptBanner />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>


      <YearScopedChatbot
        settingsApiPath="/api/ai-settings"
        mcpApiPath="/api/mcp"
        testApiPath=""
        suggestions={[
          t('chatbot.suggestions.studentsAttention'),
          t('chatbot.suggestions.feeActivity'),
          t('chatbot.suggestions.attendanceIssues'),
          t('chatbot.suggestions.createStudent'),
        ]}
        theme={{ primary: 'var(--primary)', radius: 'var(--radius)' }}
      />
    </div>
    <ThemeSettingsSheets
      activeSheet={activeThemeSheet}
      onActiveSheetChange={setActiveThemeSheet}
      role={role}
    />
    {canManageSettings && (
      <SchoolSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} onLeave={() => setSettingsOpen(false)} />
    )}
    </NavigationActionsProvider>
  );
}
