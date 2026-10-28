import { describe, expect, it } from 'bun:test';
import { compareStudentActivity, isStudentDisabled } from '@/features/Students/config/studentActivity';

describe('student list activity order', () => {
  it('puts departed students after all active students, before pagination', () => {
    const departed = ['withdrawn', 'transferred', 'graduated'].map((status, index) => ({
      id: `left-${index}`, enrollment: { status, leftOn: '2026-10-01' },
    }));
    const active = Array.from({ length: 20 }, (_, index) => ({
      id: `active-${index}`, enrollment: { status: 'active', leftOn: null },
    }));
    const records = [...departed, ...active];
    // Filtering makes the array the table sorts, leaving the query cache intact.
    const displayed = records.filter(() => true).sort(compareStudentActivity);
    expect(displayed.map(student => student.id)).toEqual([...active, ...departed].map(student => student.id));
    expect(displayed.slice(0, 15).some(isStudentDisabled)).toBe(false);
    expect(records.map(student => student.id)).toEqual([...departed, ...active].map(student => student.id));
  });

  it('uses enrollment activity in the viewed year instead of the global student status', () => {
    const activeInYear = { id: 'active-in-year', status: 'withdrawn', enrollment: { status: 'active', leftOn: null } };
    const leftOn = { id: 'left-on', status: 'active', enrollment: { status: 'active', leftOn: '2026-10-01' } };
    const withdrawn = { id: 'withdrawn', status: 'active', enrollment: { status: 'withdrawn', leftOn: null } };
    expect([leftOn, withdrawn, activeInYear].sort(compareStudentActivity).map(student => student.id))
      .toEqual(['active-in-year', 'left-on', 'withdrawn']);
  });
});
