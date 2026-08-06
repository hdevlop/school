import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, time, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { actionByRef, createRef, idField, timestamps } from '@server/database/shared';
import { sectionRef } from '../sections/sectionSchema';
import { staffRef } from '../staff/staffSchema';
import { teacherAssignmentRef } from '../teachers/teacherSchema';

export const routineStatusEnum = pgEnum('routineStatus', ['draft', 'published', 'archived']);
export const routineDayEnum = pgEnum('routineDay', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const routineSchedules = pgTable('routine_schedules', {
  id: idField(10),
  sectionId: sectionRef('restrict'),
  academicYear: text('academic_year').notNull(),
  name: text('name').notNull(),
  status: routineStatusEnum('status').notNull().default('draft'),
  activeDays: jsonb('active_days').$type<string[]>().notNull().default(
    sql`'["monday","tuesday","wednesday","thursday","friday","saturday"]'::jsonb`,
  ),
  layoutConfig: jsonb('layout_config').$type<{
    startTime: string;
    lessonDuration: number;
    lessonCount: number;
    breakEnabled: boolean;
    breakAfter: number;
    breakDuration: number;
    lunchEnabled: boolean;
    lunchAfter: number;
    lunchDuration: number;
  }>().notNull().default(sql`'{"startTime":"08:00","lessonDuration":60,"lessonCount":6,"breakEnabled":true,"breakAfter":2,"breakDuration":15,"lunchEnabled":true,"lunchAfter":4,"lunchDuration":60}'::jsonb`),
  publishedAt: timestamp('published_at', { mode: 'string' }),
  publishedBy: actionByRef('published_by'),
  ...timestamps,
}, (table) => ({
  sectionYearStatusUnique: uniqueIndex('routine_schedules_section_year_status_unique')
    .on(table.sectionId, table.academicYear)
    .where(sql`${table.status} in ('draft', 'published')`),
  sectionYearIdx: index('routine_schedules_section_year_idx')
    .on(table.sectionId, table.academicYear),
}));

export const routineScheduleRef = createRef('schedule_id', () => routineSchedules.id);

export const routinePeriods = pgTable('routine_periods', {
  id: idField(10),
  scheduleId: text('schedule_id').references(() => routineSchedules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isBreak: boolean('is_break').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
}, (table) => ({
  globalSortOrderUnique: uniqueIndex('routine_periods_global_sort_order_unique')
    .on(table.sortOrder)
    .where(sql`${table.scheduleId} is null`),
  scheduleSortOrderUnique: uniqueIndex('routine_periods_schedule_sort_order_unique')
    .on(table.scheduleId, table.sortOrder)
    .where(sql`${table.scheduleId} is not null`),
  scheduleIdx: index('routine_periods_schedule_idx').on(table.scheduleId),
}));

export const routinePeriodRef = createRef('period_id', () => routinePeriods.id, 'restrict');

export const routineDuties = pgTable('routine_duties', {
  id: idField(10),
  scheduleId: routineScheduleRef(),
  dayOfWeek: routineDayEnum('day_of_week').notNull(),
  periodId: routinePeriodRef(),
  staffId: staffRef('restrict'),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  scheduleDayPeriodUnique: uniqueIndex('routine_duties_schedule_day_period_unique')
    .on(table.scheduleId, table.dayOfWeek, table.periodId),
  staffIdx: index('routine_duties_staff_idx').on(table.staffId),
}));

export const routineEntries = pgTable('routine_entries', {
  id: idField(10),
  scheduleId: routineScheduleRef(),
  dayOfWeek: routineDayEnum('day_of_week').notNull(),
  periodId: routinePeriodRef(),
  teacherAssignmentId: teacherAssignmentRef('restrict'),
  roomNumber: text('room_number'),
  notes: text('notes'),
  ...timestamps,
}, (table) => ({
  scheduleDayPeriodUnique: uniqueIndex('routine_entries_schedule_day_period_unique')
    .on(table.scheduleId, table.dayOfWeek, table.periodId),
  scheduleIdx: index('routine_entries_schedule_idx').on(table.scheduleId),
  assignmentIdx: index('routine_entries_assignment_idx').on(table.teacherAssignmentId),
}));
