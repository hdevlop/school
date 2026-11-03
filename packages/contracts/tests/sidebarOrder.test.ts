import { describe, expect, it } from 'bun:test';
import { orderSidebarItems } from '../src/accessControl';

describe('role sidebar ordering', () => {
  const items = [{ id: '/dashboard' }, { id: 'attendance', children: [{ id: '/attendance/students' }, { id: '/attendance/staff' }] }, { id: '/students' }];

  it('orders groups and their own children without changing group membership', () => {
    const ordered = orderSidebarItems(items, ['/students', '/attendance/staff', 'attendance', '/attendance/students', '/dashboard']);
    expect(ordered.map((item) => item.id)).toEqual(['/students', 'attendance', '/dashboard']);
    expect(ordered[1].children?.map((item) => item.id)).toEqual(['/attendance/staff', '/attendance/students']);
    expect(items[1].children?.[0].id).toBe('/attendance/students');
  });

  it('restores defaults and keeps unsaved new items in their original relative order', () => {
    expect(orderSidebarItems(items, [])).toEqual(items);
    expect(orderSidebarItems(items, ['/students']).map((item) => item.id)).toEqual(['/students', '/dashboard', 'attendance']);
  });
});
