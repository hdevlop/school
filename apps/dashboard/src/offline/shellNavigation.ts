import { filterNavItems, type NavItem } from 'najm-kit';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { createNavigationItems } from '@/shared/schoolNavigation';
import type { ShellRoute } from './bootstrap';

/**
 * The online sidebar for the prepared pages: its groups, icons and labels in
 * the current language. Permissions were checked online when the routes were
 * prepared; the shell only draws them, so a page that was not prepared stays
 * hidden.
 */
export function createShellNavItems(t: (key: string) => string, role: string | undefined, routes: readonly ShellRoute[]): NavItem[] {
  const prepared = new Set(routes.map(route => route.href));
  const home: NavItem[] = prepared.has('/home') ? [{ id: '/home', href: '/home', label: t('mobileHome.title'), icon: FEATURE_ICONS.home }] : [];
  return [...home, ...filterNavItems(createNavigationItems(t, { role, can: () => false }),
    item => !!item.children || (!!item.href && prepared.has(item.href)), ['access'])];
}

/** The label a nav item shows for a page, searched through its groups. */
export function navLabel(items: readonly NavItem[], href: string | undefined): string | undefined {
  if (!href) return undefined;
  for (const item of items) {
    if (item.href === href) return String(item.label);
    const nested = item.children && navLabel(item.children, href);
    if (nested) return nested;
  }
  return undefined;
}
