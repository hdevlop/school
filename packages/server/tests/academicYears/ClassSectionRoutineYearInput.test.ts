import { describe, expect, it } from 'bun:test';
import { createClassDto, createClassesBulkDto, updateClassDto } from '../../src/modules/classes/ClassDto';
import { createRoutineScheduleDto, routineListQuery } from '../../src/modules/classRoutines/ClassRoutineDto';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';

// A class, its sections and its timetables take the request's selected year.
// The database and transport suites (ClassesHistory*) prove the reads and
// writes; these pin that no input can name another year.
describe('class, section and routine year input', () => {
  it('drops a year named in a class or routine body', () => {
    const klass = { name: '6A', level: 'Middle', academicYear: '2020-2021' };
    expect(createClassDto.parse(klass)).not.toHaveProperty('academicYear');
    expect(updateClassDto.parse({ academicYear: '2020-2021' })).toEqual({});
    expect(createRoutineScheduleDto.parse({ sectionId: 's1', name: 'Week', academicYear: '2020-2021' }))
      .not.toHaveProperty('academicYear');
    expect(routineListQuery.parse({ sectionId: 's1', academicYear: '2020-2021' })).toEqual({ sectionId: 's1' });
  });

  it('keeps each class year in trusted seed data, which spans years', () => {
    expect(createClassesBulkDto.parse([{ name: '6A', level: 'Middle', academicYear: '2025-2026' }]))
      .toEqual([{ name: '6A', level: 'Middle', academicYear: '2025-2026' }]);
    expect(() => createClassesBulkDto.parse([{ name: '6A', level: 'Middle' }])).toThrow();
  });
});

describe("a teacher's routine", () => {
  it("refuses another teacher's schedule before reading", async () => {
    let read = false;
    const routines = new ClassRoutineService(
      { getTeacherScheduleIdsInSelectedYear: async () => { read = true; return []; } } as any,
      {} as any,
    );
    await expect(routines.getTeacherSchedule('teacher-2', { role: 'teacher', teacherId: 'teacher-1' }))
      .rejects.toThrow();
    expect(read).toBe(false);
    expect(await routines.getTeacherSchedule('teacher-1', { role: 'teacher', teacherId: 'teacher-1' })).toEqual([]);
    expect(read).toBe(true);
  });
});
