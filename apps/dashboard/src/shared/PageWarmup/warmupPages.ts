import type { NavItem } from 'najm-kit';

/**
 * The pages a school opens most in a day, most used first: the registers, the
 * student list, fees and marks. Each has its opening reads in `pageReads.ts`.
 * The warm-up keeps those the account's own sidebar lists, so a role is
 * warmed only for pages it can open: a teacher gets the register, students
 * and marks, a parent their children and the school's news, an accountant fees.
 */
export const WARMUP_PRIORITY = [
  '/attendance/students',
  '/students',
  '/fees',
  '/grades',
  '/attendance/staff',
  '/assessments',
  '/announcements',
  '/alerts',
  '/discipline',
  '/behavior-rewards',
  '/parents',
  '/teachers',
  '/expenses',
  '/calendar',
] as const;

/** How many pages one app open warms, one after another. */
export const WARMUP_PAGE_LIMIT = 6;

/** Every page a sidebar links to, in its order. */
export function navHrefs(items: readonly NavItem[]): string[] {
  return items.flatMap((item) => [...(item.href ? [item.href] : []), ...(item.children ? navHrefs(item.children) : [])]);
}

/** The pages to warm for an account whose sidebar lists `sidebarHrefs`, most used first. */
export function warmupPages(sidebarHrefs: readonly string[], limit = WARMUP_PAGE_LIMIT): string[] {
  const listed = new Set(sidebarHrefs);
  return WARMUP_PRIORITY.filter((href) => listed.has(href)).slice(0, limit);
}
