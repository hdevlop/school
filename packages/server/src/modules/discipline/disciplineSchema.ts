import { usersTable as users } from '@server/auth';
import { idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { studentRef } from '../students/studentSchema';

export const disciplineCategoryEnum = pgEnum('disciplineCategory', getEnumValues('disciplineCategory'));
export const disciplineSeverityEnum = pgEnum('disciplineSeverity', getEnumValues('disciplineSeverity'));
export const disciplineStatusEnum = pgEnum('disciplineStatus', getEnumValues('disciplineStatus'));
export const disciplineActionEnum = pgEnum('disciplineAction', getEnumValues('disciplineAction'));

export const disciplineIncidents = pgTable('discipline_incidents', {
  id: idField(),
  studentId: studentRef('restrict'),
  classId: classRef('restrict'),
  sectionId: sectionRef('restrict'),
  reportedBy: text('reported_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  incidentAt: timestamp('incident_at', { mode: 'string', withTimezone: true }).notNull(),
  category: disciplineCategoryEnum('category').notNull(),
  severity: disciplineSeverityEnum('severity').notNull(),
  location: text('location'),
  description: text('description').notNull(),
  status: disciplineStatusEnum('status').notNull().default('open'),
  actionType: disciplineActionEnum('action_type'),
  actionNote: text('action_note'),
  resolutionNote: text('resolution_note'),
  resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { mode: 'string', withTimezone: true }),
  ...timestamps,
}, (table) => ({
  studentIdx: index('discipline_incidents_student_idx').on(table.studentId),
  reporterIdx: index('discipline_incidents_reporter_idx').on(table.reportedBy),
  statusIdx: index('discipline_incidents_status_idx').on(table.status),
  severityIdx: index('discipline_incidents_severity_idx').on(table.severity),
  incidentAtIdx: index('discipline_incidents_incident_at_idx').on(table.incidentAt),
}));
