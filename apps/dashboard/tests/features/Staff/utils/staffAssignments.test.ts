import { describe, expect, it } from 'bun:test';

import { formatAssignments } from '@/features/Staff/utils/staffAssignments';

describe('staff assignments', () => {
  it('names a floor manager by the grades they run, current ones only', () => {
    const staff = {
      assignments: [
        { type: 'floorManager', className: 'PS', current: true },
        { type: 'floorManager', className: 'MS', current: true },
        { type: 'floorManager', className: 'GS', current: false },
      ],
    };
    expect(formatAssignments(staff)).toBe('PS, MS');
  });
});
