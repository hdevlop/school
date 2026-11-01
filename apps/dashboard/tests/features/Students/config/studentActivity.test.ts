import { describe, expect, it } from 'bun:test';
import { compareStudentActivity, compareStudentListRows, isStudentDisabled } from '@/features/Students/config/studentActivity';

describe('student list activity order', () => {
  it('starts at PS, MS and GS, then follows school progression and leaves departed students last', () => {
    const levels = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6', '1AC', '2AC', '3AC', 'TC', '1BAC', '2BAC'];
    const current = levels.map(level => ({
      name: level, class: { name: level }, section: { name: 'A' }, enrollment: { status: 'active', leftOn: null },
    }));
    const departed = { name: 'Left PS', class: { name: 'PS' }, enrollment: { status: 'withdrawn', leftOn: '2026-10-01' } };
    const records = [departed, ...current.toReversed()];
    expect(records.toSorted(compareStudentListRows).map(student => student.name)).toEqual([...levels, 'Left PS']);
    expect(records[0]).toBe(departed);
  });

  it('groups equivalent class codes by section and student name', () => {
    const records = [
      { name: 'Zineb', class: { name: 'CP' }, section: { name: 'A' } },
      { name: 'Aya', class: { name: 'CP' }, section: { name: 'B' } },
      { name: 'Amine', class: { name: '1APG' }, section: { name: 'A' } },
      { name: 'Salma', class: { name: 'GS' }, section: { name: 'A' } },
    ];
    expect(records.toSorted(compareStudentListRows).map(student => student.name)).toEqual(['Salma', 'Amine', 'Zineb', 'Aya']);
  });

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
