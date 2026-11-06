import { describe, expect, it } from 'bun:test';

import { formatAssignments } from '@/features/Staff/utils/staffAssignments';

describe('staff assignments', () => {
  it('shows a supervisor\'s assigned classes and leaves ended responsibilities out', () => {
    expect(formatAssignments({ assignments: [
      { type: 'supervisor', classId: 'cp', className: 'CP', current: true },
      { type: 'supervisor', classId: 'ce1', className: 'CE1', current: true },
      { type: 'supervisor', classId: 'old', className: 'PS', current: false },
    ] })).toBe('CP, CE1');
  });

  it('names a monitor by the grades they run, current ones only', () => {
    const staff = {
      assignments: [
        { type: 'monitor', className: 'PS', current: true },
        { type: 'monitor', className: 'MS', current: true },
        { type: 'monitor', className: 'GS', current: false },
      ],
    };
    expect(formatAssignments(staff)).toBe('PS, MS');
  });
});
