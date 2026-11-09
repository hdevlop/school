import { describe, expect, it } from 'bun:test';

import { coversWholeSchool, formatAssignments } from '@/features/Staff/utils/staffAssignments';

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

  it('reads a job title signing in with a school-wide role, with no assignment, as the whole school', () => {
    expect(coversWholeSchool({ role: 'registrar', accessRole: 'registrar', assignments: [] })).toBe(true);
    expect(coversWholeSchool({ role: 'secretary', accessRole: 'secretary' })).toBe(true);
    // The access role decides, not the title's code.
    expect(coversWholeSchool({ role: 'librarian', accessRole: 'secretary' })).toBe(true);
    expect(coversWholeSchool({ role: 'registrar', accessRole: null })).toBe(false);
    // An assignment wins: an accountant's cycle is shown as it is.
    expect(coversWholeSchool({ role: 'accountant', accessRole: 'accounting', assignments: [{ type: 'accountant', cycleName: 'Primary School', current: true }] })).toBe(false);
    // Only ended assignments still count as none.
    expect(coversWholeSchool({ role: 'registrar', accessRole: 'registrar', assignments: [{ type: 'monitor', className: 'PS', current: false }] })).toBe(true);
    // A role limited to its classes never reads the whole school.
    expect(coversWholeSchool({ role: 'supervisor', accessRole: 'supervisor', assignments: [] })).toBe(false);
    expect(coversWholeSchool({ role: 'monitor', accessRole: 'monitor' })).toBe(false);
  });

  it('reads an accountant following every active cycle as the whole school', () => {
    const cycle = (cycleId: string, current = true) => ({ type: 'accountant', cycleId, cycleName: cycleId, current });
    const active = ['kg', 'primary', 'college'];
    expect(coversWholeSchool({ accessRole: 'accounting', assignments: active.map((id) => cycle(id)) }, active)).toBe(true);
    expect(coversWholeSchool({ accessRole: 'accounting', assignments: [cycle('kg'), cycle('primary')] }, active)).toBe(false);
    // An ended cycle does not count toward every cycle.
    expect(coversWholeSchool({ accessRole: 'accounting', assignments: [cycle('kg'), cycle('primary'), cycle('college', false)] }, active)).toBe(false);
    // Without the cycle list the cycles are listed as they are.
    expect(coversWholeSchool({ accessRole: 'accounting', assignments: active.map((id) => cycle(id)) })).toBe(false);
  });
});
