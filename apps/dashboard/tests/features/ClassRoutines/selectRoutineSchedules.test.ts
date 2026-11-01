import { describe, expect, it } from 'bun:test';
import type { RoutineScheduleSummary } from '@/features/ClassRoutines/types';
import { selectClassRoutineSchedules, selectRoutineSchedules } from '@/features/ClassRoutines/utils/selectRoutineSchedules';

function schedule(id: string, sectionId: string, status: RoutineScheduleSummary['status']): RoutineScheduleSummary {
  return { id, sectionId, status, classId: 'class', className: 'CP', sectionName: sectionId,
    academicYear: '2026-2027', name: id, activeDays: ['monday'] };
}

describe('routines shown across classes', () => {
  it('targets every section of selected classes once, using its current timetable', () => {
    const schedules = [schedule('a-draft', 'a', 'draft'), schedule('a-live', 'a', 'published'), schedule('b-live', 'b', 'published'),
      { ...schedule('c-live', 'c', 'published'), classId: 'other-class' }];
    expect(selectClassRoutineSchedules(['class', 'class'], schedules).map((item) => item.id)).toEqual(['a-live', 'b-live']);
    expect(selectClassRoutineSchedules(['other-class', 'class'], schedules).map((item) => item.id)).toEqual(['c-live', 'a-live', 'b-live']);
    expect(selectClassRoutineSchedules([], schedules)).toEqual([]);
  });
  it('keeps section order and chooses the published week ahead of a newer draft', () => {
    const schedules = [schedule('b-draft', 'b', 'draft'), schedule('a-draft', 'a', 'draft'), schedule('a-live', 'a', 'published')];
    expect(selectRoutineSchedules(['a', 'b'], schedules).map((item) => item?.id)).toEqual(['a-live', 'b-draft']);
  });

  it('uses the latest draft in server order and leaves sections without a routine empty', () => {
    const schedules = [schedule('latest', 'a', 'draft'), schedule('older', 'a', 'draft'), schedule('old-year', 'other', 'published')];
    expect(selectRoutineSchedules(['missing', 'a'], schedules).map((item) => item?.id)).toEqual([undefined, 'latest']);
  });

  it('does not select archived weeks', () => {
    expect(selectRoutineSchedules(['a'], [schedule('archived', 'a', 'archived')])).toEqual([undefined]);
  });
});
