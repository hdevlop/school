import { describe, expect, it } from 'bun:test';
import {
  createRoutineEntryDto,
  createRoutineDutyDto,
  createRoutinePeriodDto,
  createRoutineScheduleDto,
  routineLayoutDto,
} from '@server/modules/classRoutines/ClassRoutineDto';

describe('ClassRoutineDto', () => {
  it('accepts a valid section routine', () => {
    const result = createRoutineScheduleDto.safeParse({
      sectionId: 'sec_01',
      academicYear: '2026-2027',
      name: 'Primary timetable',
      activeDays: ['monday', 'tuesday', 'saturday'],
    });
    expect(result.success).toBe(true);
  });

  it('requires at least one active teaching day', () => {
    const result = createRoutineScheduleDto.safeParse({
      sectionId: 'sec_01',
      academicYear: '2026-2027',
      name: 'Empty timetable',
      activeDays: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid lesson entry', () => {
    const result = createRoutineEntryDto.safeParse({
      dayOfWeek: 'monday',
      periodId: 'period_01',
      teacherAssignmentId: 'assignment_01',
      roomNumber: 'A-12',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a staff member for break supervision', () => {
    const result = createRoutineDutyDto.safeParse({
      dayOfWeek: 'monday',
      periodId: 'lunch_period',
      staffId: 'staff_01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid period time text', () => {
    const result = createRoutinePeriodDto.safeParse({
      name: 'Period 1',
      startTime: '25:00',
      endTime: '26:00',
      sortOrder: 1,
      isBreak: false,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts an explicitly ordered routine timeline', () => {
    const result = routineLayoutDto.safeParse({
      periods: [
        { type: 'lesson', name: 'Period 1', startTime: '08:00', endTime: '09:00' },
        { type: 'break', name: 'Morning break', startTime: '09:00', endTime: '09:15' },
        { type: 'lesson', name: 'Period 2', startTime: '09:15', endTime: '10:15' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects overlapping timeline rows', () => {
    const result = routineLayoutDto.safeParse({
      periods: [
        { type: 'lesson', name: 'Period 1', startTime: '08:00', endTime: '09:00' },
        { type: 'break', name: 'Morning break', startTime: '08:45', endTime: '09:15' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
