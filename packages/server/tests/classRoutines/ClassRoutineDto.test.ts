import { describe, expect, it } from 'bun:test';
import { createRoutineEntryDto, updateRoutineEntryDto } from '../../src/modules/classRoutines/ClassRoutineDto';

const base = {
  dayOfWeek: 'friday',
  periodId: 'h1',
  teacherAssignmentId: 'arabic-teacher',
};

describe('routine nested content contract', () => {
  it('accepts three fixed subjects and a fixed subject beside a rotating pair without nested times', () => {
    const groups = [
      { kind: 'fixed', label: ' التعبير الكتابي ' },
      { kind: 'alternative', options: ['مشروع الوحدة', 'الاجتماعيات'] },
    ];
    const result = createRoutineEntryDto.parse({ ...base, contentGroups: groups });
    expect(result.contentGroups).toEqual([
      { kind: 'fixed', label: 'التعبير الكتابي' },
      { kind: 'alternative', options: ['مشروع الوحدة', 'الاجتماعيات'] },
    ]);
    expect(createRoutineEntryDto.safeParse({ ...base, contentGroups: [
      { kind: 'fixed', label: 'Lecture' },
      { kind: 'fixed', label: 'Dictée' },
      { kind: 'fixed', label: 'Production écrite' },
    ] }).success).toBe(true);
  });

  it('rejects malformed OR pairs, blank labels, extra nested scheduling fields, and excess groups', () => {
    const invalid = [
      [{ kind: 'alternative', options: ['A'] }],
      [{ kind: 'alternative', options: ['A', ' A '] }],
      [{ kind: 'fixed', label: '   ' }],
      [{ kind: 'fixed', label: 'A', startTime: '08:00' }],
      Array.from({ length: 7 }, (_, index) => ({ kind: 'fixed', label: `Activity ${index}` })),
    ];
    for (const contentGroups of invalid) {
      expect(createRoutineEntryDto.safeParse({ ...base, contentGroups }).success).toBe(false);
    }
  });

  it('keeps omitted content absent on partial updates and allows an explicit clear', () => {
    expect(updateRoutineEntryDto.parse({ roomNumber: 'B2' })).toEqual({ roomNumber: 'B2' });
    expect(updateRoutineEntryDto.parse({ contentGroups: [], expectedVersion: 2 })).toEqual({ contentGroups: [], expectedVersion: 2 });
  });
});
