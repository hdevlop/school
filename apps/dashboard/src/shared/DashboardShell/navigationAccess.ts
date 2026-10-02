import type { NavItem } from 'najm-kit';
import { PAGE_ACCESS, type PageAccess, type PageViewer } from '../pageAccess';

// Who sees each sidebar page: the guard on the page's main list route, stated
// here the same way. A role sees a page because its permissions (the roles
// screen) or its role group admit it, not because of a list of role names in
// the menu. The server stays the authority: a hidden page is still refused by
// its route, and a shown one can still refuse a record. When a route's guard
// changes, change its entry here.

export type NavViewer = PageViewer;
export const NAV_ACCESS = PAGE_ACCESS;
export type NavAccess = PageAccess;

/** A sidebar entry with the page rule that decides whether it is shown. */
export type GatedNavItem = Omit<NavItem, 'children'> & {
  access?: NavAccess;
  children?: GatedNavItem[];
};

/**
 * The entries this viewer may open. An entry without `access` is always shown;
 * a group is shown when at least one of its entries is.
 */
export function visibleNavItems(items: readonly GatedNavItem[], viewer: NavViewer): NavItem[] {
  return items.flatMap(({ access, children, ...item }) => {
    if (access && !NAV_ACCESS[access](viewer)) return [];
    if (!children) return [item as NavItem];
    const visible = visibleNavItems(children, viewer);
    return visible.length ? [{ ...item, children: visible } as NavItem] : [];
  });
}
