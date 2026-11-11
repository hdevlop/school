import { describe, expect, it } from 'bun:test';
import { sidebarItemIds } from '@sms/contracts/access-control';
import { hiddenSidebarPageCount, mergeSidebarReorder, reachableSidebarItems } from '@/features/Roles/config/sidebarLayout';

type Node = { id: string; children?: Node[] };

// A teacher reaches the dashboard, students, and student attendance only.
const menu: Node[] = [
  { id: '/dashboard' },
  { id: '/students' },
  { id: '/staff' },
  { id: 'attendance', children: [{ id: '/attendance/students' }, { id: '/attendance/staff' }] },
  { id: 'financial', children: [{ id: '/fees' }, { id: '/expenses' }] },
  { id: '/teachers' },
];
const teacherPages = new Set(['/dashboard', '/students', '/attendance/students', '/teachers']);
const shown = reachableSidebarItems(menu, (page) => teacherPages.has(page.id));
const ids = (items: Node[]) => sidebarItemIds(items) as string[];

describe('role menu editor', () => {
  it('offers only the pages the role can open, and the groups that hold one', () => {
    expect(ids(shown)).toEqual(['/dashboard', '/students', 'attendance', '/attendance/students', '/teachers']);
    expect(hiddenSidebarPageCount(menu, shown)).toBe(4);
  });

  it('keeps every hidden page in its place when the shown ones are reordered', () => {
    // Shown: dashboard, students, attendance, teachers. Teachers moved to the top;
    // the shown items fill the shown items' places, Staff and Financial stay put.
    const reordered = [shown[3], shown[0], shown[1], shown[2]];
    expect(ids(mergeSidebarReorder(menu, reordered))).toEqual([
      '/teachers', '/dashboard', '/staff', '/students', 'financial', '/fees', '/expenses', 'attendance', '/attendance/students', '/attendance/staff',
    ]);
  });

  it('reorders inside a group without moving its hidden pages', () => {
    const fullGroup: Node[] = [{ id: 'g', children: [{ id: 'a' }, { id: 'hidden' }, { id: 'b' }] }];
    const visible = reachableSidebarItems(fullGroup, (page) => page.id !== 'hidden');
    const swapped = [{ ...visible[0], children: [visible[0].children![1], visible[0].children![0]] }];
    expect(ids(mergeSidebarReorder(fullGroup, swapped))).toEqual(['g', 'b', 'hidden', 'a']);
  });

  it('changes nothing when nothing moved, and drops nothing', () => {
    expect(mergeSidebarReorder(menu, shown)).toEqual(menu);
    expect(reachableSidebarItems(menu, () => true)).toEqual(menu);
    expect(hiddenSidebarPageCount(menu, menu)).toBe(0);
  });
});
