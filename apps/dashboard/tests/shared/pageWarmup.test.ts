import { describe, expect, it } from 'bun:test';
import { matchPermission } from 'najm-auth/client';
import { createSidebarItems } from '@/shared/schoolNavigation';
import { navHrefs, warmupPages, WARMUP_PAGE_LIMIT, WARMUP_PRIORITY } from '@/shared/PageWarmup/warmupPages';
import { WARMABLE_PAGES } from '@/shared/PageWarmup/pageReads';

const viewer = (role: string, permissions: string[]) => ({ role, can: (name: string) => matchPermission(permissions, name) });
const warmed = (role: string, permissions: string[]) => warmupPages(navHrefs(createSidebarItems((key) => key, viewer(role, permissions))));

describe('page warm-up', () => {
  it('warms only pages the account sidebar lists, most used first', () => {
    const teacher = ['read:dashboard', 'read:students', 'read:classes', 'read:sections', 'read:attendance', 'read:grades',
      'read:assessments', 'read:exams', 'read:announcements', 'read:alerts', 'read:discipline', 'read:behavior-rewards', 'read:events'];
    expect(warmed('teacher', teacher)).toEqual(['/attendance/students', '/students', '/grades', '/assessments', '/announcements', '/alerts']);

    // A parent's sidebar has no register or marks list: those live in the child's profile.
    const parent = ['read:students', 'read:classes', 'read:sections', 'read:attendance', 'read:grades', 'read:assessments',
      'read:announcements', 'read:alerts', 'read:discipline', 'read:behavior-rewards', 'read:events'];
    expect(warmed('parent', parent)).toEqual(['/students', '/assessments', '/announcements', '/alerts', '/discipline', '/behavior-rewards']);

    expect(warmed('accounting', ['read:dashboard', 'read:students', 'read:fees', 'read:expenses'])).toEqual(['/students', '/fees', '/expenses']);
  });

  it('stops at the page limit', () => {
    expect(warmed('admin', ['*:*'])).toEqual(WARMUP_PRIORITY.slice(0, WARMUP_PAGE_LIMIT));
  });

  it('names only sidebar pages, each with opening reads', () => {
    const adminPages = navHrefs(createSidebarItems((key) => key, viewer('admin', ['*:*'])));
    for (const href of WARMUP_PRIORITY) {
      expect(adminPages).toContain(href);
      expect(WARMABLE_PAGES).toContain(href);
    }
  });
});
