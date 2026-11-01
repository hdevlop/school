import { describe, expect, it } from 'bun:test';
import { createRoutineEntryDto, routineBulkLayoutDto, updateRoutineEntryDto } from '../../src/modules/classRoutines/ClassRoutineDto';

const base = {
  dayOfWeek: 'friday',
  periodId: 'h1',
  subjectId: 'arabic',
  teacherAssignmentId: 'arabic-teacher',
};

describe('bulk routine layout contract', () => {
  const periods = [{ type: 'lesson', name: 'Period 1', startTime: '08:30', endTime: '09:30' }];
  it('requires explicit targets and keeps the shared layout validation', () => {
    expect(routineBulkLayoutDto.parse({ scheduleIds: ['one', 'two'], periods }).scheduleIds).toEqual(['one', 'two']);
    expect(routineBulkLayoutDto.safeParse({ scheduleIds: [], periods }).success).toBe(false);
    expect(routineBulkLayoutDto.safeParse({ periods }).success).toBe(false);
    expect(routineBulkLayoutDto.safeParse({ scheduleIds: ['one'], periods: [{ ...periods[0], endTime: '08:00' }] }).success).toBe(false);
    expect(routineBulkLayoutDto.safeParse({ scheduleIds: ['one'], periods: [...periods, ...periods] }).success).toBe(false);
    expect(routineBulkLayoutDto.safeParse({ scheduleIds: ['one'], periods: [{ ...periods[0], type: 'break' }] }).success).toBe(false);
  });
});

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

  it('needs a subject and takes a teacher only optionally', () => {
    const { teacherAssignmentId: _teacher, ...subjectOnly } = base;
    expect(createRoutineEntryDto.safeParse(subjectOnly).success).toBe(true);
    expect(createRoutineEntryDto.safeParse({ ...subjectOnly, teacherAssignmentId: null }).success).toBe(true);
    const { subjectId: _subject, ...teacherOnly } = base;
    expect(createRoutineEntryDto.safeParse(teacherOnly).success).toBe(false);
    expect(updateRoutineEntryDto.parse({ teacherAssignmentId: null })).toEqual({ teacherAssignmentId: null });
  });

  it('keeps omitted content absent on partial updates and allows an explicit clear', () => {
    expect(updateRoutineEntryDto.parse({ roomNumber: 'B2' })).toEqual({ roomNumber: 'B2' });
    expect(updateRoutineEntryDto.parse({ contentGroups: [], expectedVersion: 2 })).toEqual({ contentGroups: [], expectedVersion: 2 });
  });
});
