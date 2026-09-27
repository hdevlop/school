import { describe, expect, it } from 'bun:test';
import { ClassRoutineService } from '../../src/modules/classRoutines/ClassRoutineService';
import { routineListQuery } from '../../src/modules/classRoutines/ClassRoutineDto';

function service(repository: Record<string, unknown>) {
  return new ClassRoutineService(repository as any, {} as any, {} as any);
}

const oldYear = { id: 'year-old', label: '2025-2026' } as any;

describe('routine read year query', () => {
  it('accepts only a school-year label', () => {
    expect(routineListQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(() => routineListQuery.parse({ academicYear: '2025' })).toThrow();
    expect(() => routineListQuery.parse({ academicYear: 'all' })).toThrow();
  });
});

describe('routine reads follow the resolved year', () => {
  it('lists schedules by the resolved label, whatever label the filters carry', async () => {
    const calls: unknown[] = [];
    const routines = service({ list: async (filters: unknown) => { calls.push(filters); return []; } });
    await routines.list({ sectionId: 'section-1', academicYear: '2020-2021', status: 'published' }, oldYear);
    expect(calls).toEqual([{ sectionId: 'section-1', academicYear: '2025-2026', status: 'published' }]);
  });

  it("reads the section's published schedule of the resolved year", async () => {
    const calls: unknown[] = [];
    const routines = service({
      getPublishedForSection: async (id: string, label: string) => { calls.push([id, label]); return null; },
    });
    expect(await routines.getPublishedForSection('section-1', oldYear, 'student')).toBeNull();
    expect(calls).toEqual([['section-1', '2025-2026']]);
  });

  it("refuses another teacher's schedule before reading", async () => {
    let read = false;
    const routines = service({ getTeacherScheduleIds: async () => { read = true; return []; } });
    await expect(routines.getTeacherSchedule('teacher-2', oldYear, { role: 'teacher', teacherId: 'teacher-1' }))
      .rejects.toThrow('classRoutines.errors.forbidden');
    expect(read).toBe(false);
    expect(await routines.getTeacherSchedule('teacher-1', oldYear, { role: 'teacher', teacherId: 'teacher-1' })).toEqual([]);
    expect(read).toBe(true);
  });
});
