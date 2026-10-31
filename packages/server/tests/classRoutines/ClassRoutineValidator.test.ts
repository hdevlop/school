import { describe, expect, it } from 'bun:test';
import { ClassRoutineValidator } from '../../src/modules/classRoutines/ClassRoutineValidator';

// The validator's `t` has no translator outside the app, so a refusal is told
// apart by how far the checks got before it; `test:server-i18n` covers the
// messages themselves.
const assignments: Record<string, { id: string; teacherId: string; teacherStaffId: string; sectionId: string; subjectId: string }> = {
  'math-teacher': { id: 'math-teacher', teacherId: 'teacher-1', teacherStaffId: 'staff-1', sectionId: 'section-a', subjectId: 'math' },
  'other-section': { id: 'other-section', teacherId: 'teacher-2', teacherStaffId: 'staff-2', sectionId: 'section-b', subjectId: 'math' },
};

const build = ({
  clashes = [] as { teacherId: string | null; roomNumber: string | null }[],
  ownDuties = [] as { id: string; dayOfWeek: string; periodId: string }[],
  ownEntries = [] as { id: string; dayOfWeek: string; periodId: string }[],
} = {}) => {
  const calls = { assignments: 0, conflicts: [] as any[], duties: 0 };
  const periods: Record<string, { id: string; scheduleId: string; isActive: boolean; isBreak: boolean; startTime: string; endTime: string }> = {
    p1: { id: 'p1', scheduleId: 'schedule-1', isActive: true, isBreak: false, startTime: '08:00', endTime: '09:00' },
    lunch: { id: 'lunch', scheduleId: 'schedule-1', isActive: true, isBreak: true, startTime: '11:30', endTime: '12:30' },
  };
  const repository = {
    getSchedule: async () => ({ id: 'schedule-1', sectionId: 'section-a', academicYear: '2026-2027', activeDays: ['monday', 'friday'], status: 'published' }),
    getPeriod: async (id: string) => periods[id],
    getDuties: async () => ownDuties,
    getStaffSupervisor: async () => ({ id: 'staff-9', teacherId: null }),
    getSubject: async (id: string) => (['math', 'art'].includes(id) ? { id } : undefined),
    getAssignment: async (id: string) => {
      calls.assignments += 1;
      return assignments[id];
    },
    getEntries: async () => ownEntries,
    getSection: async () => ({ roomNumber: null }),
    findConflicts: async (input: any) => {
      calls.conflicts.push(input);
      return clashes.map((clash) => ({ ...clash, defaultRoomNumber: null }));
    },
    findDutyConflicts: async () => {
      calls.duties += 1;
      return [];
    },
  };
  return { validator: new ClassRoutineValidator(repository as any), calls };
};

const lesson = { dayOfWeek: 'monday', periodId: 'p1' };

describe('routine lessons with or without a teacher', () => {
  it('accepts a subject with no teacher and checks no teacher or duty clash', async () => {
    const { validator, calls } = build();
    const { assignment } = await validator.validateEntry('schedule-1', { ...lesson, subjectId: 'art', teacherAssignmentId: null }) as any;
    expect(assignment).toBeNull();
    expect(calls.assignments).toBe(0);
    expect(calls.conflicts[0].teacherId).toBeUndefined();
    expect(calls.duties).toBe(0);
  });

  it('accepts a teacher of the subject and checks their clashes and duties', async () => {
    const { validator, calls } = build();
    const { assignment } = await validator.validateEntry('schedule-1', { ...lesson, subjectId: 'math', teacherAssignmentId: 'math-teacher' }) as any;
    expect(assignment.teacherId).toBe('teacher-1');
    expect(calls.conflicts[0].teacherId).toBe('teacher-1');
    expect(calls.duties).toBe(1);
  });

  it('still refuses a subject-only lesson in a room another section holds', async () => {
    const { validator, calls } = build({ clashes: [{ teacherId: null, roomNumber: 'B2' }] });
    await expect(validator.validateEntry('schedule-1', { ...lesson, subjectId: 'art', roomNumber: 'B2' })).rejects.toThrow();
    expect(calls.conflicts).toHaveLength(1);
  });

  it('refuses a subject the school does not have before looking at teachers', async () => {
    const { validator, calls } = build();
    await expect(validator.validateEntry('schedule-1', { ...lesson, subjectId: 'unknown' })).rejects.toThrow();
    expect(calls.assignments).toBe(0);
    expect(calls.conflicts).toHaveLength(0);
  });

  it('refuses a teacher who teaches another subject or another section', async () => {
    for (const [subjectId, teacherAssignmentId] of [['art', 'math-teacher'], ['math', 'other-section']]) {
      const { validator, calls } = build();
      await expect(validator.validateEntry('schedule-1', { ...lesson, subjectId, teacherAssignmentId })).rejects.toThrow();
      expect(calls.assignments).toBe(1);
      expect(calls.conflicts).toHaveLength(0);
    }
  });

  it('keeps the teacher clash check when the lesson has a teacher', async () => {
    const { validator, calls } = build({ clashes: [{ teacherId: 'teacher-1', roomNumber: null }] });
    await expect(validator.validateEntry('schedule-1', { ...lesson, subjectId: 'math', teacherAssignmentId: 'math-teacher' })).rejects.toThrow();
    expect(calls.conflicts[0].teacherId).toBe('teacher-1');
    expect(calls.duties).toBe(0);
  });
});

describe('a lesson held in a break', () => {
  const friday = { dayOfWeek: 'friday', periodId: 'lunch', subjectId: 'math' };

  it('accepts a lesson in a break no one supervises that day', async () => {
    const { validator, calls } = build({ ownDuties: [{ id: 'd1', dayOfWeek: 'monday', periodId: 'lunch' }] });
    await validator.validateEntry('schedule-1', friday);
    expect(calls.conflicts).toHaveLength(1);
  });

  it('refuses a lesson in a break supervised that day', async () => {
    const { validator, calls } = build({ ownDuties: [{ id: 'd1', dayOfWeek: 'friday', periodId: 'lunch' }] });
    await expect(validator.validateEntry('schedule-1', friday)).rejects.toThrow();
    expect(calls.conflicts).toHaveLength(0);
  });

  it('refuses a supervisor for a break that holds a lesson that day, not on other days', async () => {
    const held = { ownEntries: [{ id: 'e1', dayOfWeek: 'friday', periodId: 'lunch' }] };
    await expect(build(held).validator.validateDuty('schedule-1', { dayOfWeek: 'friday', periodId: 'lunch', staffId: 'staff-9' })).rejects.toThrow();
    const { validator, calls } = build(held);
    await validator.validateDuty('schedule-1', { dayOfWeek: 'monday', periodId: 'lunch', staffId: 'staff-9' });
    expect(calls.duties).toBe(1);
  });
});
