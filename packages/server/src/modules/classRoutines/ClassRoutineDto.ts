import { z } from 'zod';

const id = z.string().min(1);
export const routineDayDto = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);
export const routineStatusDto = z.enum(['draft', 'published', 'archived']);
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, 'Time must use HH:mm');

export const routineIdParam = z.object({ id });
export const routineEntryParams = z.object({ id, entryId: id });
export const routineDutyParams = z.object({ id, dutyId: id });
export const routineTeacherParam = z.object({ teacherId: id });

export const routineListQuery = z.object({
  classId: id.optional(),
  sectionId: id.optional(),
  academicYear: z.string().min(4).optional(),
  status: routineStatusDto.optional(),
});

export const createRoutinePeriodDto = z.object({
  name: z.string().trim().min(1).max(80),
  startTime: timeField,
  endTime: timeField,
  sortOrder: z.coerce.number().int().min(0).max(100),
  isBreak: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export const updateRoutinePeriodDto = createRoutinePeriodDto.partial();

export const createRoutineScheduleDto = z.object({
  sectionId: id,
  academicYear: z.string().trim().min(4).max(20),
  name: z.string().trim().min(1).max(120),
  activeDays: z.array(routineDayDto).min(1).max(7).default([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  ]),
});
export const updateRoutineScheduleDto = createRoutineScheduleDto
  .pick({ name: true, activeDays: true })
  .partial();

export const routineTimelineItemDto = z.object({
  type: z.enum(['lesson', 'break']),
  name: z.string().trim().min(1).max(80),
  startTime: timeField,
  endTime: timeField,
});

export const routineLayoutDto = z.object({
  periods: z.array(routineTimelineItemDto).min(1).max(30),
}).superRefine((value, context) => {
  if (!value.periods.some((period) => period.type === 'lesson')) {
    context.addIssue({ code: 'custom', path: ['periods'], message: 'Add at least one teaching period' });
  }
  value.periods.forEach((period, index) => {
    if (period.startTime >= period.endTime) {
      context.addIssue({ code: 'custom', path: ['periods', index, 'endTime'], message: 'End time must be after start time' });
    }
    const previous = value.periods[index - 1];
    if (previous && period.startTime < previous.endTime) {
      context.addIssue({ code: 'custom', path: ['periods', index, 'startTime'], message: 'Timeline rows cannot overlap' });
    }
  });
});

export const createRoutineEntryDto = z.object({
  dayOfWeek: routineDayDto,
  periodId: id,
  teacherAssignmentId: id,
  roomNumber: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(500).nullish(),
});
export const updateRoutineEntryDto = createRoutineEntryDto.partial();

export const createRoutineDutyDto = z.object({
  dayOfWeek: routineDayDto,
  periodId: id,
  staffId: id,
  notes: z.string().trim().max(500).nullish(),
});
export const updateRoutineDutyDto = createRoutineDutyDto.pick({ staffId: true, notes: true }).partial();

export type RoutineListQuery = z.infer<typeof routineListQuery>;
export type CreateRoutinePeriodDto = z.infer<typeof createRoutinePeriodDto>;
export type UpdateRoutinePeriodDto = z.infer<typeof updateRoutinePeriodDto>;
export type CreateRoutineScheduleDto = z.infer<typeof createRoutineScheduleDto>;
export type UpdateRoutineScheduleDto = z.infer<typeof updateRoutineScheduleDto>;
export type RoutineLayoutDto = z.infer<typeof routineLayoutDto>;
export type CreateRoutineEntryDto = z.infer<typeof createRoutineEntryDto>;
export type UpdateRoutineEntryDto = z.infer<typeof updateRoutineEntryDto>;
export type CreateRoutineDutyDto = z.infer<typeof createRoutineDutyDto>;
export type UpdateRoutineDutyDto = z.infer<typeof updateRoutineDutyDto>;
